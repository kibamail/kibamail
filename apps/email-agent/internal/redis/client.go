// Package redis provides Redis client for caching
package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// Config contains Redis configuration
type Config struct {
	Host        string
	Port        int
	Password    string
	DB          int
	DialTimeout time.Duration
	PoolSize    int
}

// Client wraps the Redis client
type Client struct {
	client  *redis.Client
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewClient creates a new Redis client
func NewClient(cfg Config, logger zerolog.Logger, metrics *observability.Metrics) (*Client, error) {
	redisLogger := logger.With().Str("component", "redis").Logger()

	client := redis.NewClient(&redis.Options{
		Addr:        fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:    cfg.Password,
		DB:          cfg.DB,
		DialTimeout: cfg.DialTimeout,
		PoolSize:    cfg.PoolSize,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, kiberrors.Wrap(err, "failed to connect to Redis")
	}

	redisLogger.Info().
		Str("addr", fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)).
		Int("db", cfg.DB).
		Msg("connected to Redis")

	return &Client{
		client:  client,
		logger:  redisLogger,
		metrics: metrics,
	}, nil
}

// Ping checks Redis connectivity
func (c *Client) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// Get retrieves a value from Redis
func (c *Client) Get(ctx context.Context, key string) (string, error) {
	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		if c.metrics != nil {
			c.metrics.CacheMisses.Inc()
		}
		return "", kiberrors.ErrCacheMiss
	}
	if err != nil {
		if c.metrics != nil {
			c.metrics.CacheErrors.Inc()
		}
		return "", kiberrors.Wrap(err, "redis get failed")
	}

	if c.metrics != nil {
		c.metrics.CacheHits.Inc()
	}
	return val, nil
}

// Set stores a value in Redis with TTL
func (c *Client) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	err := c.client.Set(ctx, key, value, ttl).Err()
	if err != nil {
		if c.metrics != nil {
			c.metrics.CacheErrors.Inc()
		}
		return kiberrors.Wrap(err, "redis set failed")
	}
	return nil
}

// Delete removes a key from Redis
func (c *Client) Delete(ctx context.Context, key string) error {
	return c.client.Del(ctx, key).Err()
}

// Close closes the Redis connection
func (c *Client) Close() error {
	c.logger.Info().Msg("closing Redis connection")
	return c.client.Close()
}

// Client returns the underlying Redis client
func (c *Client) Client() *redis.Client {
	return c.client
}
