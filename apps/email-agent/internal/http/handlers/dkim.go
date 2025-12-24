// Package handlers provides HTTP handlers for the email agent
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/cache"
	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// DKIMClient interface for fetching DKIM data from control plane
type DKIMClient interface {
	GetTenantByDomain(ctx context.Context, domainName string) (*domain.ControlPlaneTenant, error)
}

// DKIMHandler handles DKIM-related HTTP requests from KumoMTA
type DKIMHandler struct {
	cache   *cache.MemoryCache
	api     DKIMClient
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewDKIMHandler creates a new DKIM handler
func NewDKIMHandler(
	memCache *cache.MemoryCache,
	api DKIMClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *DKIMHandler {
	return &DKIMHandler{
		cache:   memCache,
		api:     api,
		logger:  logger.With().Str("handler", "dkim").Logger(),
		metrics: metrics,
	}
}

// DKIMResponse is the response format for DKIM lookups
type DKIMResponse struct {
	Found      bool              `json:"found"`
	Domain     string            `json:"domain"`
	Selector   string            `json:"selector,omitempty"`
	PrivateKey string            `json:"private_key,omitempty"`
	PublicKey  string            `json:"public_key,omitempty"`
	Headers    string            `json:"headers,omitempty"`
}

// GetDKIM returns DKIM configuration for a domain
// GET /api/v1/dkim/:domain
func (h *DKIMHandler) GetDKIM(w http.ResponseWriter, r *http.Request) {
	domainName := chi.URLParam(r, "domain")
	if domainName == "" {
		h.respondError(w, http.StatusBadRequest, "domain is required")
		return
	}

	ctx := r.Context()

	// 1. Check in-memory cache first (DKIM keys are sensitive, stored in memory only)
	if config, found := h.cache.GetDKIMConfig(domainName); found {
		h.logger.Debug().Str("domain", domainName).Msg("DKIM config found in cache")
		h.respondJSON(w, http.StatusOK, DKIMResponse{
			Found:      true,
			Domain:     config.Domain,
			Selector:   config.Selector,
			PrivateKey: config.PrivateKey,
			PublicKey:  config.PublicKey,
			Headers:    "from:to:subject:date:message-id",
		})
		return
	}

	// 2. Cache miss - fetch from control plane
	h.logger.Debug().Str("domain", domainName).Msg("DKIM cache miss, fetching from control plane")

	tenant, err := h.api.GetTenantByDomain(ctx, domainName)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrDomainNotFound) {
			// Cache negative result for shorter time
			h.cache.SetDKIMConfigWithTTL(domainName, &domain.DKIMConfig{Domain: domainName}, 5*time.Minute)
			h.respondJSON(w, http.StatusOK, DKIMResponse{
				Found:  false,
				Domain: domainName,
			})
			return
		}
		h.logger.Error().Err(err).Str("domain", domainName).Msg("failed to fetch domain from control plane")
		h.respondError(w, http.StatusInternalServerError, "failed to fetch domain configuration")
		return
	}

	// 3. Find the matching domain in the tenant's sending domains
	var dkimConfig *domain.DKIMConfig
	for _, sd := range tenant.SendingDomains {
		if sd.Name != domainName {
			continue
		}

		// Skip domains without DKIM verification
		if sd.DkimVerifiedAt == "" {
			continue
		}

		// Skip domains without private key
		if sd.DkimPrivateKey == "" {
			continue
		}

		// Extract selector from subdomain (e.g., "kibamail._domainkey" -> "kibamail")
		selector := "kibamail"
		if sd.DkimSubDomain != "" {
			if len(sd.DkimSubDomain) > 11 {
				selector = sd.DkimSubDomain[:len(sd.DkimSubDomain)-11] // Remove "._domainkey"
			}
		}

		dkimConfig = &domain.DKIMConfig{
			Domain:     sd.Name,
			Selector:   selector,
			PrivateKey: sd.DkimPrivateKey,
			PublicKey:  sd.DkimPublicKey,
		}
		break
	}

	// 4. Cache the result
	if dkimConfig != nil {
		// Cache valid DKIM config for 24 hours
		h.cache.SetDKIMConfig(domainName, dkimConfig)
		h.logger.Debug().Str("domain", domainName).Msg("DKIM config cached")

		h.respondJSON(w, http.StatusOK, DKIMResponse{
			Found:      true,
			Domain:     dkimConfig.Domain,
			Selector:   dkimConfig.Selector,
			PrivateKey: dkimConfig.PrivateKey,
			PublicKey:  dkimConfig.PublicKey,
			Headers:    "from:to:subject:date:message-id",
		})
		return
	}

	// Domain found but no valid DKIM config
	h.cache.SetDKIMConfigWithTTL(domainName, &domain.DKIMConfig{Domain: domainName}, 5*time.Minute)
	h.respondJSON(w, http.StatusOK, DKIMResponse{
		Found:  false,
		Domain: domainName,
	})
}

// respondJSON sends a JSON response
func (h *DKIMHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// respondError sends an error response
func (h *DKIMHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{
		"error": message,
	})
}
