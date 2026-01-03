// Package config provides configuration management for the email-agent
package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
)

// Config holds all configuration for the email-agent
type Config struct {
	Agent      AgentConfig      `koanf:"agent"`
	NATS       NATSConfig       `koanf:"nats"`
	HTTP       HTTPConfig       `koanf:"http"`
	Redis      RedisConfig      `koanf:"redis"`
	S3         S3Config         `koanf:"s3"`
	KumoMTA    KumoMTAConfig    `koanf:"kumomta"`
	ControlAPI ControlAPIConfig `koanf:"control_api"`
	Worker     WorkerConfig     `koanf:"worker"`
	Metrics    MetricsConfig    `koanf:"metrics"`
	Health     HealthConfig     `koanf:"health"`
	OTel       OTelConfig       `koanf:"otel"`
}

// AgentConfig contains agent-specific configuration
type AgentConfig struct {
	Hostname  string `koanf:"hostname"`
	LogLevel  string `koanf:"log_level"`
	LogFormat string `koanf:"log_format"`
}

// NATSConfig contains NATS connection configuration
type NATSConfig struct {
	URLs          []string      `koanf:"urls"`
	NKeyFile      string        `koanf:"nkey_file"`
	TLSEnabled    bool          `koanf:"tls_enabled"`
	TLSCACert     string        `koanf:"tls_ca_cert"`
	TLSCert       string        `koanf:"tls_cert"` // Client certificate for mTLS
	TLSKey        string        `koanf:"tls_key"`  // Client key for mTLS
	MaxReconnects int           `koanf:"max_reconnects"`
	ReconnectWait time.Duration `koanf:"reconnect_wait"`
}

// HTTPConfig contains HTTP server configuration
type HTTPConfig struct {
	Host            string        `koanf:"host"`
	Port            int           `koanf:"port"`
	ReadTimeout     time.Duration `koanf:"read_timeout"`
	WriteTimeout    time.Duration `koanf:"write_timeout"`
	ShutdownTimeout time.Duration `koanf:"shutdown_timeout"`
}

// RedisConfig contains Redis connection configuration
type RedisConfig struct {
	Host        string        `koanf:"host"`
	Port        int           `koanf:"port"`
	Password    string        `koanf:"password"`
	DB          int           `koanf:"db"`
	DialTimeout time.Duration `koanf:"dial_timeout"`
	PoolSize    int           `koanf:"pool_size"`
}

// S3Config contains S3-compatible storage configuration
type S3Config struct {
	Endpoint        string `koanf:"endpoint"`
	Region          string `koanf:"region"`
	AccessKeyID     string `koanf:"access_key_id"`
	SecretAccessKey string `koanf:"secret_access_key"`
	Bucket          string `koanf:"bucket"`
	ForcePathStyle  bool   `koanf:"force_path_style"`
}

// KumoMTAConfig contains KumoMTA injection client configuration
type KumoMTAConfig struct {
	Endpoint           string        `koanf:"endpoint"`
	Timeout            time.Duration `koanf:"timeout"`
	MaxIdleConns       int           `koanf:"max_idle_conns"`
	MaxConnsPerHost    int           `koanf:"max_conns_per_host"`
	DeferredGeneration bool          `koanf:"deferred_generation"`
}

// ControlAPIConfig contains control plane API configuration
type ControlAPIConfig struct {
	BaseURL string        `koanf:"base_url"`
	APIKey  string        `koanf:"api_key"`
	Timeout time.Duration `koanf:"timeout"`
}

// WorkerConfig contains NATS consumer worker configuration
type WorkerConfig struct {
	StreamName    string        `koanf:"stream_name"`
	ConsumerName  string        `koanf:"consumer_name"`
	FilterSubject string        `koanf:"filter_subject"` // Consumer filter subject (must match server-side config)
	FetchBatch    int           `koanf:"fetch_batch"`
	FetchWorkers  int           `koanf:"fetch_workers"`
	AckTimeout    time.Duration `koanf:"ack_timeout"`
	MaxRetries    int           `koanf:"max_retries"`
}

// MetricsConfig contains Prometheus metrics configuration
type MetricsConfig struct {
	Enabled bool   `koanf:"enabled"`
	Port    int    `koanf:"port"`
	Path    string `koanf:"path"`
}

// HealthConfig contains health check configuration
type HealthConfig struct {
	Enabled       bool   `koanf:"enabled"`
	Port          int    `koanf:"port"`
	LivenessPath  string `koanf:"liveness_path"`
	ReadinessPath string `koanf:"readiness_path"`
}

// OTelConfig contains OpenTelemetry configuration
type OTelConfig struct {
	Enabled     bool   `koanf:"enabled"`
	Endpoint    string `koanf:"endpoint"`    // OTLP endpoint (e.g., localhost:4317)
	Insecure    bool   `koanf:"insecure"`    // Use insecure connection (no TLS)
	ServiceName string `koanf:"service_name"`
	Environment string `koanf:"environment"`
}

// DefaultConfig returns a config with sensible defaults
func DefaultConfig() *Config {
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	return &Config{
		Agent: AgentConfig{
			Hostname:  hostname,
			LogLevel:  "info",
			LogFormat: "json",
		},
		NATS: NATSConfig{
			URLs:          []string{"nats://localhost:4222"},
			MaxReconnects: -1, // infinite
			ReconnectWait: 2 * time.Second,
			TLSEnabled:    false,
		},
		HTTP: HTTPConfig{
			Host:            "127.0.0.1", // Local-only for KumoMTA
			Port:            8080,
			ReadTimeout:     30 * time.Second,
			WriteTimeout:    30 * time.Second,
			ShutdownTimeout: 30 * time.Second,
		},
		Redis: RedisConfig{
			Host:        "localhost",
			Port:        6379,
			DB:          0,
			DialTimeout: 5 * time.Second,
			PoolSize:    10,
		},
		S3: S3Config{
			Region:         "us-east-1",
			ForcePathStyle: true, // Required for S3-compatible services
		},
		KumoMTA: KumoMTAConfig{
			Endpoint:           "http://127.0.0.1:8000",
			Timeout:            30 * time.Second,
			MaxIdleConns:       100,
			MaxConnsPerHost:    100,
			DeferredGeneration: true,
		},
		ControlAPI: ControlAPIConfig{
			Timeout: 10 * time.Second,
		},
		Worker: WorkerConfig{
			StreamName:    "EMAILS",
			ConsumerName:  "email_agent_consumer",
			FilterSubject: "kibamail.emails.>", // Must match server-side consumer config
			FetchBatch:    100,                 // Fetch 100 messages at a time
			FetchWorkers:  30,                  // 30 concurrent fetchers for high throughput
			AckTimeout:    30 * time.Second,
			MaxRetries:    5,
		},
		Metrics: MetricsConfig{
			Enabled: true,
			Port:    9090,
			Path:    "/metrics",
		},
		Health: HealthConfig{
			Enabled:       true,
			Port:          8081,
			LivenessPath:  "/live",
			ReadinessPath: "/ready",
		},
		OTel: OTelConfig{
			Enabled:     false, // Disabled by default
			Endpoint:    "localhost:4317",
			Insecure:    true,
			ServiceName: "email-agent",
			Environment: "development",
		},
	}
}

// Load loads configuration from file and environment variables
func Load(configPath string) (*Config, error) {
	k := koanf.New(".")

	// Start with defaults
	cfg := DefaultConfig()

	// Load from config file if provided
	if configPath != "" {
		if err := k.Load(file.Provider(configPath), yaml.Parser()); err != nil {
			return nil, kiberrors.Wrap(err, "failed to load config file")
		}
	}

	// Load from environment variables (override file config)
	// Environment variables use KIBAMAIL_AGENT_ prefix and underscore delimiter
	// Example: KIBAMAIL_AGENT_LOG_LEVEL=debug
	if err := k.Load(env.Provider("KIBAMAIL_AGENT_", ".", func(s string) string {
		// Convert KIBAMAIL_AGENT_NATS_URLS to nats.urls
		return strings.Replace(strings.ToLower(
			strings.TrimPrefix(s, "KIBAMAIL_AGENT_")), "_", ".", -1)
	}), nil); err != nil {
		return nil, kiberrors.Wrap(err, "failed to load environment variables")
	}

	// Unmarshal into config struct
	if err := k.Unmarshal("", cfg); err != nil {
		return nil, kiberrors.Wrap(err, "failed to unmarshal config")
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Validate NATS configuration
	if len(c.NATS.URLs) == 0 {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "nats.urls is required")
	}

	// Validate TLS configuration for NATS
	if c.NATS.TLSEnabled {
		if c.NATS.TLSCACert == "" {
			return kiberrors.Wrap(kiberrors.ErrMissingRequired, "nats.tls_ca_cert is required when TLS is enabled")
		}
	}

	// Validate NKey file if specified
	if c.NATS.NKeyFile != "" {
		if _, err := os.Stat(c.NATS.NKeyFile); os.IsNotExist(err) {
			return kiberrors.Wrap(kiberrors.ErrMissingRequired,
				fmt.Sprintf("nats.nkey_file does not exist: %s", c.NATS.NKeyFile))
		}
	}

	// Validate HTTP configuration
	if c.HTTP.Port < 1 || c.HTTP.Port > 65535 {
		return kiberrors.Wrap(kiberrors.ErrInvalidConfig, "http.port must be between 1 and 65535")
	}

	// Validate worker configuration
	if c.Worker.StreamName == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "worker.stream_name is required")
	}

	if c.Worker.ConsumerName == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "worker.consumer_name is required")
	}

	if c.Worker.FetchBatch < 1 || c.Worker.FetchBatch > 500 {
		return kiberrors.Wrap(kiberrors.ErrInvalidConfig, "worker.fetch_batch must be between 1 and 500")
	}

	if c.Worker.FetchWorkers < 1 || c.Worker.FetchWorkers > 50 {
		return kiberrors.Wrap(kiberrors.ErrInvalidConfig, "worker.fetch_workers must be between 1 and 50")
	}

	// Validate control API configuration
	if c.ControlAPI.BaseURL == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "control_api.base_url is required")
	}

	if c.ControlAPI.APIKey == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "control_api.api_key is required")
	}

	// Validate S3 configuration
	if c.S3.Endpoint == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "s3.endpoint is required")
	}

	if c.S3.Bucket == "" {
		return kiberrors.Wrap(kiberrors.ErrMissingRequired, "s3.bucket is required")
	}

	return nil
}

// IsProduction returns true if this is a production configuration
func (c *Config) IsProduction() bool {
	return c.NATS.TLSEnabled && c.NATS.NKeyFile != ""
}
