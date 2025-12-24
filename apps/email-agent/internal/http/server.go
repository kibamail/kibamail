// Package http provides the HTTP server for the email agent
package http

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/http/handlers"
	"github.com/kibamail/email-agent/internal/observability"
)

// ServerConfig contains HTTP server configuration
type ServerConfig struct {
	Host            string
	Port            int
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	IdleTimeout     time.Duration
	MaxHeaderBytes  int
}

// Hardening constants
const (
	// defaultMaxHeaderBytes limits request header size (1MB)
	defaultMaxHeaderBytes = 1 << 20
	// defaultIdleTimeout for keep-alive connections
	defaultIdleTimeout = 60 * time.Second
)

// Server is the HTTP server for the email agent
type Server struct {
	server  *http.Server
	router  *chi.Mux
	logger  zerolog.Logger
	metrics *observability.Metrics
	config  ServerConfig
}

// ServerHandlers contains all HTTP handlers for the server
type ServerHandlers struct {
	Tenant  *handlers.TenantHandler
	Webhook *handlers.WebhookHandler
	DKIM    *handlers.DKIMHandler
	Auth    *handlers.AuthHandler
	Domain  *handlers.DomainHandler
	DMARC   *handlers.DMARCHandler
}

// NewServer creates a new HTTP server
func NewServer(
	cfg ServerConfig,
	h ServerHandlers,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *Server {
	httpLogger := logger.With().Str("component", "http").Logger()

	router := chi.NewRouter()

	// Middleware
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(requestLogger(httpLogger))
	router.Use(metricsMiddleware(metrics))
	router.Use(middleware.Recoverer)

	// Legacy routes (backward compatibility)
	router.Get("/tenants/{tenantId}", h.Tenant.GetTenant)
	router.Post("/webhooks", h.Webhook.HandleWebhook)

	// API v1 routes for KumoMTA integration
	router.Route("/api/v1", func(r chi.Router) {
		// DKIM lookup for signing emails
		r.Get("/dkim/{domain}", h.DKIM.GetDKIM)

		// Auth validation for SMTP credentials
		r.Post("/auth/validate", h.Auth.ValidateAuth)

		// Domain validation for listener domains
		r.Get("/domains/validate-listener/{domain}", h.Domain.ValidateListenerDomain)

		// DMARC report reception
		r.Post("/dmarc/reports", h.DMARC.ReceiveDMARCReport)
	})

	// Health check endpoint (for local debugging)
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)

	// Apply defaults for hardening options
	idleTimeout := cfg.IdleTimeout
	if idleTimeout == 0 {
		idleTimeout = defaultIdleTimeout
	}
	maxHeaderBytes := cfg.MaxHeaderBytes
	if maxHeaderBytes == 0 {
		maxHeaderBytes = defaultMaxHeaderBytes
	}

	server := &http.Server{
		Addr:           addr,
		Handler:        router,
		ReadTimeout:    cfg.ReadTimeout,
		WriteTimeout:   cfg.WriteTimeout,
		IdleTimeout:    idleTimeout,
		MaxHeaderBytes: maxHeaderBytes,
	}

	return &Server{
		server:  server,
		router:  router,
		logger:  httpLogger,
		metrics: metrics,
		config:  cfg,
	}
}

// Start starts the HTTP server
func (s *Server) Start(ctx context.Context) error {
	s.logger.Info().
		Str("addr", s.server.Addr).
		Msg("starting HTTP server")

	// Start server in background
	errCh := make(chan error, 1)
	go func() {
		if err := s.server.ListenAndServe(); err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	// Wait for context cancellation or error
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return s.Shutdown()
	}
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	s.logger.Info().Msg("shutting down HTTP server")

	ctx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeout)
	defer cancel()

	if err := s.server.Shutdown(ctx); err != nil {
		s.logger.Error().Err(err).Msg("HTTP server shutdown error")
		return err
	}

	s.logger.Info().Msg("HTTP server stopped")
	return nil
}

// Router returns the chi router for testing
func (s *Server) Router() *chi.Mux {
	return s.router
}

// requestLogger returns a middleware that logs HTTP requests
func requestLogger(logger zerolog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap response writer to capture status code
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			duration := time.Since(start)

			logger.Debug().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", ww.Status()).
				Int("bytes", ww.BytesWritten()).
				Dur("duration_ms", duration).
				Str("remote_addr", r.RemoteAddr).
				Str("request_id", middleware.GetReqID(r.Context())).
				Msg("HTTP request")
		})
	}
}

// metricsMiddleware returns a middleware that records HTTP metrics
func metricsMiddleware(metrics *observability.Metrics) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap response writer to capture status code
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			duration := time.Since(start)

			if metrics != nil {
				// Get route pattern for metrics (to avoid high cardinality with path params)
				path := r.URL.Path
				if rctx := chi.RouteContext(r.Context()); rctx != nil {
					if pattern := rctx.RoutePattern(); pattern != "" {
						path = pattern
					}
				}

				statusCode := fmt.Sprintf("%d", ww.Status())
				metrics.HTTPRequestsTotal.WithLabelValues(r.Method, path, statusCode).Inc()
				metrics.HTTPRequestDuration.WithLabelValues(r.Method, path).Observe(duration.Seconds())
			}
		})
	}
}
