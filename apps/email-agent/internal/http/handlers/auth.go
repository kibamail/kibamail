// Package handlers provides HTTP handlers for the email agent
package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"

	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/cache"
	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// maxAuthRequestSize limits the size of auth validation requests
const maxAuthRequestSize = 64 << 10 // 64KB

// AuthClient interface for validating API keys with control plane
type AuthClient interface {
	ValidateAPIKey(ctx context.Context, keyHash string, requiredScopes []string) (*domain.APIKeyValidationResponse, error)
}

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	cache   *cache.MemoryCache
	api     AuthClient
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(
	memCache *cache.MemoryCache,
	api AuthClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *AuthHandler {
	return &AuthHandler{
		cache:   memCache,
		api:     api,
		logger:  logger.With().Str("handler", "auth").Logger(),
		metrics: metrics,
	}
}

// AuthValidateRequest is the request body for API key validation
type AuthValidateRequest struct {
	Username       string   `json:"username"`        // The API key (will be hashed)
	Password       string   `json:"password"`        // Often same as username for API keys
	RequiredScopes []string `json:"required_scopes"` // Optional scopes to check
}

// AuthValidateResponse is the response for API key validation
type AuthValidateResponse struct {
	Valid       bool     `json:"valid"`
	WorkspaceID string   `json:"workspace_id,omitempty"`
	Scopes      []string `json:"scopes,omitempty"`
	Error       string   `json:"error,omitempty"`
}

// ValidateAuth validates SMTP credentials (API key)
// POST /api/v1/auth/validate
func (h *AuthHandler) ValidateAuth(w http.ResponseWriter, r *http.Request) {
	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestSize)

	var req AuthValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		if err == io.EOF {
			h.respondError(w, http.StatusBadRequest, "request body is required")
			return
		}
		h.respondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	// Username is the API key for SMTP auth
	if req.Username == "" {
		h.respondError(w, http.StatusBadRequest, "username is required")
		return
	}

	ctx := r.Context()

	// Hash the API key for lookup
	keyHash := hashAPIKey(req.Username)

	// 1. Check in-memory cache first (API keys are sensitive)
	if info, found := h.cache.GetAPIKey(keyHash); found {
		h.logger.Debug().Str("key_hash", keyHash[:8]+"...").Msg("API key found in cache")

		// Check required scopes if specified
		if len(req.RequiredScopes) > 0 && !hasRequiredScopes(info.Scopes, req.RequiredScopes) {
			h.respondJSON(w, http.StatusOK, AuthValidateResponse{
				Valid: false,
				Error: "insufficient scopes",
			})
			return
		}

		h.respondJSON(w, http.StatusOK, AuthValidateResponse{
			Valid:       true,
			WorkspaceID: info.WorkspaceID,
			Scopes:      info.Scopes,
		})
		return
	}

	// 2. Cache miss - validate with control plane
	h.logger.Debug().Str("key_hash", keyHash[:8]+"...").Msg("API key cache miss, validating with control plane")

	result, err := h.api.ValidateAPIKey(ctx, keyHash, req.RequiredScopes)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrInsufficientScopes) {
			h.respondJSON(w, http.StatusOK, AuthValidateResponse{
				Valid: false,
				Error: "insufficient scopes",
			})
			return
		}
		h.logger.Error().Err(err).Msg("failed to validate API key with control plane")
		h.respondError(w, http.StatusInternalServerError, "failed to validate credentials")
		return
	}

	// 3. Cache the result if valid
	if result.Valid {
		h.cache.SetAPIKey(keyHash, result.WorkspaceID, result.Scopes)
		h.logger.Debug().Str("key_hash", keyHash[:8]+"...").Msg("API key cached")
	}

	h.respondJSON(w, http.StatusOK, AuthValidateResponse{
		Valid:       result.Valid,
		WorkspaceID: result.WorkspaceID,
		Scopes:      result.Scopes,
	})
}

// hashAPIKey creates a SHA-256 hash of the API key
func hashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

// hasRequiredScopes checks if the given scopes contain all required scopes
func hasRequiredScopes(scopes []string, required []string) bool {
	scopeSet := make(map[string]bool, len(scopes))
	for _, s := range scopes {
		scopeSet[s] = true
	}

	for _, r := range required {
		if !scopeSet[r] {
			return false
		}
	}
	return true
}

// respondJSON sends a JSON response
func (h *AuthHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// respondError sends an error response
func (h *AuthHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{
		"error": message,
	})
}
