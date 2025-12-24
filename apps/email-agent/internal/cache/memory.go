// Package cache provides in-memory caching for sensitive data
package cache

import (
	"sync"
	"time"

	"github.com/kibamail/email-agent/internal/domain"
)

// MemoryCache provides thread-safe in-memory caching for sensitive data
// that should not be stored in Redis (DKIM keys, API key hashes).
type MemoryCache struct {
	// DKIM configs indexed by domain name
	dkimConfigs map[string]*dkimEntry

	// API keys indexed by key hash
	apiKeys map[string]*apiKeyEntry

	// Bounce domains indexed by bounce domain name
	bounceDomains map[string]*bounceDomainEntry

	mu sync.RWMutex

	// TTL for cached entries
	ttl time.Duration

	// Cleanup interval
	cleanupInterval time.Duration

	// Stop channel for cleanup goroutine
	stopCleanup chan struct{}
}

// dkimEntry wraps a DKIM config with expiration time
type dkimEntry struct {
	config    *domain.DKIMConfig
	expiresAt time.Time
}

// apiKeyEntry wraps API key data with expiration time
type apiKeyEntry struct {
	workspaceID string
	scopes      []string
	expiresAt   time.Time
}

// bounceDomainEntry wraps bounce domain validation result
type bounceDomainEntry struct {
	valid         bool
	workspaceID   string
	sendingDomain string
	expiresAt     time.Time
}

// MemoryCacheConfig holds configuration for the memory cache
type MemoryCacheConfig struct {
	TTL             time.Duration
	CleanupInterval time.Duration
	InitialCapacity int
}

// DefaultMemoryCacheConfig returns default configuration
func DefaultMemoryCacheConfig() MemoryCacheConfig {
	return MemoryCacheConfig{
		TTL:             24 * time.Hour,
		CleanupInterval: 5 * time.Minute,
		InitialCapacity: 1000,
	}
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache(cfg MemoryCacheConfig) *MemoryCache {
	if cfg.TTL == 0 {
		cfg.TTL = 24 * time.Hour
	}
	if cfg.CleanupInterval == 0 {
		cfg.CleanupInterval = 5 * time.Minute
	}
	if cfg.InitialCapacity == 0 {
		cfg.InitialCapacity = 1000
	}

	mc := &MemoryCache{
		dkimConfigs:     make(map[string]*dkimEntry, cfg.InitialCapacity),
		apiKeys:         make(map[string]*apiKeyEntry, cfg.InitialCapacity),
		bounceDomains:   make(map[string]*bounceDomainEntry, cfg.InitialCapacity),
		ttl:             cfg.TTL,
		cleanupInterval: cfg.CleanupInterval,
		stopCleanup:     make(chan struct{}),
	}

	// Start background cleanup
	go mc.cleanupLoop()

	return mc
}

// cleanupLoop periodically removes expired entries
func (mc *MemoryCache) cleanupLoop() {
	ticker := time.NewTicker(mc.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			mc.cleanup()
		case <-mc.stopCleanup:
			return
		}
	}
}

// cleanup removes all expired entries
func (mc *MemoryCache) cleanup() {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	now := time.Now()

	// Cleanup DKIM configs
	for key, entry := range mc.dkimConfigs {
		if now.After(entry.expiresAt) {
			delete(mc.dkimConfigs, key)
		}
	}

	// Cleanup API keys
	for key, entry := range mc.apiKeys {
		if now.After(entry.expiresAt) {
			delete(mc.apiKeys, key)
		}
	}

	// Cleanup bounce domains
	for key, entry := range mc.bounceDomains {
		if now.After(entry.expiresAt) {
			delete(mc.bounceDomains, key)
		}
	}
}

// Stop stops the cleanup goroutine
func (mc *MemoryCache) Stop() {
	close(mc.stopCleanup)
}

// =============================================================================
// DKIM Config Methods
// =============================================================================

// GetDKIMConfig retrieves a DKIM config by domain name
func (mc *MemoryCache) GetDKIMConfig(domainName string) (*domain.DKIMConfig, bool) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	entry, exists := mc.dkimConfigs[domainName]
	if !exists {
		return nil, false
	}

	// Check if expired
	if time.Now().After(entry.expiresAt) {
		return nil, false
	}

	return entry.config, true
}

// SetDKIMConfig stores a DKIM config
func (mc *MemoryCache) SetDKIMConfig(domainName string, config *domain.DKIMConfig) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.dkimConfigs[domainName] = &dkimEntry{
		config:    config,
		expiresAt: time.Now().Add(mc.ttl),
	}
}

// SetDKIMConfigWithTTL stores a DKIM config with custom TTL
func (mc *MemoryCache) SetDKIMConfigWithTTL(domainName string, config *domain.DKIMConfig, ttl time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.dkimConfigs[domainName] = &dkimEntry{
		config:    config,
		expiresAt: time.Now().Add(ttl),
	}
}

// DeleteDKIMConfig removes a DKIM config
func (mc *MemoryCache) DeleteDKIMConfig(domainName string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	delete(mc.dkimConfigs, domainName)
}

// =============================================================================
// API Key Methods
// =============================================================================

// APIKeyInfo represents cached API key data
type APIKeyInfo struct {
	WorkspaceID string
	Scopes      []string
}

// GetAPIKey retrieves API key info by key hash
func (mc *MemoryCache) GetAPIKey(keyHash string) (*APIKeyInfo, bool) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	entry, exists := mc.apiKeys[keyHash]
	if !exists {
		return nil, false
	}

	// Check if expired
	if time.Now().After(entry.expiresAt) {
		return nil, false
	}

	return &APIKeyInfo{
		WorkspaceID: entry.workspaceID,
		Scopes:      entry.scopes,
	}, true
}

// SetAPIKey stores API key info
func (mc *MemoryCache) SetAPIKey(keyHash string, workspaceID string, scopes []string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.apiKeys[keyHash] = &apiKeyEntry{
		workspaceID: workspaceID,
		scopes:      scopes,
		expiresAt:   time.Now().Add(mc.ttl),
	}
}

// SetAPIKeyWithTTL stores API key info with custom TTL
func (mc *MemoryCache) SetAPIKeyWithTTL(keyHash string, workspaceID string, scopes []string, ttl time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.apiKeys[keyHash] = &apiKeyEntry{
		workspaceID: workspaceID,
		scopes:      scopes,
		expiresAt:   time.Now().Add(ttl),
	}
}

// DeleteAPIKey removes an API key
func (mc *MemoryCache) DeleteAPIKey(keyHash string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	delete(mc.apiKeys, keyHash)
}

// =============================================================================
// Bounce Domain Methods
// =============================================================================

// BounceDomainInfo represents cached bounce domain validation result
type BounceDomainInfo struct {
	Valid         bool
	WorkspaceID   string
	SendingDomain string
}

// GetBounceDomain retrieves bounce domain info
func (mc *MemoryCache) GetBounceDomain(bounceDomain string) (*BounceDomainInfo, bool) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	entry, exists := mc.bounceDomains[bounceDomain]
	if !exists {
		return nil, false
	}

	// Check if expired
	if time.Now().After(entry.expiresAt) {
		return nil, false
	}

	return &BounceDomainInfo{
		Valid:         entry.valid,
		WorkspaceID:   entry.workspaceID,
		SendingDomain: entry.sendingDomain,
	}, true
}

// SetBounceDomain stores bounce domain info
func (mc *MemoryCache) SetBounceDomain(bounceDomain string, valid bool, workspaceID string, sendingDomain string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.bounceDomains[bounceDomain] = &bounceDomainEntry{
		valid:         valid,
		workspaceID:   workspaceID,
		sendingDomain: sendingDomain,
		expiresAt:     time.Now().Add(mc.ttl),
	}
}

// SetBounceDomainWithTTL stores bounce domain info with custom TTL
func (mc *MemoryCache) SetBounceDomainWithTTL(bounceDomain string, valid bool, workspaceID string, sendingDomain string, ttl time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.bounceDomains[bounceDomain] = &bounceDomainEntry{
		valid:         valid,
		workspaceID:   workspaceID,
		sendingDomain: sendingDomain,
		expiresAt:     time.Now().Add(ttl),
	}
}

// SetBounceDomainInvalid marks a bounce domain as invalid (not found)
func (mc *MemoryCache) SetBounceDomainInvalid(bounceDomain string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	// Cache negative results for shorter time to allow for quick recovery
	mc.bounceDomains[bounceDomain] = &bounceDomainEntry{
		valid:     false,
		expiresAt: time.Now().Add(5 * time.Minute),
	}
}

// DeleteBounceDomain removes a bounce domain entry
func (mc *MemoryCache) DeleteBounceDomain(bounceDomain string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	delete(mc.bounceDomains, bounceDomain)
}

// =============================================================================
// Stats Methods
// =============================================================================

// Stats returns cache statistics
type Stats struct {
	DKIMConfigCount   int
	APIKeyCount       int
	BounceDomainCount int
}

// GetStats returns current cache statistics
func (mc *MemoryCache) GetStats() Stats {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	return Stats{
		DKIMConfigCount:   len(mc.dkimConfigs),
		APIKeyCount:       len(mc.apiKeys),
		BounceDomainCount: len(mc.bounceDomains),
	}
}

// Clear removes all entries from the cache
func (mc *MemoryCache) Clear() {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.dkimConfigs = make(map[string]*dkimEntry, 1000)
	mc.apiKeys = make(map[string]*apiKeyEntry, 1000)
	mc.bounceDomains = make(map[string]*bounceDomainEntry, 1000)
}
