// Package main provides the entry point for the email agent
package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"go.uber.org/fx"

	"github.com/kibamail/email-agent/internal/cache"
	"github.com/kibamail/email-agent/internal/config"
	agenthttp "github.com/kibamail/email-agent/internal/http"
	"github.com/kibamail/email-agent/internal/http/handlers"
	"github.com/kibamail/email-agent/internal/kumomta"
	agentnats "github.com/kibamail/email-agent/internal/nats"
	"github.com/kibamail/email-agent/internal/observability"
	"github.com/kibamail/email-agent/internal/processor"
	"github.com/kibamail/email-agent/internal/redis"
	"github.com/kibamail/email-agent/internal/s3"
)

var (
	version   = "dev"
	buildTime = "unknown"
)

func main() {
	configPath := flag.String("config", "", "Path to configuration file")
	showVersion := flag.Bool("version", false, "Show version information")
	flag.Parse()

	if *showVersion {
		fmt.Printf("email-agent version %s (built %s)\n", version, buildTime)
		os.Exit(0)
	}

	app := fx.New(
		// Supply configuration path
		fx.Supply(*configPath),

		// Core providers
		fx.Provide(
			loadConfig,
			newLogger,
			newOTelProvider,
			newRegistry,
			newMetrics,
			newHealthChecker,
		),

		// External clients
		fx.Provide(
			newNATSClient,
			newNATSConsumer,
			newNATSPublisher,
			newRedisClient,
			newDKIMCache,
			newMemoryCache,
			newS3Client,
			newKumoMTAClient,
			newControlPlaneClient,
		),

		// Handlers and processor
		fx.Provide(
			newTenantHandler,
			newWebhookHandler,
			newDKIMHandler,
			newAuthHandler,
			newDomainHandler,
			newDMARCHandler,
			newEmailProcessor,
			newHTTPServer,
		),

		// Start components
		fx.Invoke(startOTel),
		fx.Invoke(startMetricsServer),
		fx.Invoke(startHealthServer),
		fx.Invoke(startHTTPServer),
		fx.Invoke(startEmailConsumer),
		fx.Invoke(startSystemMetricsCollector),
	)

	app.Run()
}

// loadConfig loads the configuration from file and environment
func loadConfig(configPath string) (*config.Config, error) {
	return config.Load(configPath)
}

// newLogger creates a new logger
func newLogger(cfg *config.Config) zerolog.Logger {
	return observability.NewLogger(observability.LoggerConfig{
		Level:      cfg.Agent.LogLevel,
		Format:     cfg.Agent.LogFormat,
		Service:    "email-agent",
		Version:    version,
		TimeFormat: time.RFC3339,
	})
}

// newOTelProvider creates the OpenTelemetry provider
func newOTelProvider(cfg *config.Config, logger zerolog.Logger) (*observability.OTelProvider, error) {
	return observability.InitOTel(context.Background(), observability.OTelConfig{
		Enabled:     cfg.OTel.Enabled,
		Endpoint:    cfg.OTel.Endpoint,
		Insecure:    cfg.OTel.Insecure,
		ServiceName: cfg.OTel.ServiceName,
		Version:     version,
		Environment: cfg.OTel.Environment,
		Hostname:    cfg.Agent.Hostname,
	}, logger)
}

// startOTel registers the OTel shutdown hook
func startOTel(
	lc fx.Lifecycle,
	otelProvider *observability.OTelProvider,
	logger zerolog.Logger,
) {
	otelLogger := logger.With().Str("component", "otel").Logger()

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			otelLogger.Info().Msg("shutting down OpenTelemetry")
			return otelProvider.Shutdown(ctx)
		},
	})
}

// newRegistry creates a new Prometheus registry
func newRegistry() *prometheus.Registry {
	return prometheus.NewRegistry()
}

// newMetrics creates Prometheus metrics
func newMetrics(registry *prometheus.Registry) *observability.Metrics {
	return observability.NewMetrics(registry)
}

// newHealthChecker creates a health checker
func newHealthChecker(cfg *config.Config, logger zerolog.Logger) *observability.HealthChecker {
	return observability.NewHealthChecker(observability.HealthConfig{
		Port:          cfg.Health.Port,
		LivenessPath:  cfg.Health.LivenessPath,
		ReadinessPath: cfg.Health.ReadinessPath,
	}, logger)
}

// newNATSClient creates a NATS client
func newNATSClient(cfg *config.Config, logger zerolog.Logger, metrics *observability.Metrics) (*agentnats.Client, error) {
	return agentnats.NewClient(agentnats.Config{
		URLs:          cfg.NATS.URLs,
		NKeyFile:      cfg.NATS.NKeyFile,
		TLSEnabled:    cfg.NATS.TLSEnabled,
		TLSCACert:     cfg.NATS.TLSCACert,
		TLSCert:       cfg.NATS.TLSCert,
		TLSKey:        cfg.NATS.TLSKey,
		MaxReconnects: cfg.NATS.MaxReconnects,
		ReconnectWait: cfg.NATS.ReconnectWait,
	}, logger, metrics)
}

// newNATSConsumer creates a NATS consumer
func newNATSConsumer(
	client *agentnats.Client,
	cfg *config.Config,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) (*agentnats.Consumer, error) {
	return agentnats.NewConsumer(
		client.JetStream(),
		agentnats.ConsumerConfig{
			StreamName:    cfg.Worker.StreamName,
			ConsumerName:  cfg.Worker.ConsumerName,
			FilterSubject: cfg.Worker.FilterSubject,
			FetchBatch:    cfg.Worker.FetchBatch,
			FetchWorkers:  cfg.Worker.FetchWorkers,
		},
		logger,
		metrics,
	)
}

// newNATSPublisher creates a NATS publisher
func newNATSPublisher(
	client *agentnats.Client,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *agentnats.Publisher {
	return agentnats.NewPublisher(client.JetStream(), logger, metrics)
}

// newRedisClient creates a Redis client
func newRedisClient(cfg *config.Config, logger zerolog.Logger, metrics *observability.Metrics) (*redis.Client, error) {
	return redis.NewClient(redis.Config{
		Host:        cfg.Redis.Host,
		Port:        cfg.Redis.Port,
		Password:    cfg.Redis.Password,
		DB:          cfg.Redis.DB,
		DialTimeout: cfg.Redis.DialTimeout,
		PoolSize:    cfg.Redis.PoolSize,
	}, logger, metrics)
}

// newDKIMCache creates a DKIM cache
func newDKIMCache(client *redis.Client, logger zerolog.Logger) *redis.DKIMCache {
	return redis.NewDKIMCache(client, logger, 5*time.Minute)
}

// newMemoryCache creates an in-memory cache for sensitive data
func newMemoryCache() *cache.MemoryCache {
	return cache.NewMemoryCache(cache.DefaultMemoryCacheConfig())
}

// newS3Client creates an S3 client
func newS3Client(cfg *config.Config, logger zerolog.Logger, metrics *observability.Metrics) (*s3.Client, error) {
	return s3.NewClient(s3.Config{
		Endpoint:        cfg.S3.Endpoint,
		Region:          cfg.S3.Region,
		AccessKeyID:     cfg.S3.AccessKeyID,
		SecretAccessKey: cfg.S3.SecretAccessKey,
		Bucket:          cfg.S3.Bucket,
		ForcePathStyle:  cfg.S3.ForcePathStyle,
	}, logger, metrics)
}

// newKumoMTAClient creates a KumoMTA client
func newKumoMTAClient(cfg *config.Config, logger zerolog.Logger, metrics *observability.Metrics) *kumomta.Client {
	return kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTA.Endpoint,
		Timeout:            cfg.KumoMTA.Timeout,
		MaxIdleConns:       cfg.KumoMTA.MaxIdleConns,
		MaxConnsPerHost:    cfg.KumoMTA.MaxConnsPerHost,
		DeferredGeneration: cfg.KumoMTA.DeferredGeneration,
	}, logger, metrics)
}

// newControlPlaneClient creates a control plane API client with connection pooling
func newControlPlaneClient(cfg *config.Config, logger zerolog.Logger, metrics *observability.Metrics) *handlers.ControlPlaneAPIClient {
	return handlers.NewControlPlaneAPIClient(
		handlers.ControlPlaneAPIConfig{
			BaseURL:         cfg.ControlAPI.BaseURL,
			APIKey:          cfg.ControlAPI.APIKey,
			Timeout:         cfg.ControlAPI.Timeout,
			MaxIdleConns:    100,
			MaxConnsPerHost: 100,
		},
		logger,
		metrics,
	)
}

// newTenantHandler creates a tenant handler
func newTenantHandler(
	redisCache *redis.DKIMCache,
	api *handlers.ControlPlaneAPIClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.TenantHandler {
	return handlers.NewTenantHandler(redisCache, api, logger, metrics)
}

// newWebhookHandler creates a webhook handler
func newWebhookHandler(
	publisher *agentnats.Publisher,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.WebhookHandler {
	return handlers.NewWebhookHandler(publisher, logger, metrics)
}

// newDKIMHandler creates a DKIM handler
func newDKIMHandler(
	memCache *cache.MemoryCache,
	api *handlers.ControlPlaneAPIClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.DKIMHandler {
	return handlers.NewDKIMHandler(memCache, api, logger, metrics)
}

// newAuthHandler creates an auth handler
func newAuthHandler(
	memCache *cache.MemoryCache,
	api *handlers.ControlPlaneAPIClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.AuthHandler {
	return handlers.NewAuthHandler(memCache, api, logger, metrics)
}

// newDomainHandler creates a domain handler
func newDomainHandler(
	memCache *cache.MemoryCache,
	api *handlers.ControlPlaneAPIClient,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.DomainHandler {
	return handlers.NewDomainHandler(memCache, api, logger, metrics)
}

// newDMARCHandler creates a DMARC handler
func newDMARCHandler(
	publisher *agentnats.Publisher,
	s3Client *s3.Client,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *handlers.DMARCHandler {
	storage := handlers.NewS3Adapter(s3Client)
	return handlers.NewDMARCHandler(publisher, storage, logger, metrics)
}

// newEmailProcessor creates an email processor
func newEmailProcessor(
	s3Client *s3.Client,
	kumoClient *kumomta.Client,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *processor.EmailProcessor {
	return processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)
}

// newHTTPServer creates the HTTP server
func newHTTPServer(
	cfg *config.Config,
	tenantHandler *handlers.TenantHandler,
	webhookHandler *handlers.WebhookHandler,
	dkimHandler *handlers.DKIMHandler,
	authHandler *handlers.AuthHandler,
	domainHandler *handlers.DomainHandler,
	dmarcHandler *handlers.DMARCHandler,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *agenthttp.Server {
	return agenthttp.NewServer(
		agenthttp.ServerConfig{
			Host:            cfg.HTTP.Host,
			Port:            cfg.HTTP.Port,
			ReadTimeout:     cfg.HTTP.ReadTimeout,
			WriteTimeout:    cfg.HTTP.WriteTimeout,
			ShutdownTimeout: cfg.HTTP.ShutdownTimeout,
		},
		agenthttp.ServerHandlers{
			Tenant:  tenantHandler,
			Webhook: webhookHandler,
			DKIM:    dkimHandler,
			Auth:    authHandler,
			Domain:  domainHandler,
			DMARC:   dmarcHandler,
		},
		logger,
		metrics,
	)
}

// startMetricsServer starts the Prometheus metrics server
func startMetricsServer(
	lc fx.Lifecycle,
	cfg *config.Config,
	registry *prometheus.Registry,
	logger zerolog.Logger,
) {
	if !cfg.Metrics.Enabled {
		return
	}

	metricsLogger := logger.With().Str("component", "metrics").Logger()

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Metrics.Port),
		Handler:      promhttp.HandlerFor(registry, promhttp.HandlerOpts{}),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			metricsLogger.Info().
				Int("port", cfg.Metrics.Port).
				Str("path", cfg.Metrics.Path).
				Msg("starting metrics server")

			go func() {
				if err := server.ListenAndServe(); err != http.ErrServerClosed {
					metricsLogger.Error().Err(err).Msg("metrics server error")
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			metricsLogger.Info().Msg("stopping metrics server")
			return server.Shutdown(ctx)
		},
	})
}

// startHealthServer starts the health check server
func startHealthServer(
	lc fx.Lifecycle,
	cfg *config.Config,
	healthChecker *observability.HealthChecker,
	natsClient *agentnats.Client,
	redisClient *redis.Client,
	kumoClient *kumomta.Client,
	s3Client *s3.Client,
	logger zerolog.Logger,
) {
	if !cfg.Health.Enabled {
		return
	}

	// Add readiness checks
	healthChecker.AddReadinessCheck("nats", observability.NATSCheck(natsClient.IsConnected))
	healthChecker.AddReadinessCheck("redis", observability.RedisCheck(redisClient.Ping))
	healthChecker.AddReadinessCheck("kumomta", observability.KumoMTACheck(kumoClient.HealthCheck))
	healthChecker.AddReadinessCheck("s3", observability.S3Check(s3Client.HealthCheck))

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			// Use background context - the startup context expires after 15s
			go func() {
				if err := healthChecker.Start(context.Background()); err != nil {
					logger.Error().Err(err).Msg("health server error")
				}
			}()
			return nil
		},
	})
}

// startHTTPServer starts the main HTTP server
func startHTTPServer(
	lc fx.Lifecycle,
	server *agenthttp.Server,
	logger zerolog.Logger,
) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			// Use background context - the startup context expires after 15s
			go func() {
				if err := server.Start(context.Background()); err != nil {
					logger.Error().Err(err).Msg("HTTP server error")
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return server.Shutdown()
		},
	})
}

// startEmailConsumer starts the NATS email consumer
func startEmailConsumer(
	lc fx.Lifecycle,
	consumer *agentnats.Consumer,
	proc *processor.EmailProcessor,
	logger zerolog.Logger,
) {
	consumerLogger := logger.With().Str("component", "email-consumer").Logger()

	// Wrap processor handler to adapt between nats.Message and processor.Message
	// Both interfaces are identical but Go requires explicit type matching
	handler := func(ctx context.Context, msg agentnats.Message) error {
		return proc.HandleMessage(ctx, msg)
	}

	// Create a context that lives for the duration of the app, not just startup
	var consumerCtx context.Context
	var consumerCancel context.CancelFunc

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			consumerLogger.Info().Msg("starting email consumer")

			// Use a background context for the consumer, not the startup context
			// The startup context (ctx) has a 15s timeout which would kill the consumer
			consumerCtx, consumerCancel = context.WithCancel(context.Background())

			go func() {
				if err := consumer.Start(consumerCtx, handler); err != nil {
					consumerLogger.Error().Err(err).Msg("email consumer error")
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			consumerLogger.Info().Msg("stopping email consumer")
			if consumerCancel != nil {
				consumerCancel()
			}
			return consumer.Stop(ctx)
		},
	})
}

// startSystemMetricsCollector starts the system metrics collector
func startSystemMetricsCollector(
	lc fx.Lifecycle,
	metrics *observability.Metrics,
	consumer *agentnats.Consumer,
	logger zerolog.Logger,
) {
	metricsLogger := logger.With().Str("component", "system-metrics").Logger()

	// Create a context for the metrics collector that lives for the app duration
	var metricsCtx context.Context
	var metricsCancel context.CancelFunc

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			// Use background context - startup context expires after 15s
			metricsCtx, metricsCancel = context.WithCancel(context.Background())

			go func() {
				ticker := time.NewTicker(15 * time.Second)
				defer ticker.Stop()

				for {
					select {
					case <-metricsCtx.Done():
						return
					case <-ticker.C:
						// Collect goroutine count
						metrics.GoroutinesTotal.Set(float64(runtime.NumGoroutine()))

						// Collect memory usage
						var m runtime.MemStats
						runtime.ReadMemStats(&m)
						metrics.MemoryUsageBytes.Set(float64(m.Alloc))
						metrics.MemoryAllocBytes.Set(float64(m.TotalAlloc))
						metrics.MemoryHeapObjects.Set(float64(m.HeapObjects))

						// Record GC pause if available
						if m.NumGC > 0 && m.PauseNs[0] > 0 {
							metrics.GCPauseSeconds.Observe(float64(m.PauseNs[0]) / 1e9)
						}

						// Collect consumer lag metrics
						consumer.CollectLagMetrics()

						metricsLogger.Debug().
							Int("goroutines", runtime.NumGoroutine()).
							Uint64("memory_bytes", m.Alloc).
							Uint64("heap_objects", m.HeapObjects).
							Msg("collected system metrics")
					}
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			if metricsCancel != nil {
				metricsCancel()
			}
			return nil
		},
	})
}
