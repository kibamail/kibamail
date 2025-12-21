// Package observability provides health check infrastructure
package observability

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/heptiolabs/healthcheck"
	"github.com/rs/zerolog"
)

// HealthConfig contains health check configuration
type HealthConfig struct {
	Port          int
	LivenessPath  string
	ReadinessPath string
}

// HealthChecker manages health check endpoints
type HealthChecker struct {
	handler healthcheck.Handler
	logger  zerolog.Logger
	config  HealthConfig
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(cfg HealthConfig, logger zerolog.Logger) *HealthChecker {
	handler := healthcheck.NewHandler()

	// Add default liveness checks
	handler.AddLivenessCheck("goroutine-threshold", goroutineThresholdCheck(10000))

	return &HealthChecker{
		handler: handler,
		logger:  logger.With().Str("component", "health").Logger(),
		config:  cfg,
	}
}

// AddLivenessCheck adds a liveness check
func (h *HealthChecker) AddLivenessCheck(name string, check healthcheck.Check) {
	h.handler.AddLivenessCheck(name, check)
}

// AddReadinessCheck adds a readiness check
func (h *HealthChecker) AddReadinessCheck(name string, check healthcheck.Check) {
	h.handler.AddReadinessCheck(name, check)
}

// Handler returns the HTTP handler for health checks
func (h *HealthChecker) Handler() http.Handler {
	return h.handler
}

// LivenessHandler returns the liveness check handler
func (h *HealthChecker) LivenessHandler() http.HandlerFunc {
	return h.handler.LiveEndpoint
}

// ReadinessHandler returns the readiness check handler
func (h *HealthChecker) ReadinessHandler() http.HandlerFunc {
	return h.handler.ReadyEndpoint
}

// Start starts the health check HTTP server
func (h *HealthChecker) Start(ctx context.Context) error {
	mux := http.NewServeMux()
	mux.HandleFunc(h.config.LivenessPath, h.handler.LiveEndpoint)
	mux.HandleFunc(h.config.ReadinessPath, h.handler.ReadyEndpoint)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", h.config.Port),
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	h.logger.Info().
		Int("port", h.config.Port).
		Str("liveness_path", h.config.LivenessPath).
		Str("readiness_path", h.config.ReadinessPath).
		Msg("starting health check server")

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			h.logger.Error().Err(err).Msg("health server shutdown error")
		}
	}()

	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		return err
	}
	return nil
}

// goroutineThresholdCheck returns a check that fails if goroutine count exceeds threshold
func goroutineThresholdCheck(threshold int) healthcheck.Check {
	return func() error {
		count := runtime.NumGoroutine()
		if count > threshold {
			return fmt.Errorf("goroutine count %d exceeds threshold %d", count, threshold)
		}
		return nil
	}
}

// NATSCheck returns a check for NATS connectivity
func NATSCheck(isConnected func() bool) healthcheck.Check {
	return func() error {
		if !isConnected() {
			return fmt.Errorf("NATS is not connected")
		}
		return nil
	}
}

// RedisCheck returns a check for Redis connectivity
func RedisCheck(ping func(context.Context) error) healthcheck.Check {
	return func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return ping(ctx)
	}
}

// KumoMTACheck returns a check for KumoMTA connectivity
func KumoMTACheck(healthCheck func(context.Context) error) healthcheck.Check {
	return func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return healthCheck(ctx)
	}
}

// S3Check returns a check for S3 connectivity
func S3Check(healthCheck func(context.Context) error) healthcheck.Check {
	return func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return healthCheck(ctx)
	}
}
