// Package integration provides integration test utilities
package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/redis/go-redis/v9"

	"github.com/kibamail/email-agent/internal/domain"
	"github.com/kibamail/email-agent/internal/kumomta"
)

// TestConfig holds configuration for integration tests
type TestConfig struct {
	NATSURL      string
	RedisAddr    string
	MinioURL     string
	MinioAccess  string
	MinioSecret  string
	MinioBucket  string
	KumoMTAURL   string
}

// DefaultTestConfig returns the default test configuration
// matching docker-compose.test.yaml (uses non-standard ports to avoid conflicts)
func DefaultTestConfig() TestConfig {
	return TestConfig{
		NATSURL:      "nats://localhost:14222",
		RedisAddr:    "localhost:16379",
		MinioURL:     "http://localhost:19000",
		MinioAccess:  "minioadmin",
		MinioSecret:  "minioadmin",
		MinioBucket:  "test-bucket",
		KumoMTAURL:   "http://localhost:5680",
	}
}

// TestInfra holds test infrastructure connections
type TestInfra struct {
	Config   TestConfig
	NATS     *nats.Conn
	JS       jetstream.JetStream
	Redis    *redis.Client
	S3Client *s3.Client

	// Fake servers
	KumoMTA      *FakeKumoMTA
	ControlPlane *FakeControlPlane

	mu sync.Mutex
}

// NewTestInfra creates and connects to test infrastructure
func NewTestInfra(ctx context.Context, cfg TestConfig) (*TestInfra, error) {
	infra := &TestInfra{Config: cfg}

	// Connect to NATS
	nc, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}
	infra.NATS = nc

	// Get JetStream context
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("failed to create JetStream context: %w", err)
	}
	infra.JS = js

	// Connect to Redis
	infra.Redis = redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})
	if err := infra.Redis.Ping(ctx).Err(); err != nil {
		nc.Close()
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Create S3 client for MinIO
	s3Client, err := createS3Client(ctx, cfg)
	if err != nil {
		nc.Close()
		infra.Redis.Close()
		return nil, fmt.Errorf("failed to create S3 client: %w", err)
	}
	infra.S3Client = s3Client

	// Create fake servers
	infra.KumoMTA = NewFakeKumoMTA()
	infra.ControlPlane = NewFakeControlPlane()

	return infra, nil
}

// createS3Client creates an S3 client configured for MinIO
func createS3Client(ctx context.Context, cfg TestConfig) (*s3.Client, error) {
	customResolver := aws.EndpointResolverWithOptionsFunc(
		func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               cfg.MinioURL,
				HostnameImmutable: true,
			}, nil
		})

	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.MinioAccess,
			cfg.MinioSecret,
			"",
		)),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, err
	}

	return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	}), nil
}

// SetupStreams creates NATS streams for testing
func (t *TestInfra) SetupStreams(ctx context.Context) error {
	// Create EMAILS stream
	_, err := t.JS.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:        "EMAILS",
		Subjects:    []string{"kibamail.emails.>"},
		Retention:   jetstream.WorkQueuePolicy,
		MaxMsgs:     100000,
		MaxBytes:    1024 * 1024 * 100, // 100MB
		MaxAge:      time.Hour,
		Storage:     jetstream.MemoryStorage,
		Replicas:    1,
		Discard:     jetstream.DiscardOld,
		AllowDirect: true,
	})
	if err != nil {
		return fmt.Errorf("failed to create EMAILS stream: %w", err)
	}

	// Create EVENTS stream
	_, err = t.JS.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:        "EVENTS",
		Subjects:    []string{"kibamail.events.>"},
		Retention:   jetstream.LimitsPolicy,
		MaxMsgs:     100000,
		MaxBytes:    1024 * 1024 * 100, // 100MB
		MaxAge:      time.Hour,
		Storage:     jetstream.MemoryStorage,
		Replicas:    1,
		AllowDirect: true,
	})
	if err != nil {
		return fmt.Errorf("failed to create EVENTS stream: %w", err)
	}

	// Create consumer for EMAILS
	_, err = t.JS.CreateOrUpdateConsumer(ctx, "EMAILS", jetstream.ConsumerConfig{
		Name:          "email_agent_consumer",
		Durable:       "email_agent_consumer",
		FilterSubject: "kibamail.emails.>",
		AckPolicy:     jetstream.AckExplicitPolicy,
		MaxDeliver:    5,
		AckWait:       30 * time.Second,
		MaxAckPending: 10000,
	})
	if err != nil {
		return fmt.Errorf("failed to create consumer: %w", err)
	}

	return nil
}

// PublishEmail publishes an email message to NATS
func (t *TestInfra) PublishEmail(ctx context.Context, msg *domain.EmailMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	subject := fmt.Sprintf("kibamail.emails.%s", msg.TenantID)
	_, err = t.JS.Publish(ctx, subject, data)
	if err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	return nil
}

// UploadContent uploads email content to MinIO as separate HTML and text files
// The S3 client expects: contentKey/content.html and contentKey/content.txt
func (t *TestInfra) UploadContent(ctx context.Context, contentKey string, html, text string) error {
	// Upload HTML content
	if html != "" {
		htmlKey := contentKey + "/content.html"
		_, err := t.S3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(t.Config.MinioBucket),
			Key:         aws.String(htmlKey),
			Body:        strings.NewReader(html),
			ContentType: aws.String("text/html"),
		})
		if err != nil {
			return fmt.Errorf("failed to upload HTML content: %w", err)
		}
	}

	// Upload text content
	if text != "" {
		textKey := contentKey + "/content.txt"
		_, err := t.S3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(t.Config.MinioBucket),
			Key:         aws.String(textKey),
			Body:        strings.NewReader(text),
			ContentType: aws.String("text/plain"),
		})
		if err != nil {
			return fmt.Errorf("failed to upload text content: %w", err)
		}
	}

	return nil
}

// UploadAttachment uploads an attachment to MinIO
func (t *TestInfra) UploadAttachment(ctx context.Context, key string, data []byte, contentType string) error {
	_, err := t.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(t.Config.MinioBucket),
		Key:         aws.String(key),
		Body:        strings.NewReader(string(data)),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("failed to upload attachment: %w", err)
	}
	return nil
}

// Cleanup cleans up test resources
func (t *TestInfra) Cleanup(ctx context.Context) error {
	// Delete streams
	_ = t.JS.DeleteStream(ctx, "EMAILS")
	_ = t.JS.DeleteStream(ctx, "EVENTS")

	// Flush Redis
	_ = t.Redis.FlushDB(ctx)

	return nil
}

// Close closes all connections
func (t *TestInfra) Close() {
	if t.KumoMTA != nil {
		t.KumoMTA.Close()
	}
	if t.ControlPlane != nil {
		t.ControlPlane.Close()
	}
	if t.NATS != nil {
		t.NATS.Close()
	}
	if t.Redis != nil {
		t.Redis.Close()
	}
}

// FakeKumoMTA simulates the KumoMTA HTTP injection API
type FakeKumoMTA struct {
	Server   *httptest.Server
	Requests []kumomta.InjectRequest
	mu       sync.Mutex

	// Control behavior
	ShouldFail      bool
	FailureResponse *kumomta.InjectResponse
}

// NewFakeKumoMTA creates a new fake KumoMTA server
func NewFakeKumoMTA() *FakeKumoMTA {
	fake := &FakeKumoMTA{
		Requests: make([]kumomta.InjectRequest, 0),
	}

	fake.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fake.mu.Lock()
		defer fake.mu.Unlock()

		if r.URL.Path == "/api/inject/v1" && r.Method == "POST" {
			var req kumomta.InjectRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid request", http.StatusBadRequest)
				return
			}

			fake.Requests = append(fake.Requests, req)

			if fake.ShouldFail {
				resp := fake.FailureResponse
				if resp == nil {
					resp = &kumomta.InjectResponse{
						SuccessCount: 0,
						FailCount:    1,
						Errors: []kumomta.InjectError{
							{Code: "injection_failed", Message: "injection failed"},
						},
					}
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
				return
			}

			// Success response
			resp := kumomta.InjectResponse{
				SuccessCount: len(req.Recipients),
				FailCount:    0,
				IDs:          []string{"msg_" + fmt.Sprintf("%d", len(fake.Requests))},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}

		// Health check
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}

		http.NotFound(w, r)
	}))

	return fake
}

// GetRequests returns a copy of all received requests
func (f *FakeKumoMTA) GetRequests() []kumomta.InjectRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	result := make([]kumomta.InjectRequest, len(f.Requests))
	copy(result, f.Requests)
	return result
}

// Reset clears all recorded requests
func (f *FakeKumoMTA) Reset() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Requests = make([]kumomta.InjectRequest, 0)
	f.ShouldFail = false
	f.FailureResponse = nil
}

// Close shuts down the server
func (f *FakeKumoMTA) Close() {
	if f.Server != nil {
		f.Server.Close()
	}
}

// FakeControlPlane simulates the control plane API
type FakeControlPlane struct {
	Server  *httptest.Server
	Tenants map[string]*domain.ControlPlaneTenant
	mu      sync.Mutex
}

// NewFakeControlPlane creates a new fake control plane server
func NewFakeControlPlane() *FakeControlPlane {
	fake := &FakeControlPlane{
		Tenants: make(map[string]*domain.ControlPlaneTenant),
	}

	fake.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fake.mu.Lock()
		defer fake.mu.Unlock()

		// Check authorization
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-api-key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Handle GET /api/internal/v1/tenants/:tenantId
		if r.Method == "GET" {
			// Extract tenant ID from path
			// Path format: /api/internal/v1/tenants/{tenantId}
			var tenantID string
			_, err := fmt.Sscanf(r.URL.Path, "/api/internal/v1/tenants/%s", &tenantID)
			if err != nil {
				http.NotFound(w, r)
				return
			}

			tenant, ok := fake.Tenants[tenantID]
			if !ok {
				http.NotFound(w, r)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(tenant)
			return
		}

		http.NotFound(w, r)
	}))

	return fake
}

// AddTenant adds a tenant to the fake control plane
func (f *FakeControlPlane) AddTenant(tenant *domain.ControlPlaneTenant) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Tenants[tenant.ID] = tenant
}

// Reset clears all tenants
func (f *FakeControlPlane) Reset() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Tenants = make(map[string]*domain.ControlPlaneTenant)
}

// Close shuts down the server
func (f *FakeControlPlane) Close() {
	if f.Server != nil {
		f.Server.Close()
	}
}

// WebhookReceiver captures webhooks from KumoMTA for testing
type WebhookReceiver struct {
	server   *http.Server
	events   []domain.KumoMTAWebhook
	eventsCh chan domain.KumoMTAWebhook
	mu       sync.Mutex
	closed   bool
}

// NewWebhookReceiver creates a new webhook receiver listening on the specified port
func NewWebhookReceiver(port int) (*WebhookReceiver, error) {
	receiver := &WebhookReceiver{
		events:   make([]domain.KumoMTAWebhook, 0),
		eventsCh: make(chan domain.KumoMTAWebhook, 100),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webhooks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// KumoMTA log_hooks sends a single webhook object per request, not an array
		var webhook domain.KumoMTAWebhook
		if err := json.NewDecoder(r.Body).Decode(&webhook); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		receiver.mu.Lock()
		receiver.events = append(receiver.events, webhook)
		// Non-blocking send to channel
		select {
		case receiver.eventsCh <- webhook:
		default:
		}
		receiver.mu.Unlock()

		w.WriteHeader(http.StatusOK)
	})

	receiver.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	// Start server in background
	go func() {
		if err := receiver.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// Log error but don't panic - server might be shutting down
		}
	}()

	// Give the server a moment to start
	time.Sleep(100 * time.Millisecond)

	return receiver, nil
}

// WaitForEvent waits for an event matching the specified type with timeout
func (r *WebhookReceiver) WaitForEvent(eventType string, timeout time.Duration) (*domain.KumoMTAWebhook, error) {
	return r.WaitForEventWithRecipient(eventType, "", timeout)
}

// WaitForEventWithRecipient waits for an event matching the type and recipient
func (r *WebhookReceiver) WaitForEventWithRecipient(eventType string, recipient string, timeout time.Duration) (*domain.KumoMTAWebhook, error) {
	deadline := time.Now().Add(timeout)

	matches := func(event domain.KumoMTAWebhook) bool {
		if event.Type != eventType {
			return false
		}
		if recipient != "" && event.Recipient != recipient {
			return false
		}
		return true
	}

	for time.Now().Before(deadline) {
		select {
		case event := <-r.eventsCh:
			if matches(event) {
				return &event, nil
			}
			// Put back events that don't match
			r.mu.Lock()
			r.events = append(r.events, event)
			r.mu.Unlock()
		case <-time.After(100 * time.Millisecond):
			// Check existing events
			r.mu.Lock()
			for i, event := range r.events {
				if matches(event) {
					// Remove from events slice
					r.events = append(r.events[:i], r.events[i+1:]...)
					r.mu.Unlock()
					return &event, nil
				}
			}
			r.mu.Unlock()
		}
	}

	if recipient != "" {
		return nil, fmt.Errorf("timeout waiting for event type: %s with recipient: %s", eventType, recipient)
	}
	return nil, fmt.Errorf("timeout waiting for event type: %s", eventType)
}

// WaitForDelivery is a convenience method that waits for a Delivery event
func (r *WebhookReceiver) WaitForDelivery(timeout time.Duration) (*domain.KumoMTAWebhook, error) {
	return r.WaitForEvent("Delivery", timeout)
}

// WaitForDeliveryToRecipient waits for a Delivery event to a specific recipient
func (r *WebhookReceiver) WaitForDeliveryToRecipient(recipient string, timeout time.Duration) (*domain.KumoMTAWebhook, error) {
	return r.WaitForEventWithRecipient("Delivery", recipient, timeout)
}

// GetEvents returns a copy of all received events
func (r *WebhookReceiver) GetEvents() []domain.KumoMTAWebhook {
	r.mu.Lock()
	defer r.mu.Unlock()
	result := make([]domain.KumoMTAWebhook, len(r.events))
	copy(result, r.events)
	return result
}

// Reset clears all received events
func (r *WebhookReceiver) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = make([]domain.KumoMTAWebhook, 0)
	// Drain channel
	for len(r.eventsCh) > 0 {
		<-r.eventsCh
	}
}

// Close shuts down the webhook receiver
func (r *WebhookReceiver) Close() error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	r.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return r.server.Shutdown(ctx)
}
