// Package main provides a mock Control Plane API for integration testing.
// This runs on the host machine (not in Docker) and provides:
// - Tenant lookup by sender domain
// - API key validation for SMTP auth
// - Bounce domain validation
// - DKIM key retrieval
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
)

const (
	defaultPort           = "3333"
	internalServiceKey    = "test-internal-service-key"
)

// TestData holds the mock data for testing
type TestData struct {
	mu              sync.RWMutex
	workspaces      map[string]*Workspace
	apiKeys         map[string]*APIKey
	domainToWS      map[string]string // domain -> workspace_id
	bounceDomainWS  map[string]*BounceDomainInfo
	dkimPrivateKeys map[string]string // domain -> private key (loaded from certs)
}

// Workspace represents a test workspace
type Workspace struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	SendingDomains []string `json:"sending_domains"`
	BounceDomain   string   `json:"bounce_domain"`
	DKIMSelector   string   `json:"dkim_selector"`
}

// APIKey represents a test API key
type APIKey struct {
	WorkspaceID string   `json:"workspace_id"`
	Scopes      []string `json:"scopes"`
	Valid       bool     `json:"valid"`
}

// BounceDomainInfo holds bounce domain metadata
type BounceDomainInfo struct {
	WorkspaceID   string `json:"workspace_id"`
	SendingDomain string `json:"sending_domain"`
}

var testData = &TestData{
	workspaces:      make(map[string]*Workspace),
	apiKeys:         make(map[string]*APIKey),
	domainToWS:      make(map[string]string),
	bounceDomainWS:  make(map[string]*BounceDomainInfo),
	dkimPrivateKeys: make(map[string]string),
}

func init() {
	initializeDefaults()
}

func initializeDefaults() {
	// Initialize default test data
	testData.workspaces["ws_test_123"] = &Workspace{
		ID:             "ws_test_123",
		Name:           "Test Workspace",
		SendingDomains: []string{"hq.kibamail.xyz"},
		BounceDomain:   "kb.hq.kibamail.xyz",
		DKIMSelector:   "kibamail",
	}

	testData.workspaces["ws_test_456"] = &Workspace{
		ID:             "ws_test_456",
		Name:           "Test Customer Workspace",
		SendingDomains: []string{"testcustomer.com"},
		BounceDomain:   "kb.testcustomer.com",
		DKIMSelector:   "kibamail",
	}

	testData.domainToWS["hq.kibamail.xyz"] = "ws_test_123"
	testData.domainToWS["testcustomer.com"] = "ws_test_456"

	testData.bounceDomainWS["kb.hq.kibamail.xyz"] = &BounceDomainInfo{
		WorkspaceID:   "ws_test_123",
		SendingDomain: "hq.kibamail.xyz",
	}
	testData.bounceDomainWS["kb.testcustomer.com"] = &BounceDomainInfo{
		WorkspaceID:   "ws_test_456",
		SendingDomain: "testcustomer.com",
	}

	testData.apiKeys["test-api-key-12345"] = &APIKey{
		WorkspaceID: "ws_test_123",
		Scopes:      []string{"email:send", "email:inject"},
		Valid:       true,
	}

	testData.apiKeys["test-api-key-67890"] = &APIKey{
		WorkspaceID: "ws_test_456",
		Scopes:      []string{"email:send"},
		Valid:       true,
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// Try to load DKIM keys from certs directory
	loadDKIMKeys()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", healthHandler)

	// Internal API endpoints (used by email-agent)
	// Note: email-agent expects /api/internal/v1/... paths
	mux.HandleFunc("/api/internal/v1/tenants/by-domain/", requireAuth(tenantByDomainHandler))
	mux.HandleFunc("/api/internal/v1/tenants/by-bounce-domain/", requireAuth(bounceDomainHandler))
	mux.HandleFunc("/api/internal/v1/auth/validate", requireAuth(authValidateHandler))
	mux.HandleFunc("/api/internal/v1/dkim/", requireAuth(dkimHandler))

	// Test management endpoints (for test setup)
	mux.HandleFunc("/test/workspaces", testWorkspacesHandler)
	mux.HandleFunc("/test/api-keys", testAPIKeysHandler)
	mux.HandleFunc("/test/dkim-keys", testDKIMKeysHandler)
	mux.HandleFunc("/test/status", testStatusHandler)
	mux.HandleFunc("/test/reset", testResetHandler)

	log.Printf("Control Plane Mock starting on port %s", port)
	log.Printf("Workspaces configured: %v", getWorkspaceIDs())
	log.Printf("DKIM keys loaded: %v", getDKIMDomains())

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func loadDKIMKeys() {
	// Try to load from certs directory (relative to where tests run)
	certPaths := []string{
		"./certs",
		"../certs",
		"../../certs",
		"./apps/mta/tests/certs",
	}

	dkimFiles := map[string]string{
		"hq.kibamail.xyz":  "tenant-hq-dkim-private.pem",
		"testcustomer.com": "tenant-testcustomer-dkim-private.pem",
	}

	for _, basePath := range certPaths {
		for domain, filename := range dkimFiles {
			path := basePath + "/" + filename
			if data, err := os.ReadFile(path); err == nil {
				testData.mu.Lock()
				testData.dkimPrivateKeys[domain] = string(data)
				testData.mu.Unlock()
				log.Printf("Loaded DKIM key for %s from %s", domain, path)
			}
		}
	}
}

func getWorkspaceIDs() []string {
	testData.mu.RLock()
	defer testData.mu.RUnlock()
	ids := make([]string, 0, len(testData.workspaces))
	for id := range testData.workspaces {
		ids = append(ids, id)
	}
	return ids
}

func getDKIMDomains() []string {
	testData.mu.RLock()
	defer testData.mu.RUnlock()
	domains := make([]string, 0, len(testData.dkimPrivateKeys))
	for domain := range testData.dkimPrivateKeys {
		domains = append(domains, domain)
	}
	return domains
}

// requireAuth middleware checks for valid internal service key
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			jsonError(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		if !strings.HasPrefix(auth, "Bearer ") {
			jsonError(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		if token != internalServiceKey {
			jsonError(w, "Invalid service key", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"status": "ok", "service": "control-plane-mock"})
}

// GET /internal/v1/tenants/by-domain/{domain}
// Returns ControlPlaneTenant structure expected by email-agent
func tenantByDomainHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := strings.TrimPrefix(r.URL.Path, "/api/internal/v1/tenants/by-domain/")
	if domain == "" {
		jsonError(w, "Missing domain", http.StatusBadRequest)
		return
	}

	testData.mu.RLock()
	wsID, ok := testData.domainToWS[domain]
	if !ok {
		testData.mu.RUnlock()
		jsonError(w, "Domain not found", http.StatusNotFound)
		return
	}

	ws := testData.workspaces[wsID]
	dkimKey := testData.dkimPrivateKeys[domain]
	testData.mu.RUnlock()

	// Return structure matching ControlPlaneTenant expected by email-agent
	jsonResponse(w, map[string]interface{}{
		"id": ws.ID,
		"sending_domains": []map[string]interface{}{
			{
				"id":                 "domain_" + domain,
				"name":               domain,
				"dkim_sub_domain":    ws.DKIMSelector + "._domainkey",
				"dkim_public_key":    "", // Not needed for signing
				"dkim_private_key":   dkimKey,
				"dkim_verified_at":   "2024-01-01T00:00:00Z", // Non-empty indicates verified
				"return_path_domain": ws.BounceDomain,
			},
		},
	})
}

// GET /internal/v1/tenants/by-bounce-domain/{domain}
func bounceDomainHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := strings.TrimPrefix(r.URL.Path, "/api/internal/v1/tenants/by-bounce-domain/")
	if domain == "" {
		jsonError(w, "Missing domain", http.StatusBadRequest)
		return
	}

	testData.mu.RLock()
	info, ok := testData.bounceDomainWS[domain]
	testData.mu.RUnlock()

	if !ok {
		// Return 404 for unknown bounce domains (email-agent expects this)
		w.WriteHeader(http.StatusNotFound)
		jsonResponse(w, map[string]interface{}{"valid": false, "error": "bounce domain not found"})
		return
	}

	jsonResponse(w, map[string]interface{}{
		"valid":          true,
		"workspace_id":   info.WorkspaceID,
		"sending_domain": info.SendingDomain,
	})
}

// POST /internal/v1/auth/validate
func authValidateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		APIKey         string   `json:"api_key"`
		RequiredScopes []string `json:"required_scopes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.APIKey == "" {
		jsonError(w, "Missing api_key", http.StatusBadRequest)
		return
	}

	testData.mu.RLock()
	key, ok := testData.apiKeys[req.APIKey]
	testData.mu.RUnlock()

	if !ok || !key.Valid {
		jsonResponse(w, map[string]interface{}{"valid": false, "error": "Invalid API key"})
		return
	}

	// Check scopes if required
	if len(req.RequiredScopes) > 0 {
		scopeMap := make(map[string]bool)
		for _, s := range key.Scopes {
			scopeMap[s] = true
		}
		for _, required := range req.RequiredScopes {
			if !scopeMap[required] {
				jsonResponse(w, map[string]interface{}{
					"valid":        false,
					"error":        "Insufficient scopes",
					"workspace_id": key.WorkspaceID,
				})
				return
			}
		}
	}

	jsonResponse(w, map[string]interface{}{
		"valid":        true,
		"workspace_id": key.WorkspaceID,
		"scopes":       key.Scopes,
	})
}

// GET /internal/v1/dkim/{domain}
func dkimHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := strings.TrimPrefix(r.URL.Path, "/api/internal/v1/dkim/")
	if domain == "" {
		jsonError(w, "Missing domain", http.StatusBadRequest)
		return
	}

	testData.mu.RLock()
	wsID, ok := testData.domainToWS[domain]
	if !ok {
		testData.mu.RUnlock()
		jsonError(w, "Domain not found", http.StatusNotFound)
		return
	}

	ws := testData.workspaces[wsID]
	dkimKey := testData.dkimPrivateKeys[domain]
	testData.mu.RUnlock()

	jsonResponse(w, map[string]interface{}{
		"domain":      domain,
		"selector":    ws.DKIMSelector,
		"private_key": dkimKey,
		"algorithm":   "rsa-sha256",
		"headers":     []string{"From", "To", "Subject", "Date", "Message-ID", "Content-Type", "MIME-Version"},
	})
}

// POST /test/workspaces - Add test workspace
func testWorkspacesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var ws Workspace
	if err := json.NewDecoder(r.Body).Decode(&ws); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	testData.mu.Lock()
	testData.workspaces[ws.ID] = &ws
	for _, domain := range ws.SendingDomains {
		testData.domainToWS[domain] = ws.ID
	}
	if ws.BounceDomain != "" {
		testData.bounceDomainWS[ws.BounceDomain] = &BounceDomainInfo{
			WorkspaceID:   ws.ID,
			SendingDomain: ws.SendingDomains[0],
		}
	}
	testData.mu.Unlock()

	jsonResponse(w, map[string]interface{}{"created": true, "workspace": ws})
}

// POST /test/api-keys - Add test API key
func testAPIKeysHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Key         string   `json:"key"`
		WorkspaceID string   `json:"workspace_id"`
		Scopes      []string `json:"scopes"`
		Valid       bool     `json:"valid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	testData.mu.Lock()
	testData.apiKeys[req.Key] = &APIKey{
		WorkspaceID: req.WorkspaceID,
		Scopes:      req.Scopes,
		Valid:       req.Valid,
	}
	testData.mu.Unlock()

	jsonResponse(w, map[string]interface{}{"created": true})
}

// POST /test/dkim-keys - Add DKIM key for a domain
func testDKIMKeysHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Domain     string `json:"domain"`
		PrivateKey string `json:"private_key"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	testData.mu.Lock()
	testData.dkimPrivateKeys[req.Domain] = req.PrivateKey
	testData.mu.Unlock()

	jsonResponse(w, map[string]interface{}{"created": true})
}

// GET /test/status - Get current test data status
func testStatusHandler(w http.ResponseWriter, r *http.Request) {
	testData.mu.RLock()
	defer testData.mu.RUnlock()

	wsIDs := make([]string, 0, len(testData.workspaces))
	for id := range testData.workspaces {
		wsIDs = append(wsIDs, id)
	}

	apiKeyNames := make([]string, 0, len(testData.apiKeys))
	for k := range testData.apiKeys {
		apiKeyNames = append(apiKeyNames, k)
	}

	domains := make([]string, 0, len(testData.domainToWS))
	for d := range testData.domainToWS {
		domains = append(domains, d)
	}

	bounceDomains := make([]string, 0, len(testData.bounceDomainWS))
	for d := range testData.bounceDomainWS {
		bounceDomains = append(bounceDomains, d)
	}

	dkimDomains := make([]string, 0, len(testData.dkimPrivateKeys))
	for d := range testData.dkimPrivateKeys {
		dkimDomains = append(dkimDomains, d)
	}

	jsonResponse(w, map[string]interface{}{
		"workspaces":     wsIDs,
		"api_keys":       apiKeyNames,
		"domains":        domains,
		"bounce_domains": bounceDomains,
		"dkim_domains":   dkimDomains,
	})
}

// POST /test/reset - Reset test data to defaults
func testResetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	testData.mu.Lock()
	// Clear existing data
	testData.workspaces = make(map[string]*Workspace)
	testData.apiKeys = make(map[string]*APIKey)
	testData.domainToWS = make(map[string]string)
	testData.bounceDomainWS = make(map[string]*BounceDomainInfo)
	testData.dkimPrivateKeys = make(map[string]string)
	testData.mu.Unlock()

	// Re-initialize defaults
	initializeDefaults()
	loadDKIMKeys()

	jsonResponse(w, map[string]interface{}{"reset": true})
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
