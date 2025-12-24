package cache

import (
	"testing"
	"time"

	"github.com/kibamail/email-agent/internal/domain"
)

func TestMemoryCache_DKIMConfig(t *testing.T) {
	cfg := MemoryCacheConfig{
		TTL:             100 * time.Millisecond,
		CleanupInterval: 50 * time.Millisecond,
		InitialCapacity: 10,
	}
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Test Set and Get
	t.Run("set and get DKIM config", func(t *testing.T) {
		config := &domain.DKIMConfig{
			Domain:     "example.com",
			Selector:   "kibamail",
			PrivateKey: "private-key-pem",
			PublicKey:  "public-key",
		}

		mc.SetDKIMConfig("example.com", config)

		retrieved, found := mc.GetDKIMConfig("example.com")
		if !found {
			t.Fatal("expected to find DKIM config")
		}

		if retrieved.Domain != config.Domain {
			t.Errorf("expected domain %s, got %s", config.Domain, retrieved.Domain)
		}
		if retrieved.PrivateKey != config.PrivateKey {
			t.Errorf("expected private key %s, got %s", config.PrivateKey, retrieved.PrivateKey)
		}
	})

	// Test Get non-existent
	t.Run("get non-existent DKIM config", func(t *testing.T) {
		_, found := mc.GetDKIMConfig("nonexistent.com")
		if found {
			t.Error("expected not to find DKIM config")
		}
	})

	// Test expiration
	t.Run("DKIM config expires", func(t *testing.T) {
		config := &domain.DKIMConfig{
			Domain:     "expire.com",
			Selector:   "test",
			PrivateKey: "key",
		}

		mc.SetDKIMConfig("expire.com", config)

		// Wait for expiration
		time.Sleep(150 * time.Millisecond)

		_, found := mc.GetDKIMConfig("expire.com")
		if found {
			t.Error("expected DKIM config to be expired")
		}
	})

	// Test delete
	t.Run("delete DKIM config", func(t *testing.T) {
		config := &domain.DKIMConfig{
			Domain: "delete.com",
		}

		mc.SetDKIMConfig("delete.com", config)
		mc.DeleteDKIMConfig("delete.com")

		_, found := mc.GetDKIMConfig("delete.com")
		if found {
			t.Error("expected DKIM config to be deleted")
		}
	})
}

func TestMemoryCache_APIKey(t *testing.T) {
	cfg := MemoryCacheConfig{
		TTL:             100 * time.Millisecond,
		CleanupInterval: 50 * time.Millisecond,
		InitialCapacity: 10,
	}
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Test Set and Get
	t.Run("set and get API key", func(t *testing.T) {
		keyHash := "abc123hash"
		workspaceID := "workspace-1"
		scopes := []string{"write:broadcasts", "read:contacts"}

		mc.SetAPIKey(keyHash, workspaceID, scopes)

		info, found := mc.GetAPIKey(keyHash)
		if !found {
			t.Fatal("expected to find API key")
		}

		if info.WorkspaceID != workspaceID {
			t.Errorf("expected workspace %s, got %s", workspaceID, info.WorkspaceID)
		}
		if len(info.Scopes) != len(scopes) {
			t.Errorf("expected %d scopes, got %d", len(scopes), len(info.Scopes))
		}
	})

	// Test Get non-existent
	t.Run("get non-existent API key", func(t *testing.T) {
		_, found := mc.GetAPIKey("nonexistent")
		if found {
			t.Error("expected not to find API key")
		}
	})

	// Test expiration
	t.Run("API key expires", func(t *testing.T) {
		mc.SetAPIKey("expiring-key", "ws", []string{})

		time.Sleep(150 * time.Millisecond)

		_, found := mc.GetAPIKey("expiring-key")
		if found {
			t.Error("expected API key to be expired")
		}
	})
}

func TestMemoryCache_BounceDomain(t *testing.T) {
	cfg := MemoryCacheConfig{
		TTL:             100 * time.Millisecond,
		CleanupInterval: 50 * time.Millisecond,
		InitialCapacity: 10,
	}
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Test Set and Get valid bounce domain
	t.Run("set and get valid bounce domain", func(t *testing.T) {
		bounceDomain := "kb.example.com"
		workspaceID := "workspace-1"
		sendingDomain := "example.com"

		mc.SetBounceDomain(bounceDomain, true, workspaceID, sendingDomain)

		info, found := mc.GetBounceDomain(bounceDomain)
		if !found {
			t.Fatal("expected to find bounce domain")
		}

		if !info.Valid {
			t.Error("expected bounce domain to be valid")
		}
		if info.WorkspaceID != workspaceID {
			t.Errorf("expected workspace %s, got %s", workspaceID, info.WorkspaceID)
		}
		if info.SendingDomain != sendingDomain {
			t.Errorf("expected sending domain %s, got %s", sendingDomain, info.SendingDomain)
		}
	})

	// Test invalid bounce domain
	t.Run("set invalid bounce domain", func(t *testing.T) {
		mc.SetBounceDomainInvalid("invalid.example.com")

		info, found := mc.GetBounceDomain("invalid.example.com")
		if !found {
			t.Fatal("expected to find cached invalid result")
		}

		if info.Valid {
			t.Error("expected bounce domain to be invalid")
		}
	})

	// Test Get non-existent
	t.Run("get non-existent bounce domain", func(t *testing.T) {
		_, found := mc.GetBounceDomain("nonexistent.com")
		if found {
			t.Error("expected not to find bounce domain")
		}
	})
}

func TestMemoryCache_Stats(t *testing.T) {
	cfg := DefaultMemoryCacheConfig()
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Add some entries
	mc.SetDKIMConfig("domain1.com", &domain.DKIMConfig{Domain: "domain1.com"})
	mc.SetDKIMConfig("domain2.com", &domain.DKIMConfig{Domain: "domain2.com"})
	mc.SetAPIKey("key1", "ws1", []string{})
	mc.SetBounceDomain("kb.domain1.com", true, "ws1", "domain1.com")

	stats := mc.GetStats()

	if stats.DKIMConfigCount != 2 {
		t.Errorf("expected 2 DKIM configs, got %d", stats.DKIMConfigCount)
	}
	if stats.APIKeyCount != 1 {
		t.Errorf("expected 1 API key, got %d", stats.APIKeyCount)
	}
	if stats.BounceDomainCount != 1 {
		t.Errorf("expected 1 bounce domain, got %d", stats.BounceDomainCount)
	}
}

func TestMemoryCache_Clear(t *testing.T) {
	cfg := DefaultMemoryCacheConfig()
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Add some entries
	mc.SetDKIMConfig("domain.com", &domain.DKIMConfig{Domain: "domain.com"})
	mc.SetAPIKey("key", "ws", []string{})
	mc.SetBounceDomain("kb.domain.com", true, "ws", "domain.com")

	mc.Clear()

	stats := mc.GetStats()

	if stats.DKIMConfigCount != 0 {
		t.Errorf("expected 0 DKIM configs after clear, got %d", stats.DKIMConfigCount)
	}
	if stats.APIKeyCount != 0 {
		t.Errorf("expected 0 API keys after clear, got %d", stats.APIKeyCount)
	}
	if stats.BounceDomainCount != 0 {
		t.Errorf("expected 0 bounce domains after clear, got %d", stats.BounceDomainCount)
	}
}

func TestMemoryCache_Cleanup(t *testing.T) {
	cfg := MemoryCacheConfig{
		TTL:             50 * time.Millisecond,
		CleanupInterval: 30 * time.Millisecond,
		InitialCapacity: 10,
	}
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Add entries
	mc.SetDKIMConfig("domain.com", &domain.DKIMConfig{Domain: "domain.com"})
	mc.SetAPIKey("key", "ws", []string{})

	// Wait for cleanup to run (TTL + cleanup interval + buffer)
	time.Sleep(100 * time.Millisecond)

	stats := mc.GetStats()

	if stats.DKIMConfigCount != 0 {
		t.Errorf("expected 0 DKIM configs after cleanup, got %d", stats.DKIMConfigCount)
	}
	if stats.APIKeyCount != 0 {
		t.Errorf("expected 0 API keys after cleanup, got %d", stats.APIKeyCount)
	}
}

func TestMemoryCache_ConcurrentAccess(t *testing.T) {
	cfg := DefaultMemoryCacheConfig()
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Run concurrent operations
	done := make(chan bool)

	// Writer goroutine
	go func() {
		for i := 0; i < 100; i++ {
			mc.SetDKIMConfig("domain.com", &domain.DKIMConfig{Domain: "domain.com"})
			mc.SetAPIKey("key", "ws", []string{})
		}
		done <- true
	}()

	// Reader goroutine
	go func() {
		for i := 0; i < 100; i++ {
			mc.GetDKIMConfig("domain.com")
			mc.GetAPIKey("key")
		}
		done <- true
	}()

	// Deleter goroutine
	go func() {
		for i := 0; i < 50; i++ {
			mc.DeleteDKIMConfig("domain.com")
			mc.DeleteAPIKey("key")
		}
		done <- true
	}()

	// Wait for all goroutines
	for i := 0; i < 3; i++ {
		<-done
	}

	// If we got here without deadlock or panic, the test passes
}

func TestMemoryCache_CustomTTL(t *testing.T) {
	cfg := MemoryCacheConfig{
		TTL:             1 * time.Hour, // Long default TTL
		CleanupInterval: 1 * time.Minute,
		InitialCapacity: 10,
	}
	mc := NewMemoryCache(cfg)
	defer mc.Stop()

	// Set with short custom TTL
	mc.SetDKIMConfigWithTTL("short.com", &domain.DKIMConfig{Domain: "short.com"}, 50*time.Millisecond)

	// Should be found initially
	_, found := mc.GetDKIMConfig("short.com")
	if !found {
		t.Error("expected to find DKIM config")
	}

	// Wait for custom TTL to expire
	time.Sleep(100 * time.Millisecond)

	// Should not be found after expiration
	_, found = mc.GetDKIMConfig("short.com")
	if found {
		t.Error("expected DKIM config to be expired")
	}
}
