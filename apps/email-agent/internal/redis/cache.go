// Package redis provides DKIM credential caching
package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
)

const (
	// DKIMCacheKeyPrefix is the prefix for DKIM cache keys
	DKIMCacheKeyPrefix = "kibamail:dkim:"
	// DefaultDKIMCacheTTL is the default TTL for DKIM cache entries
	DefaultDKIMCacheTTL = 5 * time.Minute
)

// DKIMCache provides caching for DKIM configurations
type DKIMCache struct {
	client *Client
	logger zerolog.Logger
	ttl    time.Duration
}

// NewDKIMCache creates a new DKIM cache
func NewDKIMCache(client *Client, logger zerolog.Logger, ttl time.Duration) *DKIMCache {
	if ttl == 0 {
		ttl = DefaultDKIMCacheTTL
	}

	return &DKIMCache{
		client: client,
		logger: logger.With().Str("component", "dkim-cache").Logger(),
		ttl:    ttl,
	}
}

// GetDKIMConfigs retrieves DKIM configurations from cache
func (c *DKIMCache) GetDKIMConfigs(ctx context.Context, tenantID string) ([]domain.DKIMConfig, error) {
	key := c.cacheKey(tenantID)

	data, err := c.client.Get(ctx, key)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrCacheMiss) {
			c.logger.Debug().Str("tenant_id", tenantID).Msg("DKIM cache miss")
			return nil, err
		}
		return nil, err
	}

	var configs []domain.DKIMConfig
	if err := json.Unmarshal([]byte(data), &configs); err != nil {
		c.logger.Warn().
			Err(err).
			Str("tenant_id", tenantID).
			Msg("failed to unmarshal cached DKIM configs")
		return nil, kiberrors.Wrap(err, "failed to unmarshal cached data")
	}

	c.logger.Debug().
		Str("tenant_id", tenantID).
		Int("count", len(configs)).
		Msg("DKIM cache hit")

	return configs, nil
}

// SetDKIMConfigs stores DKIM configurations in cache
func (c *DKIMCache) SetDKIMConfigs(ctx context.Context, tenantID string, configs []domain.DKIMConfig, ttl time.Duration) error {
	if ttl == 0 {
		ttl = c.ttl
	}

	key := c.cacheKey(tenantID)

	data, err := json.Marshal(configs)
	if err != nil {
		return kiberrors.Wrap(err, "failed to marshal DKIM configs")
	}

	if err := c.client.Set(ctx, key, string(data), ttl); err != nil {
		return err
	}

	c.logger.Debug().
		Str("tenant_id", tenantID).
		Int("count", len(configs)).
		Dur("ttl", ttl).
		Msg("cached DKIM configs")

	return nil
}

// InvalidateCache removes DKIM configurations from cache
func (c *DKIMCache) InvalidateCache(ctx context.Context, tenantID string) error {
	key := c.cacheKey(tenantID)
	return c.client.Delete(ctx, key)
}

// cacheKey generates the cache key for a tenant
func (c *DKIMCache) cacheKey(tenantID string) string {
	return fmt.Sprintf("%s%s", DKIMCacheKeyPrefix, tenantID)
}
