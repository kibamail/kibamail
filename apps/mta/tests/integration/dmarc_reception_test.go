// Package integration provides end-to-end integration tests for the email delivery pipeline.
//
// Test flow for DMARC reception:
//
//	External Provider → SMTP (port 25) → KumoMTA → Custom Handler → email-agent → S3
//
// This test simulates receiving a DMARC aggregate report from an external provider
// (like Google, Microsoft, Yahoo) and verifies it's properly processed.
package integration

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// Test configuration for DMARC tests
const (
	// KumoMTA inbound SMTP port (for receiving DMARC reports)
	kumomtaSMTPPort = "25"
	kumomtaSMTPHost = "localhost"

	// DMARC recipient domain
	dmarcDomain = "dmarc.kbmta.net"
)

// TestDMARCReportReception tests receiving and processing DMARC aggregate reports
func TestDMARCReportReception(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	// Setup S3 client to verify report storage
	s3Client := setupS3ForDMARC(t)

	// Generate unique test ID
	testID := uuid.New().String()[:8]

	// Create a simulated DMARC aggregate report email
	dmarcRecipient := fmt.Sprintf("re+%s@%s", testID, dmarcDomain)
	dmarcSender := "noreply-dmarc-support@google.com"

	// Build the DMARC report email (RFC822 format)
	dmarcEmail := buildDMARCReportEmail(testID, dmarcSender, dmarcRecipient)

	t.Logf("Sending DMARC report to %s from %s", dmarcRecipient, dmarcSender)

	// Send the DMARC report via SMTP to KumoMTA port 25
	err := sendDMARCReport(t, dmarcSender, dmarcRecipient, dmarcEmail)
	if err != nil {
		t.Fatalf("Failed to send DMARC report: %v", err)
	}

	t.Log("DMARC report sent successfully via SMTP")

	// Wait for the report to be processed and stored in S3
	// The flow is: KumoMTA -> custom handler -> email-agent -> S3
	var reportFound bool
	var reportKey string

	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		reportKey, reportFound = findDMARCReportInS3(t, s3Client, testID)
		if reportFound {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	if !reportFound {
		t.Fatal("DMARC report was not stored in S3 within timeout")
	}

	t.Logf("DMARC report found in S3: %s", reportKey)

	// Verify the stored report content
	verifyDMARCReportContent(t, s3Client, reportKey, testID)

	t.Log("DMARC report reception test passed!")
}

// buildDMARCReportEmail creates a simulated DMARC aggregate report email
// This mimics what providers like Google, Microsoft send
func buildDMARCReportEmail(testID, from, to string) string {
	messageID := fmt.Sprintf("<%s@google.com>", uuid.New().String())
	timestamp := time.Now().UTC().Format(time.RFC1123Z)

	// XML content simulating a DMARC aggregate report
	// In production, this would be gzipped, but for testing plain XML works
	dmarcXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <report_id>%s</report_id>
    <date_range>
      <begin>1703116800</begin>
      <end>1703203199</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>hq.kibamail.xyz</domain>
    <adkim>r</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>172.28.0.3</source_ip>
      <count>1</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
    <identifiers>
      <header_from>hq.kibamail.xyz</header_from>
    </identifiers>
    <auth_results>
      <dkim>
        <domain>hq.kibamail.xyz</domain>
        <result>pass</result>
        <selector>kibamail</selector>
      </dkim>
      <spf>
        <domain>hq.kibamail.xyz</domain>
        <result>pass</result>
      </spf>
    </auth_results>
  </record>
</feedback>`, testID)

	// Build the email with proper headers and XML attachment
	boundary := "----=_Part_DMARC_" + testID

	email := fmt.Sprintf(`From: %s
To: %s
Subject: Report Domain: hq.kibamail.xyz Submitter: google.com Report-ID: %s
Date: %s
Message-ID: %s
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="%s"
X-DMARC-Test-ID: %s

--%s
Content-Type: text/plain; charset="utf-8"

This is a DMARC aggregate report from google.com for the domain hq.kibamail.xyz.
Report ID: %s

--%s
Content-Type: application/xml; name="google.com!hq.kibamail.xyz!%s.xml"
Content-Disposition: attachment; filename="google.com!hq.kibamail.xyz!%s.xml"
Content-Transfer-Encoding: 7bit

%s
--%s--
`, from, to, testID, timestamp, messageID, boundary, testID,
		boundary, testID,
		boundary, testID, testID,
		dmarcXML, boundary)

	// Normalize line endings to CRLF for SMTP
	email = strings.ReplaceAll(email, "\n", "\r\n")

	return email
}

// sendDMARCReport sends the DMARC report email via SMTP
func sendDMARCReport(t *testing.T, from, to, body string) error {
	t.Helper()

	addr := fmt.Sprintf("%s:%s", kumomtaSMTPHost, kumomtaSMTPPort)

	// Connect to SMTP server
	conn, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("dial failed: %w", err)
	}
	defer conn.Close()

	// Say hello
	if err := conn.Hello("test.dmarc.sender"); err != nil {
		return fmt.Errorf("HELO failed: %w", err)
	}

	// Try STARTTLS if available (optional for inbound)
	if ok, _ := conn.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName:         "mail.kbmta.net",
			InsecureSkipVerify: true, // Accept test certificates
		}
		if err := conn.StartTLS(tlsConfig); err != nil {
			t.Logf("STARTTLS upgrade failed (continuing without TLS): %v", err)
		} else {
			t.Log("STARTTLS upgrade successful")
		}
	}

	// Set envelope from
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

// setupS3ForDMARC creates an S3 client for verifying DMARC report storage
func setupS3ForDMARC(t *testing.T) *s3.Client {
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

	t.Logf("S3 connected for DMARC tests: endpoint=%s bucket=%s", minioEndpoint, minioBucket)
	return client
}

// findDMARCReportInS3 searches for the DMARC report in S3
// Reports are stored at: dmarc-reports/YYYY/MM/DD/{report-id}.eml
func findDMARCReportInS3(t *testing.T, client *s3.Client, testID string) (string, bool) {
	t.Helper()

	ctx := context.Background()

	// List objects in the dmarc-reports prefix
	prefix := "dmarc-reports/"
	result, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(minioBucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		t.Logf("Failed to list S3 objects: %v", err)
		return "", false
	}

	// Look for a report containing our test ID
	// We need to check the content since the key is a UUID
	for _, obj := range result.Contents {
		key := aws.ToString(obj.Key)

		// Skip if not an .eml file
		if !strings.HasSuffix(key, ".eml") {
			continue
		}

		// Get the object and check its content
		getResult, err := client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(minioBucket),
			Key:    aws.String(key),
		})
		if err != nil {
			continue
		}

		// Read a portion of the content to check for our test ID
		buf := make([]byte, 4096)
		n, _ := getResult.Body.Read(buf)
		getResult.Body.Close()

		if n > 0 && strings.Contains(string(buf[:n]), testID) {
			return key, true
		}
	}

	return "", false
}

// verifyDMARCReportContent verifies the stored report contains expected data
func verifyDMARCReportContent(t *testing.T, client *s3.Client, key, testID string) {
	t.Helper()

	ctx := context.Background()

	// Get the full report
	result, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(minioBucket),
		Key:    aws.String(key),
	})
	if err != nil {
		t.Fatalf("Failed to get DMARC report from S3: %v", err)
	}
	defer result.Body.Close()

	// Read the content
	buf := make([]byte, 65536)
	n, _ := result.Body.Read(buf)
	content := string(buf[:n])

	// Verify expected content
	checks := []struct {
		name    string
		pattern string
	}{
		{"Test ID", testID},
		{"From header", "noreply-dmarc-support@google.com"},
		{"DMARC domain", "hq.kibamail.xyz"},
		{"XML content", "<feedback>"},
		{"Report metadata", "<report_metadata>"},
		{"Policy published", "<policy_published>"},
		{"Auth results", "<auth_results>"},
	}

	for _, check := range checks {
		if !strings.Contains(content, check.pattern) {
			t.Errorf("DMARC report missing %s (expected: %q)", check.name, check.pattern)
		} else {
			t.Logf("Verified %s in report", check.name)
		}
	}
}

// TestDMARCReportRejectionForUnknownDomain tests that DMARC reports to unknown domains are rejected
func TestDMARCReportRejectionForUnknownDomain(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") != "1" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run.")
	}

	testID := uuid.New().String()[:8]

	// Try to send to an unknown domain (not dmarc.kbmta.net)
	unknownRecipient := fmt.Sprintf("test@unknown-domain-%s.example.com", testID)
	sender := "noreply-dmarc-support@google.com"

	email := fmt.Sprintf(`From: %s
To: %s
Subject: Test Email to Unknown Domain
Date: %s
Message-ID: <%s@test.local>
MIME-Version: 1.0
Content-Type: text/plain

This should be rejected.
`, sender, unknownRecipient, time.Now().UTC().Format(time.RFC1123Z), uuid.New().String())

	email = strings.ReplaceAll(email, "\n", "\r\n")

	// This should fail at RCPT TO stage
	err := sendDMARCReport(t, sender, unknownRecipient, email)
	if err == nil {
		t.Error("Expected rejection for unknown domain, but email was accepted")
	} else {
		t.Logf("Correctly rejected unknown domain: %v", err)
	}
}
