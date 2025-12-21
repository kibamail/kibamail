// Package kumomta provides client for KumoMTA email injection API
package kumomta

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog"
	"github.com/sony/gobreaker"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// maxResponseBodySize limits the size of response bodies to prevent memory exhaustion
const maxResponseBodySize = 5 << 20 // 5MB

// Config contains KumoMTA client configuration
type Config struct {
	Endpoint           string
	Timeout            time.Duration
	MaxIdleConns       int
	MaxConnsPerHost    int
	DeferredGeneration bool
}

// Client wraps the KumoMTA HTTP client with circuit breaker
type Client struct {
	httpClient *http.Client
	endpoint   string
	breaker    *gobreaker.CircuitBreaker
	logger     zerolog.Logger
	metrics    *observability.Metrics
	config     Config
}

// NewClient creates a new KumoMTA client
func NewClient(cfg Config, logger zerolog.Logger, metrics *observability.Metrics) *Client {
	kumoLogger := logger.With().Str("component", "kumomta").Logger()

	// Configure HTTP client with connection pooling
	transport := &http.Transport{
		MaxIdleConns:        cfg.MaxIdleConns,
		MaxConnsPerHost:     cfg.MaxConnsPerHost,
		MaxIdleConnsPerHost: cfg.MaxConnsPerHost,
		IdleConnTimeout:     90 * time.Second,
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
	}

	// Configure circuit breaker
	cbSettings := gobreaker.Settings{
		Name:        "kumomta",
		MaxRequests: 2,                // Allow 2 requests when half-open
		Interval:    10 * time.Second, // Reset window
		Timeout:     30 * time.Second, // Open -> half-open timeout
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			kumoLogger.Warn().
				Str("from", from.String()).
				Str("to", to.String()).
				Msg("circuit breaker state changed")

			if metrics != nil {
				stateVal := float64(0)
				switch to {
				case gobreaker.StateOpen:
					stateVal = 1
				case gobreaker.StateHalfOpen:
					stateVal = 2
				}
				metrics.CircuitBreakerState.WithLabelValues("kumomta").Set(stateVal)

				if to == gobreaker.StateOpen {
					metrics.CircuitBreakerTrips.WithLabelValues("kumomta").Inc()
				}
			}
		},
	}

	breaker := gobreaker.NewCircuitBreaker(cbSettings)

	kumoLogger.Info().
		Str("endpoint", cfg.Endpoint).
		Dur("timeout", cfg.Timeout).
		Msg("KumoMTA client initialized")

	return &Client{
		httpClient: httpClient,
		endpoint:   cfg.Endpoint,
		breaker:    breaker,
		logger:     kumoLogger,
		metrics:    metrics,
		config:     cfg,
	}
}

// InjectRequest represents a KumoMTA injection request
type InjectRequest struct {
	EnvelopeSender     string            `json:"envelope_sender"`
	Content            ContentBuilder    `json:"content"`
	Recipients         []Recipient       `json:"recipients"`
	DeferredGeneration bool              `json:"deferred_generation,omitempty"`
	DeferredSpool      bool              `json:"deferred_spool,omitempty"`
	TraceHeaders       *TraceHeaders     `json:"trace_headers,omitempty"`
}

// ContentBuilder represents the email content
type ContentBuilder struct {
	HTMLBody    string            `json:"html_body,omitempty"`
	TextBody    string            `json:"text_body,omitempty"`
	From        EmailAddress      `json:"from"`
	Subject     string            `json:"subject"`
	ReplyTo     *EmailAddress     `json:"reply_to,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Attachments []Attachment      `json:"attachments,omitempty"`
}

// EmailAddress represents an email address with optional name
type EmailAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

// Recipient represents an email recipient
type Recipient struct {
	Email         string                 `json:"email"`
	Name          string                 `json:"name,omitempty"`
	Substitutions map[string]interface{} `json:"substitutions,omitempty"`
}

// TraceHeaders configures trace header generation
type TraceHeaders struct {
	SupplementalHeader bool     `json:"supplemental_header"`
	HeaderName         string   `json:"header_name"`
	IncludeMetaNames   []string `json:"include_meta_names,omitempty"`
}

// Attachment represents an email attachment
type Attachment struct {
	Data        string `json:"data"`                  // Attachment data (base64 encoded if Base64=true)
	Base64      bool   `json:"base64"`                // Whether data is base64 encoded
	ContentType string `json:"content_type"`          // MIME type
	FileName    string `json:"file_name,omitempty"`   // Optional file name
	ContentID   string `json:"content_id,omitempty"`  // Optional Content-ID for inline images
}

// InjectResponse represents the KumoMTA injection response
type InjectResponse struct {
	SuccessCount int           `json:"success_count"`
	FailCount    int           `json:"fail_count"`
	Errors       []InjectError `json:"errors,omitempty"`
	IDs          []string      `json:"ids,omitempty"`
}

// InjectError represents an injection error
type InjectError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Inject sends an email through KumoMTA
func (c *Client) Inject(ctx context.Context, req *InjectRequest) (*InjectResponse, error) {
	start := time.Now()

	// Apply default settings
	req.DeferredGeneration = c.config.DeferredGeneration

	result, err := c.breaker.Execute(func() (interface{}, error) {
		return c.doInject(ctx, req)
	})

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.KumoMTALatency.Observe(duration.Seconds())
	}

	if err != nil {
		if err == gobreaker.ErrOpenState || err == gobreaker.ErrTooManyRequests {
			return nil, kiberrors.Mark(kiberrors.ErrKumoMTAUnavailable, kiberrors.ErrTransient)
		}
		return nil, err
	}

	resp := result.(*InjectResponse)

	// Update metrics
	if c.metrics != nil {
		c.metrics.KumoMTAInjections.Inc()
		if resp.FailCount > 0 {
			c.metrics.KumoMTAInjectionErrors.Add(float64(resp.FailCount))
		}
	}

	return resp, nil
}

// doInject performs the actual HTTP request
func (c *Client) doInject(ctx context.Context, req *InjectRequest) (*InjectResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to marshal request")
	}

	// Track request size for metrics
	if c.metrics != nil {
		c.metrics.KumoMTARequestBytes.Add(float64(len(body)))
		c.metrics.KumoMTAActiveRequests.Inc()
		defer c.metrics.KumoMTAActiveRequests.Dec()
	}

	url := c.endpoint + "/api/inject/v1"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to create request")
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, kiberrors.Mark(
			kiberrors.Wrap(err, "HTTP request failed"),
			kiberrors.ErrTransient,
		)
	}
	// Ensure body is fully drained and closed to allow connection reuse
	defer func() {
		// Drain any remaining body to enable connection reuse
		io.Copy(io.Discard, io.LimitReader(resp.Body, maxResponseBodySize))
		resp.Body.Close()
	}()

	if resp.StatusCode >= 500 {
		return nil, kiberrors.Mark(
			kiberrors.Newf("KumoMTA server error: %d", resp.StatusCode),
			kiberrors.ErrTransient,
		)
	}

	if resp.StatusCode >= 400 {
		return nil, kiberrors.Mark(
			kiberrors.Newf("KumoMTA client error: %d", resp.StatusCode),
			kiberrors.ErrPermanent,
		)
	}

	// Limit response body size to prevent memory exhaustion
	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	var result InjectResponse
	if err := json.NewDecoder(limitedReader).Decode(&result); err != nil {
		return nil, kiberrors.Wrap(err, "failed to decode response")
	}

	return &result, nil
}

// HealthCheck performs a health check on KumoMTA
func (c *Client) HealthCheck(ctx context.Context) error {
	// Use a simple GET request to check connectivity
	req, err := http.NewRequestWithContext(ctx, "GET", c.endpoint+"/api/admin/bounce/v1", nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	// Drain and close body to allow connection reuse
	defer func() {
		io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		resp.Body.Close()
	}()

	// Any response (even 404) indicates KumoMTA is reachable
	return nil
}
