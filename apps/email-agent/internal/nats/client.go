// Package nats provides NATS client wrapper with JetStream support
package nats

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// Client wraps the NATS connection with JetStream support
type Client struct {
	conn    *nats.Conn
	js      nats.JetStreamContext
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// Config contains NATS client configuration
type Config struct {
	URLs          []string
	NKeyFile      string
	TLSEnabled    bool
	TLSCACert     string
	MaxReconnects int
	ReconnectWait time.Duration
}

// NewClient creates a new NATS client with JetStream
func NewClient(cfg Config, logger zerolog.Logger, metrics *observability.Metrics) (*Client, error) {
	natsLogger := logger.With().Str("component", "nats").Logger()

	// Build connection options
	opts := []nats.Option{
		nats.Name("kibamail-email-agent"),
		nats.MaxReconnects(cfg.MaxReconnects),
		nats.ReconnectWait(cfg.ReconnectWait),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			if err != nil {
				natsLogger.Warn().Err(err).Msg("NATS disconnected")
			}
			if metrics != nil {
				metrics.NATSConnectionStatus.Set(0)
			}
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			natsLogger.Info().Str("url", nc.ConnectedUrl()).Msg("NATS reconnected")
			if metrics != nil {
				metrics.NATSConnectionStatus.Set(1)
			}
		}),
		nats.ClosedHandler(func(nc *nats.Conn) {
			natsLogger.Info().Msg("NATS connection closed")
			if metrics != nil {
				metrics.NATSConnectionStatus.Set(0)
			}
		}),
	}

	// Configure NKey authentication
	if cfg.NKeyFile != "" {
		opt, err := nats.NkeyOptionFromSeed(cfg.NKeyFile)
		if err != nil {
			return nil, kiberrors.Wrap(err, "failed to load NKey")
		}
		opts = append(opts, opt)
	}

	// Configure TLS
	if cfg.TLSEnabled {
		tlsConfig, err := createTLSConfig(cfg)
		if err != nil {
			return nil, err
		}
		opts = append(opts, nats.Secure(tlsConfig))
	}

	// Connect to NATS (supports multiple URLs via comma-separated string)
	serverURLs := strings.Join(cfg.URLs, ",")

	nc, err := nats.Connect(serverURLs, opts...)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to connect to NATS")
	}

	natsLogger.Info().
		Str("url", nc.ConnectedUrl()).
		Bool("tls", cfg.TLSEnabled).
		Bool("nkey_auth", cfg.NKeyFile != "").
		Msg("connected to NATS")

	// Create JetStream context
	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, kiberrors.Wrap(err, "failed to create JetStream context")
	}

	// Set connection status metric
	if metrics != nil {
		metrics.NATSConnectionStatus.Set(1)
	}

	return &Client{
		conn:    nc,
		js:      js,
		logger:  natsLogger,
		metrics: metrics,
	}, nil
}

// JetStream returns the JetStream context
func (c *Client) JetStream() nats.JetStreamContext {
	return c.js
}

// Conn returns the underlying NATS connection
func (c *Client) Conn() *nats.Conn {
	return c.conn
}

// IsConnected returns true if connected to NATS
func (c *Client) IsConnected() bool {
	return c.conn != nil && c.conn.IsConnected()
}

// Close closes the NATS connection
func (c *Client) Close() error {
	if c.conn != nil {
		c.conn.Close()
		c.logger.Info().Msg("NATS connection closed")
	}
	return nil
}

// createTLSConfig creates TLS configuration for NATS
func createTLSConfig(cfg Config) (*tls.Config, error) {
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	// Load CA certificate
	if cfg.TLSCACert != "" {
		caCert, err := os.ReadFile(cfg.TLSCACert)
		if err != nil {
			return nil, kiberrors.Wrap(err, "failed to read CA certificate")
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA certificate")
		}

		tlsConfig.RootCAs = caCertPool
	}

	return tlsConfig, nil
}
