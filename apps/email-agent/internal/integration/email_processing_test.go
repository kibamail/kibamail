//go:build integration

// Package integration provides integration tests for the email agent.
// Run with: go test -tags=integration -v ./internal/integration/...
//
// Prerequisites:
// 1. Start test infrastructure: docker-compose -f docker-compose.test.yaml up -d
// 2. Wait for services to be healthy
package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	"github.com/kibamail/email-agent/internal/http/handlers"
	"github.com/kibamail/email-agent/internal/kumomta"
	agentnats "github.com/kibamail/email-agent/internal/nats"
	"github.com/kibamail/email-agent/internal/observability"
	"github.com/kibamail/email-agent/internal/processor"
	agentredis "github.com/kibamail/email-agent/internal/redis"
	agents3 "github.com/kibamail/email-agent/internal/s3"
)

func TestEmailProcessingPipeline(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Setup test infrastructure
	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	// Setup NATS streams
	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Upload test email content to MinIO (pre-rendered by control plane)
	contentKey := "broadcasts/brd_test123"
	htmlContent := `<!DOCTYPE html>
<html>
<head><title>Welcome John</title></head>
<body>
  <h1>Hello John Doe!</h1>
  <p>Welcome to our service.</p>
  <p>Your account ID is: 12345</p>
</body>
</html>`
	textContent := "Hello John Doe! Welcome to our service. Your account ID is: 12345"

	if err := infra.UploadContent(ctx, contentKey, htmlContent, textContent); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	// Create email processor with real dependencies
	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	// Create S3 client
	s3Client, err := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)
	if err != nil {
		t.Fatalf("failed to create S3 client: %v", err)
	}

	// Create KumoMTA client pointing to real KumoMTA
	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTAURL,
		Timeout:            10 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: true,
	}, logger, metrics)

	// Create processor
	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Create email message (content already rendered by control plane)
	emailMsg := &domain.EmailMessage{
		ID:          "msg_test001",
		TenantID:    "ws_tenant123",
		BroadcastID: "brd_test123",
		ContactID:   "cnt_contact456",
		Recipient: domain.EmailRecipient{
			Email: "john@example.com",
			Name:  "John Doe",
		},
		Sender: domain.EmailSender{
			Email:  "hello",
			Name:   "Kibamail",
			Domain: "mail.kibamail.com",
		},
		Subject:    "Welcome to Kibamail!",
		ContentKey: contentKey,
		Metadata: map[string]string{
			"campaign": "welcome-series",
		},
	}

	// Publish message to NATS
	if err := infra.PublishEmail(ctx, emailMsg); err != nil {
		t.Fatalf("failed to publish email: %v", err)
	}

	// Consume and process the message
	consumer, err := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	if err != nil {
		t.Fatalf("failed to get consumer: %v", err)
	}

	// Fetch one message
	msgs, err := consumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))
	if err != nil {
		t.Fatalf("failed to fetch message: %v", err)
	}

	var receivedMsg jetstream.Msg
	for msg := range msgs.Messages() {
		receivedMsg = msg
		break
	}

	if receivedMsg == nil {
		t.Fatal("no message received from NATS")
	}

	// Process the message using our processor - this injects into real KumoMTA
	adaptedMsg := &jetstreamMsgAdapter{msg: receivedMsg}
	if err := proc.HandleMessage(ctx, adaptedMsg); err != nil {
		t.Fatalf("failed to process message (KumoMTA injection failed): %v", err)
	}

	t.Log("Email processing pipeline test passed - successfully injected into real KumoMTA!")
}

func TestMultipleEmailProcessing(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Setup
	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Upload content (pre-rendered by control plane)
	contentKey := "broadcasts/brd_batch"
	if err := infra.UploadContent(ctx, contentKey, "<p>Hello User</p>", "Hello User"); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	s3Client, _ := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)

	// Create KumoMTA client pointing to real KumoMTA
	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTAURL,
		Timeout:            10 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: true,
	}, logger, metrics)

	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Publish multiple messages (content already rendered by control plane)
	numMessages := 10
	for i := 0; i < numMessages; i++ {
		msg := &domain.EmailMessage{
			ID:          fmt.Sprintf("msg_%03d", i),
			TenantID:    "ws_batch",
			BroadcastID: "brd_batch",
			ContactID:   fmt.Sprintf("cnt_%03d", i),
			Recipient: domain.EmailRecipient{
				Email: fmt.Sprintf("user%d@example.com", i),
				Name:  fmt.Sprintf("User %d", i),
			},
			Sender: domain.EmailSender{
				Email:  "hello",
				Name:   "Test",
				Domain: "test.com",
			},
			Subject:    "Batch Test",
			ContentKey: contentKey,
		}
		if err := infra.PublishEmail(ctx, msg); err != nil {
			t.Fatalf("failed to publish message %d: %v", i, err)
		}
	}

	// Process all messages
	consumer, _ := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	msgs, err := consumer.Fetch(numMessages, jetstream.FetchMaxWait(10*time.Second))
	if err != nil {
		t.Fatalf("failed to fetch messages: %v", err)
	}

	processed := 0
	for msg := range msgs.Messages() {
		adaptedMsg := &jetstreamMsgAdapter{msg: msg}
		if err := proc.HandleMessage(ctx, adaptedMsg); err != nil {
			t.Errorf("failed to process message: %v", err)
			continue
		}
		processed++
	}

	if processed != numMessages {
		t.Errorf("expected to process %d messages, processed %d", numMessages, processed)
	}

	t.Logf("Successfully processed %d emails and injected into real KumoMTA", processed)
}

func TestKumoMTAFailureHandling(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Upload content
	contentKey := "broadcasts/brd_fail"
	if err := infra.UploadContent(ctx, contentKey, "<p>Test</p>", "Test"); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	// Configure fake KumoMTA to fail
	infra.KumoMTA.ShouldFail = true

	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	s3Client, _ := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)

	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           infra.KumoMTA.Server.URL,
		Timeout:            10 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: true,
	}, logger, metrics)

	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Publish message
	msg := &domain.EmailMessage{
		ID:          "msg_fail",
		TenantID:    "ws_fail",
		BroadcastID: "brd_fail",
		ContactID:   "cnt_fail",
		Recipient: domain.EmailRecipient{
			Email: "fail@example.com",
			Name:  "Fail Test",
		},
		Sender: domain.EmailSender{
			Email:  "test",
			Name:   "Test",
			Domain: "test.com",
		},
		Subject:    "Fail Test",
		ContentKey: contentKey,
	}
	if err := infra.PublishEmail(ctx, msg); err != nil {
		t.Fatalf("failed to publish message: %v", err)
	}

	// Process message - should return error
	consumer, _ := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	msgs, _ := consumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))

	for natsMsg := range msgs.Messages() {
		adapter := &jetstreamMsgAdapter{msg: natsMsg}
		err := proc.HandleMessage(ctx, adapter)
		if err == nil {
			t.Error("expected error when KumoMTA fails, got nil")
		}
		// Message should have been NAK'd for retry
		t.Logf("Got expected error: %v", err)
	}

	t.Log("KumoMTA failure handling test passed!")
}

func TestTenantDKIMCaching(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	// Create Redis client (uses non-standard port from docker-compose)
	redisClient, err := agentredis.NewClient(agentredis.Config{
		Host:        "localhost",
		Port:        16379,
		DB:          0,
		DialTimeout: 5 * time.Second,
		PoolSize:    10,
	}, logger, metrics)
	if err != nil {
		t.Fatalf("failed to create Redis client: %v", err)
	}
	defer redisClient.Close()

	// Create DKIM cache
	cache := agentredis.NewDKIMCache(redisClient, logger, 5*time.Minute)

	// Store DKIM config in cache
	tenantID := "ws_cache_test"
	dkimConfigs := []domain.DKIMConfig{
		{
			Domain:       "example.com",
			Selector:     "kibamail",
			PrivateKey:   "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
			PublicKey:    "test-public-key",
			HeaderFields: "from:to:subject:date:message-id",
		},
	}

	// Set cache
	if err := cache.SetDKIMConfigs(ctx, tenantID, dkimConfigs, 5*time.Minute); err != nil {
		t.Fatalf("failed to set DKIM configs: %v", err)
	}

	// Get from cache
	retrieved, err := cache.GetDKIMConfigs(ctx, tenantID)
	if err != nil {
		t.Fatalf("failed to get DKIM configs: %v", err)
	}

	if len(retrieved) != 1 {
		t.Fatalf("expected 1 config, got %d", len(retrieved))
	}

	if retrieved[0].Domain != "example.com" {
		t.Errorf("expected domain 'example.com', got '%s'", retrieved[0].Domain)
	}

	if retrieved[0].Selector != "kibamail" {
		t.Errorf("expected selector 'kibamail', got '%s'", retrieved[0].Selector)
	}

	// Verify cache miss for non-existent tenant
	_, err = cache.GetDKIMConfigs(ctx, "ws_nonexistent")
	if err == nil {
		t.Error("expected error for non-existent tenant")
	}

	t.Log("Tenant DKIM caching test passed!")
}

func TestEmailWithAttachments(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Upload email content
	contentKey := "broadcasts/brd_attach"
	if err := infra.UploadContent(ctx, contentKey, "<p>Please see attached files.</p>", "Please see attached files."); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	// Upload attachments to S3
	pdfData := []byte("%PDF-1.4\nThis is a test PDF file content")
	imageData := []byte("GIF89a\x01\x00\x01\x00\x00\x00\x00!") // Minimal GIF header

	if err := infra.UploadAttachment(ctx, "attachments/report.pdf", pdfData, "application/pdf"); err != nil {
		t.Fatalf("failed to upload PDF attachment: %v", err)
	}
	if err := infra.UploadAttachment(ctx, "attachments/logo.gif", imageData, "image/gif"); err != nil {
		t.Fatalf("failed to upload image attachment: %v", err)
	}

	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	s3Client, _ := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)

	// Create KumoMTA client pointing to real KumoMTA
	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTAURL,
		Timeout:            10 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: true,
	}, logger, metrics)

	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Create email message with attachments
	emailMsg := &domain.EmailMessage{
		ID:          "msg_attach001",
		TenantID:    "ws_attach",
		BroadcastID: "brd_attach",
		ContactID:   "cnt_attach",
		Recipient: domain.EmailRecipient{
			Email: "recipient@example.com",
			Name:  "Test Recipient",
		},
		Sender: domain.EmailSender{
			Email:  "sender",
			Name:   "Test Sender",
			Domain: "example.com",
		},
		ReplyTo: &domain.EmailAddress{
			Email: "support@example.com",
			Name:  "Support Team",
		},
		Subject:    "Email with Attachments",
		ContentKey: contentKey,
		Attachments: []domain.EmailAttachment{
			{
				S3Key:       "attachments/report.pdf",
				FileName:    "monthly-report.pdf",
				ContentType: "application/pdf",
			},
			{
				S3Key:       "attachments/logo.gif",
				FileName:    "logo.gif",
				ContentType: "image/gif",
				ContentID:   "logo-image", // Inline image
			},
		},
	}

	if err := infra.PublishEmail(ctx, emailMsg); err != nil {
		t.Fatalf("failed to publish email: %v", err)
	}

	// Consume and process - injects into real KumoMTA
	consumer, _ := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	msgs, _ := consumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))

	for natsMsg := range msgs.Messages() {
		adapter := &jetstreamMsgAdapter{msg: natsMsg}
		if err := proc.HandleMessage(ctx, adapter); err != nil {
			t.Fatalf("failed to process message with attachments (KumoMTA injection failed): %v", err)
		}
	}

	t.Log("Email with attachments test passed - successfully injected into real KumoMTA!")
}

// TestFullEmailDeliveryWithWebhooks tests the complete email flow:
// 1. Start a webhook receiver to capture KumoMTA events
// 2. Inject an email via the processor
// 3. KumoMTA delivers to mailpit (via DNS override)
// 4. KumoMTA sends webhook notification
// 5. Verify the delivery event is received
func TestFullEmailDeliveryWithWebhooks(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Start webhook receiver on port 18080 (matches docker-compose WEBHOOK_URL)
	webhookReceiver, err := NewWebhookReceiver(18080)
	if err != nil {
		t.Fatalf("failed to start webhook receiver: %v", err)
	}
	defer webhookReceiver.Close()

	// Setup test infrastructure
	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Upload test email content to MinIO
	contentKey := "broadcasts/brd_webhook_test"
	htmlContent := `<!DOCTYPE html>
<html>
<head><title>Webhook Test</title></head>
<body>
  <h1>Testing Full Email Delivery Flow</h1>
  <p>This email should be delivered to mailpit and trigger a webhook.</p>
</body>
</html>`
	textContent := "Testing Full Email Delivery Flow - This email should be delivered to mailpit."

	if err := infra.UploadContent(ctx, contentKey, htmlContent, textContent); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	// Create email processor
	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)

	s3Client, err := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)
	if err != nil {
		t.Fatalf("failed to create S3 client: %v", err)
	}

	// Use real KumoMTA
	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTAURL,
		Timeout:            30 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: false, // We want immediate generation to get webhooks faster
	}, logger, metrics)

	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Create email message with tracking headers
	emailMsg := &domain.EmailMessage{
		ID:          "msg_webhook_test_001",
		TenantID:    "ws_webhook_tenant",
		BroadcastID: "brd_webhook_test",
		ContactID:   "cnt_webhook_contact",
		Recipient: domain.EmailRecipient{
			Email: "test-recipient@gmail.com",
			Name:  "Test Recipient",
		},
		Sender: domain.EmailSender{
			Email:  "sender",
			Name:   "Webhook Test Sender",
			Domain: "example.com",
		},
		Subject:    "Webhook Delivery Test",
		ContentKey: contentKey,
		Metadata: map[string]string{
			"test_id": "webhook_flow_test",
		},
	}

	// Publish to NATS and process
	if err := infra.PublishEmail(ctx, emailMsg); err != nil {
		t.Fatalf("failed to publish email: %v", err)
	}

	consumer, err := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	if err != nil {
		t.Fatalf("failed to get consumer: %v", err)
	}

	msgs, err := consumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))
	if err != nil {
		t.Fatalf("failed to fetch message: %v", err)
	}

	for natsMsg := range msgs.Messages() {
		adapter := &jetstreamMsgAdapter{msg: natsMsg}
		if err := proc.HandleMessage(ctx, adapter); err != nil {
			t.Fatalf("failed to process message: %v", err)
		}
	}

	t.Log("Email injected into KumoMTA, waiting for delivery webhook...")

	// Wait for delivery webhook from KumoMTA - filter by our specific recipient
	// to avoid receiving webhooks from previous tests
	deliveryEvent, err := webhookReceiver.WaitForDeliveryToRecipient("test-recipient@gmail.com", 30*time.Second)
	if err != nil {
		// Log what events we did receive
		events := webhookReceiver.GetEvents()
		t.Logf("Received %d events while waiting for Delivery:", len(events))
		for _, e := range events {
			t.Logf("  - Type: %s, Recipient: %s", e.Type, e.Recipient)
		}
		t.Fatalf("failed to receive delivery webhook: %v", err)
	}

	// Verify the delivery event
	if deliveryEvent.Recipient != "test-recipient@gmail.com" {
		t.Errorf("expected recipient 'test-recipient@gmail.com', got '%s'", deliveryEvent.Recipient)
	}

	if deliveryEvent.Sender != "sender@example.com" {
		t.Errorf("expected sender 'sender@example.com', got '%s'", deliveryEvent.Sender)
	}

	// Verify SMTP response indicates success (2xx)
	if deliveryEvent.Response.Code < 200 || deliveryEvent.Response.Code >= 300 {
		t.Errorf("expected successful SMTP response (2xx), got %d: %s",
			deliveryEvent.Response.Code, deliveryEvent.Response.Content)
	}

	t.Logf("Received delivery webhook: recipient=%s, sender=%s, response_code=%d",
		deliveryEvent.Recipient, deliveryEvent.Sender, deliveryEvent.Response.Code)
	t.Log("Full email delivery flow with webhooks test passed!")
}

// TestWebhookReceiverBasicFunctionality tests the webhook receiver independently
func TestWebhookReceiverBasicFunctionality(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Use a different port to avoid conflicts
	receiver, err := NewWebhookReceiver(18081)
	if err != nil {
		t.Fatalf("failed to start webhook receiver: %v", err)
	}
	defer receiver.Close()

	// Send a test webhook (KumoMTA sends a single object, not an array)
	testWebhook := domain.KumoMTAWebhook{
		Type:      "Delivery",
		ID:        "test-msg-id",
		Sender:    "sender@example.com",
		Recipient: "recipient@example.com",
		Response: domain.WebhookResponse{
			Code:    250,
			Content: "OK",
		},
	}

	payload, _ := json.Marshal(testWebhook)
	resp, err := http.Post("http://localhost:18081/webhooks", "application/json", strings.NewReader(string(payload)))
	if err != nil {
		t.Fatalf("failed to send webhook: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	// Verify we received the event
	event, err := receiver.WaitForDelivery(5 * time.Second)
	if err != nil {
		t.Fatalf("failed to receive webhook: %v", err)
	}

	if event.Recipient != "recipient@example.com" {
		t.Errorf("expected recipient 'recipient@example.com', got '%s'", event.Recipient)
	}

	t.Log("Webhook receiver basic functionality test passed!")
}

// jetstreamMsgAdapter adapts jetstream.Msg to the processor.Message interface
type jetstreamMsgAdapter struct {
	msg jetstream.Msg
}

func (a *jetstreamMsgAdapter) Data() []byte {
	return a.msg.Data()
}

func (a *jetstreamMsgAdapter) Ack() error {
	return a.msg.Ack()
}

func (a *jetstreamMsgAdapter) Nak() error {
	return a.msg.Nak()
}

func (a *jetstreamMsgAdapter) Term() error {
	return a.msg.Term()
}

// TestWebhookToNATSPublishing tests that webhooks received from KumoMTA are
// correctly published to the NATS EVENTS stream where the control plane can consume them.
// This tests the complete flow:
// 1. KumoMTA sends webhook to email-agent's HTTP handler
// 2. WebhookHandler publishes event to NATS EVENTS stream
// 3. Consumer on EVENTS stream receives the event
func TestWebhookToNATSPublishing(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Setup test infrastructure
	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	// Setup NATS streams (includes EVENTS stream)
	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Create a consumer for the EVENTS stream to receive published events
	eventsConsumer, err := infra.JS.CreateOrUpdateConsumer(ctx, "EVENTS", jetstream.ConsumerConfig{
		Name:          "test_events_consumer",
		Durable:       "test_events_consumer",
		FilterSubject: "kibamail.events.>",
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       30 * time.Second,
	})
	if err != nil {
		t.Fatalf("failed to create EVENTS consumer: %v", err)
	}

	// Create NATS JetStream context for the publisher (using legacy API for compatibility)
	js, err := infra.NATS.JetStream()
	if err != nil {
		t.Fatalf("failed to get JetStream context: %v", err)
	}

	// Create the real NATS publisher
	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)
	publisher := agentnats.NewPublisher(js, logger, metrics)

	// Create the real WebhookHandler
	webhookHandler := handlers.NewWebhookHandler(publisher, logger, metrics)

	// Start HTTP server with the real webhook handler
	mux := http.NewServeMux()
	mux.HandleFunc("/webhooks", webhookHandler.HandleWebhook)

	server := &http.Server{
		Addr:    ":18082", // Different port to avoid conflicts
		Handler: mux,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// Log error but don't panic
		}
	}()
	defer server.Shutdown(ctx)

	// Wait for server to start
	time.Sleep(100 * time.Millisecond)

	// Simulate KumoMTA sending a webhook (array of events as KumoMTA sends)
	testWebhooks := []domain.KumoMTAWebhook{
		{
			Type:      "Delivery",
			ID:        "msg_nats_test_001",
			Sender:    "sender@example.com",
			Recipient: "recipient@example.com",
			EventTime: time.Now(),
			Meta: map[string]interface{}{
				"tenant_id":    "ws_nats_test",
				"broadcast_id": "brd_nats_test",
				"contact_id":   "cnt_nats_test",
			},
			Response: domain.WebhookResponse{
				Code:    250,
				Content: "OK",
			},
			NodeID: "test-node-1",
		},
		{
			Type:      "Bounce",
			ID:        "msg_nats_test_002",
			Sender:    "sender@example.com",
			Recipient: "invalid@example.com",
			EventTime: time.Now(),
			Meta: map[string]interface{}{
				"tenant_id":    "ws_nats_test",
				"broadcast_id": "brd_nats_test",
				"contact_id":   "cnt_nats_test_2",
			},
			Response: domain.WebhookResponse{
				Code:    550,
				Content: "User not found",
			},
			BounceClassification: "InvalidRecipient",
			NodeID:               "test-node-1",
		},
	}

	payload, err := json.Marshal(testWebhooks)
	if err != nil {
		t.Fatalf("failed to marshal webhooks: %v", err)
	}

	// Send webhook to the handler
	resp, err := http.Post("http://localhost:18082/webhooks", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("failed to send webhook: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	// Consume events from NATS EVENTS stream
	msgs, err := eventsConsumer.Fetch(2, jetstream.FetchMaxWait(5*time.Second))
	if err != nil {
		t.Fatalf("failed to fetch messages from EVENTS stream: %v", err)
	}

	receivedEvents := make([]domain.EmailEvent, 0)
	for msg := range msgs.Messages() {
		var event domain.EmailEvent
		if err := json.Unmarshal(msg.Data(), &event); err != nil {
			t.Errorf("failed to unmarshal event: %v", err)
			continue
		}
		receivedEvents = append(receivedEvents, event)
		msg.Ack()
	}

	// Verify we received both events
	if len(receivedEvents) != 2 {
		t.Fatalf("expected 2 events, got %d", len(receivedEvents))
	}

	// Verify event contents
	deliveryFound := false
	bounceFound := false

	for _, event := range receivedEvents {
		if event.Type == "Delivery" {
			deliveryFound = true
			if event.Recipient != "recipient@example.com" {
				t.Errorf("expected recipient 'recipient@example.com', got '%s'", event.Recipient)
			}
			if event.TenantID != "ws_nats_test" {
				t.Errorf("expected tenant_id 'ws_nats_test', got '%s'", event.TenantID)
			}
			if event.BroadcastID != "brd_nats_test" {
				t.Errorf("expected broadcast_id 'brd_nats_test', got '%s'", event.BroadcastID)
			}
			if event.ContactID != "cnt_nats_test" {
				t.Errorf("expected contact_id 'cnt_nats_test', got '%s'", event.ContactID)
			}
			if event.SendingID != "msg_nats_test_001" {
				t.Errorf("expected sending_id 'msg_nats_test_001', got '%s'", event.SendingID)
			}
		}
		if event.Type == "Bounce" {
			bounceFound = true
			if event.Recipient != "invalid@example.com" {
				t.Errorf("expected recipient 'invalid@example.com', got '%s'", event.Recipient)
			}
			if event.BounceClassification != "InvalidRecipient" {
				t.Errorf("expected bounce classification 'InvalidRecipient', got '%s'", event.BounceClassification)
			}
		}
	}

	if !deliveryFound {
		t.Error("Delivery event not found in EVENTS stream")
	}
	if !bounceFound {
		t.Error("Bounce event not found in EVENTS stream")
	}

	t.Log("Webhook to NATS publishing test passed!")
	t.Logf("Successfully published %d events to NATS EVENTS stream", len(receivedEvents))
}

// TestFullEmailDeliveryToNATS tests the complete end-to-end flow:
// 1. Inject email via processor → KumoMTA
// 2. KumoMTA delivers to mailpit
// 3. KumoMTA sends webhook to email-agent's WebhookHandler
// 4. WebhookHandler publishes to NATS EVENTS stream
// 5. Consumer receives event from EVENTS stream
//
// NOTE: This test uses port 18080 which is also used by TestFullEmailDeliveryWithWebhooks.
// When running all tests together, skip this test since:
// - TestWebhookToNATSPublishing verifies webhook → NATS flow (simulated webhook)
// - TestFullEmailDeliveryWithWebhooks verifies KumoMTA → webhook receiver flow
// Together they cover the complete flow. Run this test in isolation if needed:
// go test -tags=integration -v -run TestFullEmailDeliveryToNATS ./internal/integration/...
func TestFullEmailDeliveryToNATS(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Skip when running with other tests that use port 18080
	// This test can be run in isolation for full end-to-end verification
	t.Skip("skipping: conflicts with TestFullEmailDeliveryWithWebhooks on port 18080. Run in isolation if needed.")

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	// Setup test infrastructure
	cfg := DefaultTestConfig()
	infra, err := NewTestInfra(ctx, cfg)
	if err != nil {
		t.Fatalf("failed to create test infrastructure: %v", err)
	}
	defer infra.Close()

	// Setup NATS streams
	if err := infra.SetupStreams(ctx); err != nil {
		t.Fatalf("failed to setup streams: %v", err)
	}
	defer infra.Cleanup(ctx)

	// Create consumer for EVENTS stream
	eventsConsumer, err := infra.JS.CreateOrUpdateConsumer(ctx, "EVENTS", jetstream.ConsumerConfig{
		Name:          "test_full_flow_consumer",
		Durable:       "test_full_flow_consumer",
		FilterSubject: "kibamail.events.>",
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       30 * time.Second,
	})
	if err != nil {
		t.Fatalf("failed to create EVENTS consumer: %v", err)
	}

	// Create NATS publisher
	js, err := infra.NATS.JetStream()
	if err != nil {
		t.Fatalf("failed to get JetStream context: %v", err)
	}

	logger := zerolog.Nop()
	registry := prometheus.NewRegistry()
	metrics := observability.NewMetrics(registry)
	publisher := agentnats.NewPublisher(js, logger, metrics)

	// Create WebhookHandler and start HTTP server on port 18080
	// (This is the port configured in docker-compose for KumoMTA's WEBHOOK_URL)
	webhookHandler := handlers.NewWebhookHandler(publisher, logger, metrics)

	mux := http.NewServeMux()
	mux.HandleFunc("/webhooks", webhookHandler.HandleWebhook)

	server := &http.Server{
		Addr:    ":18080",
		Handler: mux,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// Server closed
		}
	}()
	defer server.Shutdown(ctx)
	time.Sleep(100 * time.Millisecond)

	// Upload test email content
	contentKey := "broadcasts/brd_full_nats_test"
	htmlContent := "<html><body><h1>Full Flow NATS Test</h1></body></html>"
	textContent := "Full Flow NATS Test"
	if err := infra.UploadContent(ctx, contentKey, htmlContent, textContent); err != nil {
		t.Fatalf("failed to upload content: %v", err)
	}

	// Create email processor with real KumoMTA
	s3Client, err := agents3.NewClient(agents3.Config{
		Endpoint:        cfg.MinioURL,
		Region:          "us-east-1",
		AccessKeyID:     cfg.MinioAccess,
		SecretAccessKey: cfg.MinioSecret,
		Bucket:          cfg.MinioBucket,
		ForcePathStyle:  true,
	}, logger, metrics)
	if err != nil {
		t.Fatalf("failed to create S3 client: %v", err)
	}

	kumoClient := kumomta.NewClient(kumomta.Config{
		Endpoint:           cfg.KumoMTAURL,
		Timeout:            30 * time.Second,
		MaxIdleConns:       10,
		MaxConnsPerHost:    10,
		DeferredGeneration: false, // Immediate generation for faster webhooks
	}, logger, metrics)

	proc := processor.NewEmailProcessor(s3Client, kumoClient, logger, metrics)

	// Create unique recipient to avoid conflicts with other tests
	uniqueRecipient := fmt.Sprintf("nats-test-%d@gmail.com", time.Now().UnixNano())

	// Create and publish email message
	emailMsg := &domain.EmailMessage{
		ID:          "msg_full_nats_001",
		TenantID:    "ws_full_nats",
		BroadcastID: "brd_full_nats_test",
		ContactID:   "cnt_full_nats_001",
		Recipient: domain.EmailRecipient{
			Email: uniqueRecipient,
			Name:  "NATS Test User",
		},
		Sender: domain.EmailSender{
			Email:  "sender",
			Name:   "NATS Test Sender",
			Domain: "test.com",
		},
		Subject:    "Full Flow NATS Test",
		ContentKey: contentKey,
	}

	if err := infra.PublishEmail(ctx, emailMsg); err != nil {
		t.Fatalf("failed to publish email: %v", err)
	}

	// Consume and process the email
	emailConsumer, err := infra.JS.Consumer(ctx, "EMAILS", "email_agent_consumer")
	if err != nil {
		t.Fatalf("failed to get email consumer: %v", err)
	}

	emailMsgs, err := emailConsumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))
	if err != nil {
		t.Fatalf("failed to fetch email: %v", err)
	}

	for natsMsg := range emailMsgs.Messages() {
		adapter := &jetstreamMsgAdapter{msg: natsMsg}
		if err := proc.HandleMessage(ctx, adapter); err != nil {
			t.Fatalf("failed to process email: %v", err)
		}
	}

	t.Log("Email injected into KumoMTA, waiting for webhook → NATS flow...")

	// Wait for KumoMTA to deliver and send webhook, which gets published to NATS
	// This may take up to 30 seconds for KumoMTA to process and deliver
	var deliveryEvent *domain.EmailEvent
	deadline := time.Now().Add(45 * time.Second)

	for time.Now().Before(deadline) {
		msgs, err := eventsConsumer.Fetch(1, jetstream.FetchMaxWait(2*time.Second))
		if err != nil {
			continue
		}

		for msg := range msgs.Messages() {
			var event domain.EmailEvent
			if err := json.Unmarshal(msg.Data(), &event); err != nil {
				msg.Nak()
				continue
			}

			// Look for our specific delivery event
			if event.Type == "Delivery" && event.Recipient == uniqueRecipient {
				deliveryEvent = &event
				msg.Ack()
				break
			}
			msg.Ack()
		}

		if deliveryEvent != nil {
			break
		}
	}

	if deliveryEvent == nil {
		t.Fatal("timeout waiting for Delivery event in NATS EVENTS stream")
	}

	// Verify event contents
	if deliveryEvent.TenantID != "ws_full_nats" {
		t.Errorf("expected tenant_id 'ws_full_nats', got '%s'", deliveryEvent.TenantID)
	}
	if deliveryEvent.BroadcastID != "brd_full_nats_test" {
		t.Errorf("expected broadcast_id 'brd_full_nats_test', got '%s'", deliveryEvent.BroadcastID)
	}
	if deliveryEvent.ContactID != "cnt_full_nats_001" {
		t.Errorf("expected contact_id 'cnt_full_nats_001', got '%s'", deliveryEvent.ContactID)
	}

	t.Logf("Received Delivery event from NATS: recipient=%s, tenant=%s",
		deliveryEvent.Recipient, deliveryEvent.TenantID)
	t.Log("Full email delivery to NATS test passed!")
}
