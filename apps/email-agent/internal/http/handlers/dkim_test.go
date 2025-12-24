package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/cache"
	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
)

// mockDKIMClient is a mock implementation of DKIMClient
type mockDKIMClient struct {
	tenants map[string]*domain.ControlPlaneTenant
}

func newMockDKIMClient() *mockDKIMClient {
	return &mockDKIMClient{
		tenants: make(map[string]*domain.ControlPlaneTenant),
	}
}

func (m *mockDKIMClient) GetTenantByDomain(ctx context.Context, domainName string) (*domain.ControlPlaneTenant, error) {
	if tenant, ok := m.tenants[domainName]; ok {
		return tenant, nil
	}
	return nil, kiberrors.ErrDomainNotFound
}

func TestDKIMHandler_GetDKIM_MissingDomain(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	req := httptest.NewRequest("GET", "/api/v1/dkim/", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Empty domain should return 404 (not matching route)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestDKIMHandler_GetDKIM_CacheHit(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	// Pre-populate cache
	memCache.SetDKIMConfig("example.com", &domain.DKIMConfig{
		Domain:     "example.com",
		Selector:   "kibamail",
		PrivateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
		PublicKey:  "public-key-here",
	})

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	req := httptest.NewRequest("GET", "/api/v1/dkim/example.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response DKIMResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Found {
		t.Error("expected Found to be true")
	}

	if response.Domain != "example.com" {
		t.Errorf("expected domain 'example.com', got '%s'", response.Domain)
	}

	if response.Selector != "kibamail" {
		t.Errorf("expected selector 'kibamail', got '%s'", response.Selector)
	}
}

func TestDKIMHandler_GetDKIM_DomainNotFound(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	req := httptest.NewRequest("GET", "/api/v1/dkim/nonexistent.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response DKIMResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Found {
		t.Error("expected Found to be false for nonexistent domain")
	}
}

func TestDKIMHandler_GetDKIM_APIFetch(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	// Add tenant with verified domain
	api.tenants["verified.com"] = &domain.ControlPlaneTenant{
		ID: "ws_123",
		SendingDomains: []domain.ControlPlaneDomain{
			{
				ID:             "sd_1",
				Name:           "verified.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\nprivate\n-----END RSA PRIVATE KEY-----",
				DkimPublicKey:  "public-key",
				DkimVerifiedAt: "2024-01-01T00:00:00Z",
			},
		},
	}

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	req := httptest.NewRequest("GET", "/api/v1/dkim/verified.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response DKIMResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Found {
		t.Error("expected Found to be true")
	}

	if response.Domain != "verified.com" {
		t.Errorf("expected domain 'verified.com', got '%s'", response.Domain)
	}

	if response.PrivateKey == "" {
		t.Error("expected PrivateKey to be set")
	}
}

func TestDKIMHandler_GetDKIM_SkipsUnverifiedDomains(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	// Add tenant with unverified domain
	api.tenants["unverified.com"] = &domain.ControlPlaneTenant{
		ID: "ws_123",
		SendingDomains: []domain.ControlPlaneDomain{
			{
				ID:             "sd_1",
				Name:           "unverified.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\nprivate\n-----END RSA PRIVATE KEY-----",
				DkimPublicKey:  "public-key",
				DkimVerifiedAt: "", // Not verified
			},
		},
	}

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	req := httptest.NewRequest("GET", "/api/v1/dkim/unverified.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response DKIMResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Found {
		t.Error("expected Found to be false for unverified domain")
	}
}

func TestDKIMHandler_GetDKIM_CachesResult(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDKIMClient()
	handler := NewDKIMHandler(memCache, api, zerolog.Nop(), nil)

	// Add tenant with verified domain
	api.tenants["cache-test.com"] = &domain.ControlPlaneTenant{
		ID: "ws_123",
		SendingDomains: []domain.ControlPlaneDomain{
			{
				ID:             "sd_1",
				Name:           "cache-test.com",
				DkimSubDomain:  "kibamail._domainkey",
				DkimPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\nprivate\n-----END RSA PRIVATE KEY-----",
				DkimPublicKey:  "public-key",
				DkimVerifiedAt: "2024-01-01T00:00:00Z",
			},
		},
	}

	r := chi.NewRouter()
	r.Get("/api/v1/dkim/{domain}", handler.GetDKIM)

	// First request
	req := httptest.NewRequest("GET", "/api/v1/dkim/cache-test.com", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify it was cached
	config, found := memCache.GetDKIMConfig("cache-test.com")
	if !found {
		t.Error("expected config to be cached")
	}

	if config.Domain != "cache-test.com" {
		t.Errorf("expected cached domain 'cache-test.com', got '%s'", config.Domain)
	}
}
