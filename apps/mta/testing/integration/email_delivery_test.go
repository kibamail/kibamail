// Package integration provides end-to-end integration tests for the email delivery pipeline.
//
// Test flow:
//
//	Test → NATS → email-agent → KumoMTA → (proxy) → mailpit
//
// Prerequisites:
//  1. Run: ./scripts/setup.sh
//  2. Run: go run ./cmd/controlplane (in separate terminal)
//  3. Run: docker compose up -d
//  4. Run: go test ./integration/...
package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

// Test configuration (matches docker-compose.yml)
const (
	natsURL       = "nats://localhost:14222"
	minioEndpoint = "http://localhost:19000"
	minioRegion   = "us-east-1"
	minioAccess   = "minioadmin"
	minioSecret   = "minioadmin"
	minioBucket   = "kibamail"

	// Mailpit API (web UI port stays at 8025, SMTP is on port 25 internally)
	mailpitAPI = "http://localhost:8025/api/v1"

	// NATS stream/consumer config
	streamName   = "EMAILS"
	consumerName = "email_agent_consumer"
	subjectBase  = "kibamail.emails"
)

// EmailMessage matches the email-agent's domain.EmailMessage structure
type EmailMessage struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenant_id"`
	BroadcastID string            `json:"broadcast_id"`
	ContactID   string            `json:"contact_id"`
	Recipient   EmailRecipient    `json:"recipient"`
	Sender      EmailSender       `json:"sender"`
	ReplyTo     *EmailAddress     `json:"reply_to,omitempty"`
	Subject     string            `json:"subject"`
	PreviewText string            `json:"preview_text"`
	ContentKey  string            `json:"content_key"`
	Attachments []EmailAttachment `json:"attachments"`
	Metadata    map[string]string `json:"metadata"`
	TrackOpens  bool              `json:"track_opens"`
	TrackClicks bool              `json:"track_clicks"`
}

type EmailRecipient struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type EmailSender struct {
	Email  string `json:"email"`
	Name   string `json:"name"`
	Domain string `json:"domain"`
}

type EmailAddress struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type EmailAttachment struct {
	S3Key       string `json:"s3_key"`
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	ContentID   string `json:"content_id"`
}

// MailpitMessage represents a message from mailpit API
type MailpitMessage struct {
	ID      string `json:"ID"`
	From    struct {
		Address string `json:"Address"`
		Name    string `json:"Name"`
	} `json:"From"`
	To []struct {
		Address string `json:"Address"`
		Name    string `json:"Name"`
	} `json:"To"`
	Subject string `json:"Subject"`
	Date    string `json:"Date"`
	Size    int    `json:"Size"`
}

type MailpitMessages struct {
	Messages []MailpitMessage `json:"messages"`
	Total    int              `json:"total"`
}

type MailpitMessageDetail struct {
	ID      string `json:"ID"`
	Subject string `json:"Subject"`
	From    struct {
		Address string `json:"Address"`
	} `json:"From"`
	To []struct {
		Address string `json:"Address"`
	} `json:"To"`
	Text    string            `json:"Text"`
	HTML    string            `json:"HTML"`
	Headers map[string][]string `json:"Headers"`
}

// TestEmailDeliveryWithDKIM tests the complete email delivery pipeline
func TestEmailDeliveryWithDKIM(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// 1. Setup test dependencies
	nc, js := setupNATS(t)
	defer nc.Close()

	s3Client := setupS3(t)

	// 2. Clear mailpit before test
	clearMailpit(t)

	// 3. Generate unique test data
	messageID := uuid.New().String()
	contentKey := fmt.Sprintf("content/%s", messageID)
	recipientEmail := fmt.Sprintf("test-%s@gmail.com", messageID[:8])

	// 4. Upload email content to S3
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><title>Test Email</title></head>
<body>
<h1>Integration Test Email</h1>
<p>This is a test email with ID: %s</p>
<p>Sent at: %s</p>
</body>
</html>`, messageID, time.Now().Format(time.RFC3339))

	textContent := fmt.Sprintf("Integration Test Email\n\nThis is a test email with ID: %s\nSent at: %s",
		messageID, time.Now().Format(time.RFC3339))

	uploadContent(t, ctx, s3Client, contentKey+"/content.html", htmlContent, "text/html")
	uploadContent(t, ctx, s3Client, contentKey+"/content.txt", textContent, "text/plain")

	t.Logf("Uploaded content to S3: %s", contentKey)

	// 5. Create and publish email message
	emailMsg := EmailMessage{
		ID:          messageID,
		TenantID:    "ws_test_123",
		BroadcastID: "broadcast_test_001",
		ContactID:   "contact_test_001",
		Recipient: EmailRecipient{
			Email: recipientEmail,
			Name:  "Test Recipient",
		},
		Sender: EmailSender{
			Email:  "newsletter",
			Name:   "Kibamail Test",
			Domain: "hq.kibamail.xyz",
		},
		Subject:     fmt.Sprintf("Integration Test: %s", messageID[:8]),
		PreviewText: "This is a test email from the integration test suite",
		ContentKey:  contentKey,
		Attachments: []EmailAttachment{},
		Metadata: map[string]string{
			"test_id": messageID,
		},
		TrackOpens:  false,
		TrackClicks: false,
	}

	msgData, err := json.Marshal(emailMsg)
	if err != nil {
		t.Fatalf("Failed to marshal email message: %v", err)
	}

	// 6. Publish to NATS (subject format: kibamail.emails.{tenantId})
	publishSubject := fmt.Sprintf("%s.%s", subjectBase, emailMsg.TenantID)
	ack, err := js.Publish(publishSubject, msgData)
	if err != nil {
		t.Fatalf("Failed to publish to NATS: %v", err)
	}

	t.Logf("Published message to NATS: stream=%s seq=%d", ack.Stream, ack.Sequence)

	// 7. Wait for email to arrive in mailpit
	var deliveredMsg *MailpitMessageDetail
	deadline := time.Now().Add(60 * time.Second)

	for time.Now().Before(deadline) {
		msg := findMessageInMailpit(t, recipientEmail)
		if msg != nil {
			deliveredMsg = msg
			break
		}
		time.Sleep(2 * time.Second)
		t.Log("Waiting for email to arrive in mailpit...")
	}

	if deliveredMsg == nil {
		t.Fatalf("Email did not arrive in mailpit within timeout")
	}

	t.Logf("Email delivered successfully! ID: %s", deliveredMsg.ID)

	// 8. Verify email content
	if deliveredMsg.Subject != emailMsg.Subject {
		t.Errorf("Subject mismatch: expected %q, got %q", emailMsg.Subject, deliveredMsg.Subject)
	}

	expectedFrom := fmt.Sprintf("%s@%s", emailMsg.Sender.Email, emailMsg.Sender.Domain)
	if deliveredMsg.From.Address != expectedFrom {
		t.Errorf("From address mismatch: expected %q, got %q", expectedFrom, deliveredMsg.From.Address)
	}

	if len(deliveredMsg.To) == 0 || deliveredMsg.To[0].Address != recipientEmail {
		t.Errorf("To address mismatch: expected %q", recipientEmail)
	}

	// 9. Verify DKIM signature is present
	// Note: Header keys in mailpit may be normalized to different cases
	dkimSigs, hasDKIM := deliveredMsg.Headers["Dkim-Signature"]
	if !hasDKIM {
		// Try alternate cases
		dkimSigs, hasDKIM = deliveredMsg.Headers["DKIM-Signature"]
	}
	if !hasDKIM {
		// Try lowercase (mailpit may normalize to lowercase)
		dkimSigs, hasDKIM = deliveredMsg.Headers["dkim-signature"]
	}
	if !hasDKIM || len(dkimSigs) == 0 {
		t.Errorf("DKIM-Signature header not found! Available headers: %v", deliveredMsg.Headers)
	} else {
		t.Logf("DKIM signature found: %d raw entries", len(dkimSigs))

		// Check for both DKIM signatures
		// Note: mailparser combines multiple DKIM-Signature headers into JSON
		// The format may be "d=domain" (raw) or "\"d\":\"domain\"" (JSON)
		foundTenantDKIM := false
		foundMTADKIM := false
		for _, sig := range dkimSigs {
			// Check for tenant DKIM (hq.kibamail.xyz)
			if strings.Contains(sig, "d=hq.kibamail.xyz") || strings.Contains(sig, `"d":"hq.kibamail.xyz"`) {
				foundTenantDKIM = true
				t.Log("Found tenant DKIM signature for hq.kibamail.xyz")
			}
			// Check for MTA DKIM (kbmta.net)
			if strings.Contains(sig, "d=kbmta.net") || strings.Contains(sig, `"d":"kbmta.net"`) {
				foundMTADKIM = true
				t.Log("Found MTA DKIM signature for kbmta.net")
			}
		}

		if !foundTenantDKIM {
			t.Log("Warning: Tenant DKIM signature not found (may not be configured)")
		}

		if !foundMTADKIM {
			t.Error("MTA DKIM signature not found for kbmta.net")
		}

		if foundTenantDKIM && foundMTADKIM {
			t.Log("2-fold DKIM signing verified: tenant + MTA signatures present")
		}
	}

	// 10. Verify tracking headers
	if kibamailHeaders, ok := deliveredMsg.Headers["X-Kibamail-Tenant"]; ok {
		t.Logf("X-Kibamail-Tenant: %v", kibamailHeaders)
	}

	t.Log("Integration test passed!")
}

func setupNATS(t *testing.T) (*nats.Conn, nats.JetStreamContext) {
	t.Helper()

	nc, err := nats.Connect(natsURL)
	if err != nil {
		t.Fatalf("Failed to connect to NATS: %v", err)
	}

	js, err := nc.JetStream()
	if err != nil {
		t.Fatalf("Failed to get JetStream context: %v", err)
	}

	// Create or update stream
	streamCfg := &nats.StreamConfig{
		Name:      streamName,
		Subjects:  []string{"kibamail.emails.>"},
		Storage:   nats.FileStorage,
		Retention: nats.WorkQueuePolicy,
		MaxAge:    24 * time.Hour,
	}

	_, err = js.AddStream(streamCfg)
	if err != nil {
		// Stream might already exist, try to update
		_, err = js.UpdateStream(streamCfg)
		if err != nil && !strings.Contains(err.Error(), "stream name already in use") {
			t.Logf("Warning: could not update stream: %v", err)
		}
	}

	// Create or get consumer
	consumerCfg := &nats.ConsumerConfig{
		Durable:       consumerName,
		AckPolicy:     nats.AckExplicitPolicy,
		MaxDeliver:    5,
		AckWait:       30 * time.Second,
		FilterSubject: "kibamail.emails.>",
	}

	_, err = js.AddConsumer(streamName, consumerCfg)
	if err != nil && !strings.Contains(err.Error(), "consumer already exists") {
		t.Logf("Warning: could not create consumer: %v", err)
	}

	t.Logf("NATS connected: stream=%s consumer=%s", streamName, consumerName)
	return nc, js
}

func setupS3(t *testing.T) *s3.Client {
	t.Helper()

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(minioRegion),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			minioAccess,
			minioSecret,
			"",
		)),
	)
	if err != nil {
		t.Fatalf("Failed to load AWS config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(minioEndpoint)
		o.UsePathStyle = true
	})

	// Verify bucket exists
	_, err = client.HeadBucket(context.Background(), &s3.HeadBucketInput{
		Bucket: aws.String(minioBucket),
	})
	if err != nil {
		t.Fatalf("S3 bucket %q not accessible: %v", minioBucket, err)
	}

	t.Logf("S3 connected: endpoint=%s bucket=%s", minioEndpoint, minioBucket)
	return client
}

func uploadContent(t *testing.T, ctx context.Context, client *s3.Client, key, content, contentType string) {
	t.Helper()

	_, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(minioBucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader([]byte(content)),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		t.Fatalf("Failed to upload %s: %v", key, err)
	}
}

func clearMailpit(t *testing.T) {
	t.Helper()

	req, _ := http.NewRequest("DELETE", mailpitAPI+"/messages", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Logf("Warning: could not clear mailpit: %v", err)
		return
	}
	defer resp.Body.Close()

	t.Log("Cleared mailpit messages")
}

func findMessageInMailpit(t *testing.T, recipientEmail string) *MailpitMessageDetail {
	t.Helper()

	// Search for messages
	resp, err := http.Get(fmt.Sprintf("%s/messages?limit=100", mailpitAPI))
	if err != nil {
		t.Logf("Failed to query mailpit: %v", err)
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var messages MailpitMessages
	if err := json.Unmarshal(body, &messages); err != nil {
		t.Logf("Failed to parse mailpit response: %v", err)
		return nil
	}

	t.Logf("Mailpit has %d messages", messages.Total)

	// Find message by recipient
	for _, msg := range messages.Messages {
		for _, to := range msg.To {
			if to.Address == recipientEmail {
				// Fetch full message details
				detailResp, err := http.Get(fmt.Sprintf("%s/message/%s", mailpitAPI, msg.ID))
				if err != nil {
					continue
				}
				defer detailResp.Body.Close()

				detailBody, _ := io.ReadAll(detailResp.Body)

				var detail MailpitMessageDetail
				if err := json.Unmarshal(detailBody, &detail); err != nil {
					continue
				}

				// Fetch headers separately (mailpit uses a different endpoint)
				headersResp, err := http.Get(fmt.Sprintf("%s/message/%s/headers", mailpitAPI, msg.ID))
				if err == nil {
					defer headersResp.Body.Close()
					headersBody, _ := io.ReadAll(headersResp.Body)
					var headers map[string][]string
					if json.Unmarshal(headersBody, &headers) == nil {
						detail.Headers = headers
					}
				}

				return &detail
			}
		}
	}

	return nil
}
