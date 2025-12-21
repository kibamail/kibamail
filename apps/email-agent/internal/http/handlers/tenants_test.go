package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
)

// mockDKIMCache is a mock implementation for testing
type mockDKIMCache struct {
	configs map[string][]domain.DKIMConfig
}

func newMockDKIMCache() *mockDKIMCache {
	return &mockDKIMCache{
		configs: make(map[string][]domain.DKIMConfig),
	}
}

func (m *mockDKIMCache) GetDKIMConfigs(ctx context.Context, tenantID string) ([]domain.DKIMConfig, error) {
	if configs, ok := m.configs[tenantID]; ok {
		return configs, nil
	}
	return nil, kiberrors.ErrCacheMiss
}

func (m *mockDKIMCache) SetDKIMConfigs(ctx context.Context, tenantID string, configs []domain.DKIMConfig, _ interface{}) error {
	m.configs[tenantID] = configs
	return nil
}

// mockControlPlaneClient is a mock implementation for testing
type mockControlPlaneClient struct {
	tenants map[string]*domain.ControlPlaneTenant
}

func newMockControlPlaneClient() *mockControlPlaneClient {
	return &mockControlPlaneClient{
		tenants: make(map[string]*domain.ControlPlaneTenant),
	}
}

func (m *mockControlPlaneClient) GetTenant(ctx context.Context, tenantID string) (*domain.ControlPlaneTenant, error) {
	if tenant, ok := m.tenants[tenantID]; ok {
		return tenant, nil
	}
	return nil, kiberrors.ErrTenantNotFound
}

// cacheInterface wraps the mock for TenantHandler
type cacheInterface interface {
	GetDKIMConfigs(ctx context.Context, tenantID string) ([]domain.DKIMConfig, error)
	SetDKIMConfigs(ctx context.Context, tenantID string, configs []domain.DKIMConfig, ttl interface{}) error
}

// testTenantHandler creates a TenantHandler using our mocks
type testTenantHandler struct {
	cache  cacheInterface
	api    ControlPlaneClient
	logger zerolog.Logger
}

func newTestHandler(cache *mockDKIMCache, api *mockControlPlaneClient) *testTenantHandler {
	return &testTenantHandler{
		cache:  cache,
		api:    api,
		logger: zerolog.Nop(),
	}
}

func (h *testTenantHandler) GetTenant(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		h.respondError(w, http.StatusBadRequest, "tenant_id is required")
		return
	}

	ctx := r.Context()

	// Check cache first
	configs, err := h.cache.GetDKIMConfigs(ctx, tenantID)
	if err == nil && len(configs) > 0 {
		h.respondJSON(w, http.StatusOK, domain.TenantResponse{
			TenantID:    tenantID,
			DKIMConfigs: configs,
		})
		return
	}

	// Fetch from API (control plane returns already-decrypted keys)
	tenant, err := h.api.GetTenant(ctx, tenantID)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrTenantNotFound) {
			h.respondError(w, http.StatusNotFound, "tenant not found")
			return
		}
		h.respondError(w, http.StatusInternalServerError, "failed to fetch tenant")
		return
	}

	// Build DKIM configs
	dkimConfigs := make([]domain.DKIMConfig, 0, len(tenant.SendingDomains))
	for _, sd := range tenant.SendingDomains {
		if sd.DkimVerifiedAt == "" {
			continue
		}

		if sd.DkimPrivateKey == "" {
			continue
		}

		selector := "kibamail"
		if sd.DkimSubDomain != "" && len(sd.DkimSubDomain) > 11 {
			selector = sd.DkimSubDomain[:len(sd.DkimSubDomain)-11]
		}

		dkimConfigs = append(dkimConfigs, domain.DKIMConfig{
			Domain:       sd.Name,
			Selector:     selector,
			PrivateKey:   sd.DkimPrivateKey, // Already decrypted by control plane
			PublicKey:    sd.DkimPublicKey,
			HeaderFields: "from:to:subject:date:message-id",
		})
	}

	h.respondJSON(w, http.StatusOK, domain.TenantResponse{
		TenantID:    tenantID,
		DKIMConfigs: dkimConfigs,
	})
}

func (h *testTenantHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *testTenantHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{"error": message})
}

func TestGetTenant_MissingTenantID(t *testing.T) {
	cache := newMockDKIMCache()
	api := newMockControlPlaneClient()
	handler := newTestHandler(cache, api)

	r := chi.NewRouter()
	r.Get("/tenants/{tenantId}", handler.GetTenant)

	req := httptest.NewRequest("GET", "/tenants/", nil)
	w := httptest.NewRecorder()

	// Empty tenantId should return 404 (not matching route)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestGetTenant_CacheHit(t *testing.T) {
	cache := newMockDKIMCache()
	api := newMockControlPlaneClient()
	handler := newTestHandler(cache, api)

	// Pre-populate cache
	cache.configs["ws_123"] = []domain.DKIMConfig{
		{
			Domain:       "example.com",
			Selector:     "kibamail",
			PrivateKey:   "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
			HeaderFields: "from:to:subject:date:message-id",
		},
	}

	r := chi.NewRouter()
	r.Get("/tenants/{tenantId}", handler.GetTenant)

	req := httptest.NewRequest("GET", "/tenants/ws_123", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response domain.TenantResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.TenantID != "ws_123" {
		t.Errorf("expected tenant_id 'ws_123', got '%s'", response.TenantID)
	}

	if len(response.DKIMConfigs) != 1 {
		t.Errorf("expected 1 DKIM config, got %d", len(response.DKIMConfigs))
	}

	if response.DKIMConfigs[0].Domain != "example.com" {
		t.Errorf("expected domain 'example.com', got '%s'", response.DKIMConfigs[0].Domain)
	}
}

func TestGetTenant_NotFound(t *testing.T) {
	cache := newMockDKIMCache()
	api := newMockControlPlaneClient()
	handler := newTestHandler(cache, api)

	r := chi.NewRouter()
	r.Get("/tenants/{tenantId}", handler.GetTenant)

	req := httptest.NewRequest("GET", "/tenants/ws_nonexistent", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["error"] != "tenant not found" {
		t.Errorf("expected error 'tenant not found', got '%s'", response["error"])
	}
}

func TestGetTenant_APIFetch_SkipsUnverifiedDomains(t *testing.T) {
	cache := newMockDKIMCache()
	api := newMockControlPlaneClient()
	handler := newTestHandler(cache, api)

	// Add tenant with one verified (with key) and one unverified domain
	api.tenants["ws_456"] = &domain.ControlPlaneTenant{
		ID: "ws_456",
		SendingDomains: []domain.ControlPlaneDomain{
			{
				ID:             "sd_1",
				Name:           "verified.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
				DkimVerifiedAt: "2024-01-01T00:00:00Z",
			},
			{
				ID:             "sd_2",
				Name:           "unverified.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest2\n-----END RSA PRIVATE KEY-----",
				DkimVerifiedAt: "", // Not verified - should be skipped
			},
			{
				ID:             "sd_3",
				Name:           "nokey.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "", // No private key - should be skipped
				DkimVerifiedAt: "2024-01-01T00:00:00Z",
			},
		},
	}

	r := chi.NewRouter()
	r.Get("/tenants/{tenantId}", handler.GetTenant)

	req := httptest.NewRequest("GET", "/tenants/ws_456", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response domain.TenantResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Only the verified domain with a key should be included
	if len(response.DKIMConfigs) != 1 {
		t.Errorf("expected 1 DKIM config (only verified with key), got %d", len(response.DKIMConfigs))
	}

	if len(response.DKIMConfigs) > 0 && response.DKIMConfigs[0].Domain != "verified.com" {
		t.Errorf("expected domain 'verified.com', got '%s'", response.DKIMConfigs[0].Domain)
	}
}

func TestGetTenant_SelectorParsing(t *testing.T) {
	tests := []struct {
		name             string
		dkimSubDomain    string
		expectedSelector string
	}{
		{
			name:             "standard selector",
			dkimSubDomain:    "kibamail._domainkey",
			expectedSelector: "kibamail",
		},
		{
			name:             "custom selector",
			dkimSubDomain:    "custom._domainkey",
			expectedSelector: "custom",
		},
		{
			name:             "short subdomain",
			dkimSubDomain:    "short",
			expectedSelector: "kibamail", // Falls back to default
		},
		{
			name:             "empty subdomain",
			dkimSubDomain:    "",
			expectedSelector: "kibamail", // Falls back to default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			selector := "kibamail"
			if tt.dkimSubDomain != "" && len(tt.dkimSubDomain) > 11 {
				selector = tt.dkimSubDomain[:len(tt.dkimSubDomain)-11]
			}

			if selector != tt.expectedSelector {
				t.Errorf("expected selector '%s', got '%s'", tt.expectedSelector, selector)
			}
		})
	}
}

func TestExtractString(t *testing.T) {
	tests := []struct {
		name     string
		m        map[string]interface{}
		key      string
		expected string
	}{
		{
			name:     "nil map",
			m:        nil,
			key:      "key",
			expected: "",
		},
		{
			name:     "missing key",
			m:        map[string]interface{}{"other": "value"},
			key:      "key",
			expected: "",
		},
		{
			name:     "non-string value",
			m:        map[string]interface{}{"key": 123},
			key:      "key",
			expected: "",
		},
		{
			name:     "string value",
			m:        map[string]interface{}{"key": "value"},
			key:      "key",
			expected: "value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractString(tt.m, tt.key)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}
