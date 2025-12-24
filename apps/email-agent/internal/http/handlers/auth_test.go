package handlers

import (
	"bytes"
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

// mockAuthClient is a mock implementation of AuthClient
type mockAuthClient struct {
	validKeys map[string]*domain.APIKeyValidationResponse
}

func newMockAuthClient() *mockAuthClient {
	return &mockAuthClient{
		validKeys: make(map[string]*domain.APIKeyValidationResponse),
	}
}

func (m *mockAuthClient) ValidateAPIKey(ctx context.Context, keyHash string, requiredScopes []string) (*domain.APIKeyValidationResponse, error) {
	if result, ok := m.validKeys[keyHash]; ok {
		// Check required scopes
		if len(requiredScopes) > 0 && !hasRequiredScopes(result.Scopes, requiredScopes) {
			return &domain.APIKeyValidationResponse{Valid: false}, kiberrors.ErrInsufficientScopes
		}
		return result, nil
	}
	return &domain.APIKeyValidationResponse{Valid: false}, nil
}

func TestAuthHandler_ValidateAuth_EmptyBody(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	req := httptest.NewRequest("POST", "/api/v1/auth/validate", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestAuthHandler_ValidateAuth_MissingUsername(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"password": "test"}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["error"] != "username is required" {
		t.Errorf("expected error 'username is required', got '%s'", response["error"])
	}
}

func TestAuthHandler_ValidateAuth_InvalidKey(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"username": "invalid-api-key"}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response AuthValidateResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Valid {
		t.Error("expected Valid to be false for invalid key")
	}
}

func TestAuthHandler_ValidateAuth_ValidKey(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	// Add valid key
	apiKey := "test-api-key-123"
	keyHash := hashAPIKey(apiKey)
	api.validKeys[keyHash] = &domain.APIKeyValidationResponse{
		Valid:       true,
		WorkspaceID: "ws_123",
		Scopes:      []string{"write:broadcasts", "read:contacts"},
	}

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"username": "test-api-key-123"}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response AuthValidateResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Valid {
		t.Error("expected Valid to be true")
	}

	if response.WorkspaceID != "ws_123" {
		t.Errorf("expected WorkspaceID 'ws_123', got '%s'", response.WorkspaceID)
	}

	if len(response.Scopes) != 2 {
		t.Errorf("expected 2 scopes, got %d", len(response.Scopes))
	}
}

func TestAuthHandler_ValidateAuth_CacheHit(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	// Pre-populate cache
	apiKey := "cached-api-key"
	keyHash := hashAPIKey(apiKey)
	memCache.SetAPIKey(keyHash, "ws_cached", []string{"read:all"})

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"username": "cached-api-key"}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response AuthValidateResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Valid {
		t.Error("expected Valid to be true from cache")
	}

	if response.WorkspaceID != "ws_cached" {
		t.Errorf("expected WorkspaceID 'ws_cached', got '%s'", response.WorkspaceID)
	}
}

func TestAuthHandler_ValidateAuth_InsufficientScopes(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	// Add valid key with limited scopes
	apiKey := "limited-api-key"
	keyHash := hashAPIKey(apiKey)
	api.validKeys[keyHash] = &domain.APIKeyValidationResponse{
		Valid:       true,
		WorkspaceID: "ws_123",
		Scopes:      []string{"read:contacts"}, // Only read scope
	}

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"username": "limited-api-key", "required_scopes": ["write:broadcasts"]}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response AuthValidateResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Valid {
		t.Error("expected Valid to be false for insufficient scopes")
	}
}

func TestAuthHandler_ValidateAuth_CachesValidKey(t *testing.T) {
	memCache := cache.NewMemoryCache(cache.MemoryCacheConfig{})
	defer memCache.Stop()
	api := newMockAuthClient()
	handler := NewAuthHandler(memCache, api, zerolog.Nop(), nil)

	// Add valid key
	apiKey := "cache-test-key"
	keyHash := hashAPIKey(apiKey)
	api.validKeys[keyHash] = &domain.APIKeyValidationResponse{
		Valid:       true,
		WorkspaceID: "ws_cache_test",
		Scopes:      []string{"all"},
	}

	r := chi.NewRouter()
	r.Post("/api/v1/auth/validate", handler.ValidateAuth)

	body := bytes.NewBufferString(`{"username": "cache-test-key"}`)
	req := httptest.NewRequest("POST", "/api/v1/auth/validate", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify it was cached
	info, found := memCache.GetAPIKey(keyHash)
	if !found {
		t.Error("expected API key to be cached")
	}

	if info.WorkspaceID != "ws_cache_test" {
		t.Errorf("expected cached WorkspaceID 'ws_cache_test', got '%s'", info.WorkspaceID)
	}
}

func TestHashAPIKey(t *testing.T) {
	// Test that hashing is consistent
	key := "test-api-key"
	hash1 := hashAPIKey(key)
	hash2 := hashAPIKey(key)

	if hash1 != hash2 {
		t.Error("expected consistent hash output")
	}

	// Test that different keys produce different hashes
	hash3 := hashAPIKey("different-key")
	if hash1 == hash3 {
		t.Error("expected different keys to produce different hashes")
	}
}

func TestHasRequiredScopes(t *testing.T) {
	tests := []struct {
		name     string
		scopes   []string
		required []string
		expected bool
	}{
		{
			name:     "all scopes present",
			scopes:   []string{"read:all", "write:all"},
			required: []string{"read:all"},
			expected: true,
		},
		{
			name:     "missing scope",
			scopes:   []string{"read:all"},
			required: []string{"write:all"},
			expected: false,
		},
		{
			name:     "empty required",
			scopes:   []string{"read:all"},
			required: []string{},
			expected: true,
		},
		{
			name:     "empty scopes with required",
			scopes:   []string{},
			required: []string{"read:all"},
			expected: false,
		},
		{
			name:     "multiple required all present",
			scopes:   []string{"a", "b", "c"},
			required: []string{"a", "c"},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasRequiredScopes(tt.scopes, tt.required)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
