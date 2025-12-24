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
	"github.com/kibamail/email-agent/internal/observability"
)

// DomainClient interface for validating domains with control plane
type DomainClient interface {
	ValidateBounceDomain(ctx context.Context, bounceDomain string) (*domain.BounceDomainResponse, error)
}

// DomainHandler handles domain validation HTTP requests from KumoMTA
type DomainHandler struct {
	cache   *cache.MemoryCache
	api     DomainClient
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewDomainHandler creates a new domain handler
func NewDomainHandler(
	memCache *cache.MemoryCache,
	api DomainClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *DomainHandler {
	return &DomainHandler{
		cache:   memCache,
		api:     api,
		logger:  logger.With().Str("handler", "domain").Logger(),
		metrics: metrics,
	}
}

// ListenerDomainResponse is the response format for listener domain validation
type ListenerDomainResponse struct {
	Valid         bool   `json:"valid"`
	Domain        string `json:"domain"`
	WorkspaceID   string `json:"workspace_id,omitempty"`
	SendingDomain string `json:"sending_domain,omitempty"`
	LogOOB        string `json:"log_oob,omitempty"`
	LogARF        string `json:"log_arf,omitempty"`
	RelayTo       bool   `json:"relay_to,omitempty"`
}

// ValidateListenerDomain validates if a domain should be accepted for receiving mail
// GET /api/v1/domains/validate-listener/:domain
//
// This endpoint is called by KumoMTA's get_listener_domain hook to determine
// whether the MTA should accept incoming connections for a specific domain.
// Valid listener domains are:
// - Bounce domains (kb.<customer-domain>) - for receiving bounces
// - dmarc.kbmta.net - for receiving DMARC aggregate reports
func (h *DomainHandler) ValidateListenerDomain(w http.ResponseWriter, r *http.Request) {
	domainName := chi.URLParam(r, "domain")
	if domainName == "" {
		h.respondError(w, http.StatusBadRequest, "domain is required")
		return
	}

	ctx := r.Context()

	// 1. Check in-memory cache first
	if info, found := h.cache.GetBounceDomain(domainName); found {
		h.logger.Debug().Str("domain", domainName).Bool("valid", info.Valid).Msg("domain found in cache")
		h.respondJSON(w, http.StatusOK, ListenerDomainResponse{
			Valid:         info.Valid,
			Domain:        domainName,
			WorkspaceID:   info.WorkspaceID,
			SendingDomain: info.SendingDomain,
			LogOOB:        "LogThenDrop",
			LogARF:        "LogThenDrop",
		})
		return
	}

	// 2. Cache miss - validate with control plane
	h.logger.Debug().Str("domain", domainName).Msg("domain cache miss, validating with control plane")

	result, err := h.api.ValidateBounceDomain(ctx, domainName)
	if err != nil {
		h.logger.Error().Err(err).Str("domain", domainName).Msg("failed to validate domain with control plane")
		h.respondError(w, http.StatusInternalServerError, "failed to validate domain")
		return
	}

	// 3. Cache the result
	if result.Valid {
		// Cache valid domains for 24 hours
		h.cache.SetBounceDomain(domainName, true, result.WorkspaceID, result.SendingDomain)
		h.logger.Debug().Str("domain", domainName).Msg("valid domain cached")
	} else {
		// Cache invalid domains for 5 minutes (negative caching)
		h.cache.SetBounceDomainWithTTL(domainName, false, "", "", 5*time.Minute)
		h.logger.Debug().Str("domain", domainName).Msg("invalid domain cached (negative)")
	}

	h.respondJSON(w, http.StatusOK, ListenerDomainResponse{
		Valid:         result.Valid,
		Domain:        domainName,
		WorkspaceID:   result.WorkspaceID,
		SendingDomain: result.SendingDomain,
		LogOOB:        "LogThenDrop",
		LogARF:        "LogThenDrop",
	})
}

// respondJSON sends a JSON response
func (h *DomainHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// respondError sends an error response
func (h *DomainHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{
		"error": message,
	})
}
