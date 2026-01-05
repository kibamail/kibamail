// Package handlers provides HTTP handlers for the email agent
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
	"github.com/kibamail/email-agent/internal/redis"
)

// maxControlPlaneResponseSize limits response body size to prevent memory exhaustion
const maxControlPlaneResponseSize = 5 << 20 // 5MB

// ControlPlaneClient interface for fetching tenant data
type ControlPlaneClient interface {
	GetTenant(ctx context.Context, tenantID string) (*domain.ControlPlaneTenant, error)
}

// TenantHandler handles tenant-related HTTP requests
type TenantHandler struct {
	cache   *redis.DKIMCache
	api     ControlPlaneClient
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewTenantHandler creates a new tenant handler
func NewTenantHandler(
	cache *redis.DKIMCache,
	api ControlPlaneClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *TenantHandler {
	return &TenantHandler{
		cache:   cache,
		api:     api,
		logger:  logger.With().Str("handler", "tenant").Logger(),
		metrics: metrics,
	}
}

// GetTenant returns tenant DKIM configuration
// GET /tenants/:tenantId
func (h *TenantHandler) GetTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		h.respondError(w, http.StatusBadRequest, "tenant_id is required")
		return
	}

	ctx := r.Context()

	// 1. Check Redis cache first
	configs, err := h.cache.GetDKIMConfigs(ctx, tenantID)
	if err == nil && len(configs) > 0 {
		h.respondJSON(w, http.StatusOK, domain.TenantResponse{
			TenantID:    tenantID,
			DKIMConfigs: configs,
		})
		return
	}

	// 2. Fetch from control plane API on cache miss
	// Control plane returns already-decrypted DKIM private keys
	tenant, err := h.api.GetTenant(ctx, tenantID)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrTenantNotFound) {
			h.respondError(w, http.StatusNotFound, "tenant not found")
			return
		}
		h.logger.Error().Err(err).Str("tenant_id", tenantID).Msg("failed to fetch tenant from control plane")
		h.respondError(w, http.StatusInternalServerError, "failed to fetch tenant")
		return
	}

	// 3. Build DKIM configs from control plane response
	dkimConfigs := make([]domain.DKIMConfig, 0, len(tenant.SendingDomains))
	for _, sd := range tenant.SendingDomains {
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
			// Parse "kibamail._domainkey" to get "kibamail"
			if len(sd.DkimSubDomain) > 11 {
				selector = sd.DkimSubDomain[:len(sd.DkimSubDomain)-11] // Remove "._domainkey"
			}
		}

		dkimConfigs = append(dkimConfigs, domain.DKIMConfig{
			Domain:       sd.Name,
			Selector:     selector,
			PrivateKey:   sd.DkimPrivateKey, // Already decrypted by control plane
			PublicKey:    sd.DkimPublicKey,
			HeaderFields: "from:to:subject:date:message-id",
		})
	}

	// 4. Cache the configs in Redis (internal network only, no re-encryption needed)
	if len(dkimConfigs) > 0 {
		cacheCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := h.cache.SetDKIMConfigs(cacheCtx, tenantID, dkimConfigs, 5*time.Minute); err != nil {
			h.logger.Warn().Err(err).Str("tenant_id", tenantID).Msg("failed to cache DKIM configs")
		}
	}

	// 5. Return response
	h.respondJSON(w, http.StatusOK, domain.TenantResponse{
		TenantID:    tenantID,
		DKIMConfigs: dkimConfigs,
	})
}

// respondJSON sends a JSON response
func (h *TenantHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// respondError sends an error response
func (h *TenantHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{
		"error": message,
	})
}

// ControlPlaneAPIClient implements ControlPlaneClient
type ControlPlaneAPIClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	logger     zerolog.Logger
	metrics    *observability.Metrics
}

// ControlPlaneAPIConfig contains configuration for the control plane API client
type ControlPlaneAPIConfig struct {
	BaseURL         string
	APIKey          string
	Timeout         time.Duration
	MaxIdleConns    int
	MaxConnsPerHost int
}

// NewControlPlaneAPIClient creates a new control plane API client with connection pooling
func NewControlPlaneAPIClient(cfg ControlPlaneAPIConfig, logger zerolog.Logger, metrics *observability.Metrics) *ControlPlaneAPIClient {
	// Set sensible defaults for connection pooling
	maxIdleConns := cfg.MaxIdleConns
	if maxIdleConns == 0 {
		maxIdleConns = 100
	}
	maxConnsPerHost := cfg.MaxConnsPerHost
	if maxConnsPerHost == 0 {
		maxConnsPerHost = 100
	}

	// Configure HTTP transport with connection pooling
	transport := &http.Transport{
		MaxIdleConns:        maxIdleConns,
		MaxConnsPerHost:     maxConnsPerHost,
		MaxIdleConnsPerHost: maxConnsPerHost,
		IdleConnTimeout:     90 * time.Second,
	}

	return &ControlPlaneAPIClient{
		baseURL: cfg.BaseURL,
		apiKey:  cfg.APIKey,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   cfg.Timeout,
		},
		logger:  logger.With().Str("component", "control-plane-api").Logger(),
		metrics: metrics,
	}
}

// GetTenant fetches tenant data from the control plane API
func (c *ControlPlaneAPIClient) GetTenant(ctx context.Context, tenantID string) (*domain.ControlPlaneTenant, error) {
	start := time.Now()

	// Track active requests for metrics
	if c.metrics != nil {
		c.metrics.ControlPlaneActiveReqs.Inc()
		defer c.metrics.ControlPlaneActiveReqs.Dec()
	}

	url := fmt.Sprintf("%s/api/internal/v1/tenants/%s", c.baseURL, tenantID)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to create request")
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)

	// Record latency
	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.ControlPlaneLatency.Observe(duration.Seconds())
		c.metrics.ControlPlaneRequests.Inc()
	}

	if err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Mark(kiberrors.Wrap(err, "request failed"), kiberrors.ErrControlAPIUnavailable)
	}

	// Ensure body is fully drained and closed to allow connection reuse
	defer func() {
		io.Copy(io.Discard, io.LimitReader(resp.Body, maxControlPlaneResponseSize))
		resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return nil, kiberrors.ErrTenantNotFound
	}

	if resp.StatusCode == http.StatusUnauthorized {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.ErrAuthenticationFailed
	}

	if resp.StatusCode != http.StatusOK {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Newf("unexpected status code: %d", resp.StatusCode)
	}

	// Limit response body size to prevent memory exhaustion
	limitedReader := io.LimitReader(resp.Body, maxControlPlaneResponseSize)
	var tenant domain.ControlPlaneTenant
	if err := json.NewDecoder(limitedReader).Decode(&tenant); err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to decode response")
	}

	return &tenant, nil
}

// GetTenantByDomain fetches tenant data by sending domain name
func (c *ControlPlaneAPIClient) GetTenantByDomain(ctx context.Context, domainName string) (*domain.ControlPlaneTenant, error) {
	start := time.Now()

	if c.metrics != nil {
		c.metrics.ControlPlaneActiveReqs.Inc()
		defer c.metrics.ControlPlaneActiveReqs.Dec()
	}

	url := fmt.Sprintf("%s/api/internal/v1/tenants/by-domain", c.baseURL)

	// Use POST with JSON body to avoid URL path issues with dots in domain names
	reqBody := map[string]string{"domain": domainName}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to marshal request")
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to create request")
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.ControlPlaneLatency.Observe(duration.Seconds())
		c.metrics.ControlPlaneRequests.Inc()
	}

	if err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Mark(kiberrors.Wrap(err, "request failed"), kiberrors.ErrControlAPIUnavailable)
	}

	defer func() {
		io.Copy(io.Discard, io.LimitReader(resp.Body, maxControlPlaneResponseSize))
		resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return nil, kiberrors.ErrDomainNotFound
	}

	if resp.StatusCode == http.StatusUnauthorized {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.ErrAuthenticationFailed
	}

	if resp.StatusCode != http.StatusOK {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Newf("unexpected status code: %d", resp.StatusCode)
	}

	limitedReader := io.LimitReader(resp.Body, maxControlPlaneResponseSize)
	var tenant domain.ControlPlaneTenant
	if err := json.NewDecoder(limitedReader).Decode(&tenant); err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to decode response")
	}

	return &tenant, nil
}

// ValidateBounceDomain validates if a bounce domain belongs to a tenant
func (c *ControlPlaneAPIClient) ValidateBounceDomain(ctx context.Context, bounceDomain string) (*domain.BounceDomainResponse, error) {
	start := time.Now()

	if c.metrics != nil {
		c.metrics.ControlPlaneActiveReqs.Inc()
		defer c.metrics.ControlPlaneActiveReqs.Dec()
	}

	url := fmt.Sprintf("%s/api/internal/v1/tenants/by-bounce-domain", c.baseURL)

	// Use POST with JSON body to avoid URL path issues with dots in domain names
	reqBody := map[string]string{"domain": bounceDomain}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to marshal request")
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to create request")
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.ControlPlaneLatency.Observe(duration.Seconds())
		c.metrics.ControlPlaneRequests.Inc()
	}

	if err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Mark(kiberrors.Wrap(err, "request failed"), kiberrors.ErrControlAPIUnavailable)
	}

	defer func() {
		io.Copy(io.Discard, io.LimitReader(resp.Body, maxControlPlaneResponseSize))
		resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return &domain.BounceDomainResponse{Valid: false}, nil
	}

	if resp.StatusCode == http.StatusUnauthorized {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.ErrAuthenticationFailed
	}

	if resp.StatusCode != http.StatusOK {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Newf("unexpected status code: %d", resp.StatusCode)
	}

	limitedReader := io.LimitReader(resp.Body, maxControlPlaneResponseSize)
	var result domain.BounceDomainResponse
	if err := json.NewDecoder(limitedReader).Decode(&result); err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to decode response")
	}

	return &result, nil
}

// ValidateAPIKey validates an API key hash and returns tenant info
func (c *ControlPlaneAPIClient) ValidateAPIKey(ctx context.Context, keyHash string, requiredScopes []string) (*domain.APIKeyValidationResponse, error) {
	start := time.Now()

	if c.metrics != nil {
		c.metrics.ControlPlaneActiveReqs.Inc()
		defer c.metrics.ControlPlaneActiveReqs.Dec()
	}

	url := fmt.Sprintf("%s/api/internal/v1/tenants/validate-api-key", c.baseURL)

	reqBody := domain.APIKeyValidationRequest{
		KeyHash:        keyHash,
		RequiredScopes: requiredScopes,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to marshal request")
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to create request")
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.ControlPlaneLatency.Observe(duration.Seconds())
		c.metrics.ControlPlaneRequests.Inc()
	}

	if err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Mark(kiberrors.Wrap(err, "request failed"), kiberrors.ErrControlAPIUnavailable)
	}

	defer func() {
		io.Copy(io.Discard, io.LimitReader(resp.Body, maxControlPlaneResponseSize))
		resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return &domain.APIKeyValidationResponse{Valid: false}, nil
	}

	if resp.StatusCode == http.StatusUnauthorized {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.ErrAuthenticationFailed
	}

	if resp.StatusCode == http.StatusForbidden {
		return &domain.APIKeyValidationResponse{Valid: false}, kiberrors.ErrInsufficientScopes
	}

	if resp.StatusCode != http.StatusOK {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Newf("unexpected status code: %d", resp.StatusCode)
	}

	limitedReader := io.LimitReader(resp.Body, maxControlPlaneResponseSize)
	var result domain.APIKeyValidationResponse
	if err := json.NewDecoder(limitedReader).Decode(&result); err != nil {
		if c.metrics != nil {
			c.metrics.ControlPlaneErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to decode response")
	}

	return &result, nil
}
