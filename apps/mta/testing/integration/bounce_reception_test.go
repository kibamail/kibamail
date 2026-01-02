// Package integration provides end-to-end integration tests for the email delivery pipeline.
//
// Test flow for bounce reception:
//
//	External Provider → SMTP (port 25) → KumoMTA → OOB Parser → Webhook
//
// This test simulates receiving bounce emails (DSNs) from external mail servers
// and verifies they're properly processed and logged.
package integration

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Test configuration for bounce tests
const (
	// Bounce recipient domain (return path domain)
	bounceDomain = "kb.hq.kibamail.xyz"
)

// TestBounceReception tests receiving and processing bounce emails (DSNs)
func TestBounceReception(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	// Generate unique test ID
	testID := uuid.New().String()[:8]

	// Create envelope addresses
	// Bounces come FROM the null sender (<>) or a postmaster address
	// TO the original sender's return path
	bounceRecipient := fmt.Sprintf("bounce+%s@%s", testID, bounceDomain)
	bounceSender := "" // Null sender (RFC 5321)

	// Build a DSN (Delivery Status Notification) email
	bounceEmail := buildBounceEmail(testID, bounceSender, bounceRecipient)

	t.Logf("Sending bounce email to %s", bounceRecipient)

	// Send the bounce via SMTP to KumoMTA port 25
	err := sendBounceEmail(t, bounceSender, bounceRecipient, bounceEmail)
	if err != nil {
		t.Fatalf("Failed to send bounce email: %v", err)
	}

	t.Log("Bounce email accepted by KumoMTA")

	// Bounces are processed as OOB (Out-of-Band) and logged to webhook
	// With log_oob = 'LogThenDrop', the message is parsed, logged, then dropped
	// We verify acceptance - webhook verification would require additional setup

	t.Log("Bounce reception test passed!")
}

// TestBounceWithPostmasterSender tests bounces from postmaster addresses
func TestBounceWithPostmasterSender(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	testID := uuid.New().String()[:8]
	bounceRecipient := fmt.Sprintf("bounce+%s@%s", testID, bounceDomain)
	bounceSender := "postmaster@gmail.com" // Some providers use postmaster

	bounceEmail := buildBounceEmail(testID, bounceSender, bounceRecipient)

	t.Logf("Sending bounce from %s to %s", bounceSender, bounceRecipient)

	err := sendBounceEmail(t, bounceSender, bounceRecipient, bounceEmail)
	if err != nil {
		t.Fatalf("Failed to send bounce email: %v", err)
	}

	t.Log("Bounce from postmaster accepted!")
}

// TestBounceRejectionForUnknownDomain tests that bounces to unknown domains are rejected
func TestBounceRejectionForUnknownDomain(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	testID := uuid.New().String()[:8]

	// Try to send to an unknown bounce domain
	unknownRecipient := fmt.Sprintf("bounce+%s@kb.unknown-domain-%s.example.com", testID, testID)
	sender := ""

	bounceEmail := buildBounceEmail(testID, sender, unknownRecipient)

	t.Logf("Attempting to send bounce to unknown domain: %s", unknownRecipient)

	// This should fail at RCPT TO stage
	err := sendBounceEmail(t, sender, unknownRecipient, bounceEmail)
	if err == nil {
		t.Error("Expected rejection for unknown bounce domain, but email was accepted")
	} else {
		t.Logf("Correctly rejected unknown bounce domain: %v", err)
	}
}

// TestARFComplaintReception tests receiving ARF (Abuse Reporting Format) complaints
func TestARFComplaintReception(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	testID := uuid.New().String()[:8]
	arfRecipient := fmt.Sprintf("fbl+%s@%s", testID, bounceDomain)
	arfSender := "abuse-reporting@hotmail.com"

	arfEmail := buildARFEmail(testID, arfSender, arfRecipient)

	t.Logf("Sending ARF complaint to %s from %s", arfRecipient, arfSender)

	err := sendBounceEmail(t, arfSender, arfRecipient, arfEmail)
	if err != nil {
		t.Fatalf("Failed to send ARF complaint: %v", err)
	}

	t.Log("ARF complaint accepted!")
}

// buildBounceEmail creates a DSN (Delivery Status Notification) email
// This follows RFC 3464 format
func buildBounceEmail(testID, from, to string) string {
	messageID := fmt.Sprintf("<%s@bounce-generator.local>", uuid.New().String())
	timestamp := time.Now().UTC().Format(time.RFC1123Z)
	boundary := "----=_Part_Bounce_" + testID

	// For bounce emails, the From header should be mailer-daemon or postmaster
	// even if the envelope sender is null (empty)
	headerFrom := from
	if headerFrom == "" {
		headerFrom = "mailer-daemon@mail.example.com"
	}

	// Build the DSN with proper MIME structure
	email := fmt.Sprintf(`From: %s
To: %s
Subject: Delivery Status Notification (Failure)
Date: %s
Message-ID: %s
MIME-Version: 1.0
Content-Type: multipart/report; report-type=delivery-status; boundary="%s"
X-Bounce-Test-ID: %s

--%s
Content-Type: text/plain; charset="utf-8"

This is an automatically generated Delivery Status Notification.

Delivery to the following recipients failed:
    original-recipient@example.com

The email could not be delivered because the mailbox is full.

--%s
Content-Type: message/delivery-status

Reporting-MTA: dns; mail.example.com
Arrival-Date: %s

Final-Recipient: rfc822; original-recipient@example.com
Action: failed
Status: 5.2.2
Diagnostic-Code: smtp; 552 5.2.2 Mailbox full
X-Test-ID: %s

--%s
Content-Type: message/rfc822
Content-Disposition: inline

From: newsletter@hq.kibamail.xyz
To: original-recipient@example.com
Subject: Original Test Email
Date: %s
Message-ID: <original-%s@hq.kibamail.xyz>

This is the original email that bounced.

--%s--
`, headerFrom, to, timestamp, messageID, boundary, testID,
		boundary,
		boundary, timestamp, testID,
		boundary, timestamp, testID,
		boundary)

	// Normalize line endings to CRLF for SMTP
	email = strings.ReplaceAll(email, "\n", "\r\n")

	return email
}

// buildARFEmail creates an ARF (Abuse Reporting Format) complaint email
// This follows RFC 5965 format
func buildARFEmail(testID, from, to string) string {
	messageID := fmt.Sprintf("<%s@arf-generator.local>", uuid.New().String())
	timestamp := time.Now().UTC().Format(time.RFC1123Z)
	boundary := "----=_Part_ARF_" + testID

	email := fmt.Sprintf(`From: %s
To: %s
Subject: complaint about message from hq.kibamail.xyz
Date: %s
Message-ID: %s
MIME-Version: 1.0
Content-Type: multipart/report; report-type=feedback-report; boundary="%s"
X-ARF-Test-ID: %s

--%s
Content-Type: text/plain; charset="utf-8"

This is an email abuse report for a message received from hq.kibamail.xyz.

The user has marked this email as spam.

--%s
Content-Type: message/feedback-report

Feedback-Type: abuse
User-Agent: ARF-Test/1.0
Version: 1
Original-Mail-From: newsletter@hq.kibamail.xyz
Arrival-Date: %s
Reported-Domain: hq.kibamail.xyz
Source-IP: 172.28.0.3
X-Test-ID: %s

--%s
Content-Type: message/rfc822
Content-Disposition: inline

From: newsletter@hq.kibamail.xyz
To: complainer@hotmail.com
Subject: Newsletter that was marked as spam
Date: %s
Message-ID: <original-%s@hq.kibamail.xyz>

This is the original email that was reported as spam.

--%s--
`, from, to, timestamp, messageID, boundary, testID,
		boundary,
		boundary, timestamp, testID,
		boundary, timestamp, testID,
		boundary)

	// Normalize line endings to CRLF for SMTP
	email = strings.ReplaceAll(email, "\n", "\r\n")

	return email
}

// sendBounceEmail sends the bounce email via SMTP
func sendBounceEmail(t *testing.T, from, to, body string) error {
	t.Helper()

	addr := fmt.Sprintf("%s:%s", kumomtaSMTPHost, kumomtaSMTPPort)

	// Connect to SMTP server
	conn, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("dial failed: %w", err)
	}
	defer conn.Close()

	// Say hello
	if err := conn.Hello("bounce.test.local"); err != nil {
		return fmt.Errorf("HELO failed: %w", err)
	}

	// Try STARTTLS if available
	if ok, _ := conn.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName:         "mail.kbmta.net",
			InsecureSkipVerify: true,
		}
		if err := conn.StartTLS(tlsConfig); err != nil {
			t.Logf("STARTTLS upgrade failed (continuing without TLS): %v", err)
		} else {
			t.Log("STARTTLS upgrade successful")
		}
	}

	// Set envelope from (may be empty for bounces)
	if err := conn.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	// Set envelope to
	if err := conn.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO failed: %w", err)
	}

	// Send the email data
	wc, err := conn.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}

	_, err = wc.Write([]byte(body))
	if err != nil {
		wc.Close()
		return fmt.Errorf("write failed: %w", err)
	}

	if err := wc.Close(); err != nil {
		return fmt.Errorf("close failed: %w", err)
	}

	// Quit gracefully
	conn.Quit()

	return nil
}
