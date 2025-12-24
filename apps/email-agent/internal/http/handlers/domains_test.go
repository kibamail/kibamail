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
)

// mockDomainClient is a mock implementation of DomainClient
type mockDomainClient struct {
	domains map[string]*domain.BounceDomainResponse
}

func newMockDomainClient() *mockDomainClient {
	return &mockDomainClient{
		domains: make(map[string]*domain.BounceDomainResponse),
	}
}

func (m *mockDomainClient) ValidateBounceDomain(ctx context.Context, bounceDomain string) (*domain.BounceDomainResponse, error) {
	if result, ok := m.domains[bounceDomain]; ok {
		return result, nil
	}
	return &domain.BounceDomainResponse{Valid: false}, nil
}

func TestDomainHandler_ValidateListenerDomain_MissingDomain(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Empty domain should return 404 (not matching route)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestDomainHandler_ValidateListenerDomain_CacheHit(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	// Pre-populate cache
	memCache.SetBounceDomain("kb.example.com", true, "ws_123", "example.com")

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/kb.example.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response ListenerDomainResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Valid {
		t.Error("expected Valid to be true")
	}

	if response.Domain != "kb.example.com" {
		t.Errorf("expected domain 'kb.example.com', got '%s'", response.Domain)
	}

	if response.WorkspaceID != "ws_123" {
		t.Errorf("expected WorkspaceID 'ws_123', got '%s'", response.WorkspaceID)
	}

	if response.SendingDomain != "example.com" {
		t.Errorf("expected SendingDomain 'example.com', got '%s'", response.SendingDomain)
	}
}

func TestDomainHandler_ValidateListenerDomain_InvalidDomain(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/invalid.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response ListenerDomainResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Valid {
		t.Error("expected Valid to be false for invalid domain")
	}
}

func TestDomainHandler_ValidateListenerDomain_APIValidation(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	// Add valid bounce domain
	api.domains["kb.verified.com"] = &domain.BounceDomainResponse{
		Valid:         true,
		WorkspaceID:   "ws_verified",
		SendingDomain: "verified.com",
	}

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/kb.verified.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response ListenerDomainResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Valid {
		t.Error("expected Valid to be true")
	}

	if response.WorkspaceID != "ws_verified" {
		t.Errorf("expected WorkspaceID 'ws_verified', got '%s'", response.WorkspaceID)
	}

	if response.SendingDomain != "verified.com" {
		t.Errorf("expected SendingDomain 'verified.com', got '%s'", response.SendingDomain)
	}

	// Should have logging settings
	if response.LogOOB != "LogThenDrop" {
		t.Errorf("expected LogOOB 'LogThenDrop', got '%s'", response.LogOOB)
	}

	if response.LogARF != "LogThenDrop" {
		t.Errorf("expected LogARF 'LogThenDrop', got '%s'", response.LogARF)
	}
}

func TestDomainHandler_ValidateListenerDomain_CachesValidDomain(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	// Add valid bounce domain
	api.domains["kb.cache-test.com"] = &domain.BounceDomainResponse{
		Valid:         true,
		WorkspaceID:   "ws_cache_test",
		SendingDomain: "cache-test.com",
	}

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/kb.cache-test.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify it was cached
	info, found := memCache.GetBounceDomain("kb.cache-test.com")
	if !found {
		t.Error("expected domain to be cached")
	}

	if !info.Valid {
		t.Error("expected cached domain to be valid")
	}

	if info.WorkspaceID != "ws_cache_test" {
		t.Errorf("expected cached WorkspaceID 'ws_cache_test', got '%s'", info.WorkspaceID)
	}
}

func TestDomainHandler_ValidateListenerDomain_CachesInvalidDomain(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockDomainClient()
	handler := NewDomainHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Get("/api/v1/domains/validate-listener/{domain}", handler.ValidateListenerDomain)

	req := httptest.NewRequest("GET", "/api/v1/domains/validate-listener/kb.negative-cache.com", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify negative result was cached
	info, found := memCache.GetBounceDomain("kb.negative-cache.com")
	if !found {
		t.Error("expected invalid domain to be cached (negative caching)")
	}

	if info.Valid {
		t.Error("expected cached domain to be invalid")
	}
}
