package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
)

// mockDMARCPublisher is a mock implementation of DMARCPublisher
type mockDMARCPublisher struct {
	published []dmarcPublishedEvent
}

type dmarcPublishedEvent struct {
	subject string
	payload interface{}
}

func newMockDMARCPublisher() *mockDMARCPublisher {
	return &mockDMARCPublisher{
		published: make([]dmarcPublishedEvent, 0),
	}
}

func (m *mockDMARCPublisher) Publish(ctx context.Context, subject string, payload interface{}) error {
	m.published = append(m.published, dmarcPublishedEvent{subject: subject, payload: payload})
	return nil
}

// mockDMARCStorage is a mock implementation of DMARCStorage
type mockDMARCStorage struct {
	uploaded map[string][]byte
}

func newMockDMARCStorage() *mockDMARCStorage {
	return &mockDMARCStorage{
		uploaded: make(map[string][]byte),
	}
}

func (m *mockDMARCStorage) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	m.uploaded[key] = data
	return nil
}

func TestDMARCHandler_ReceiveDMARCReport_EmptyBody(t *testing.T) {
	publisher := newMockDMARCPublisher()
	storage := newMockDMARCStorage()
	handler := NewDMARCHandler(publisher, storage, zerolog.Nop(), nil)

	r := chi.NewRouter()
	r.Post("/api/v1/dmarc/reports", handler.ReceiveDMARCReport)

	req := httptest.NewRequest("POST", "/api/v1/dmarc/reports", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var response DMARCReportResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Success {
		t.Error("expected Success to be false")
	}

	if response.Error != "empty request body" {
		t.Errorf("expected error 'empty request body', got '%s'", response.Error)
	}
}

func TestDMARCHandler_ReceiveDMARCReport_ValidReport(t *testing.T) {
	publisher := newMockDMARCPublisher()
	storage := newMockDMARCStorage()
	handler := NewDMARCHandler(publisher, storage, zerolog.Nop(), nil)

	// Simulate a raw DMARC report email
	rawEmail := `From: dmarc@google.com
To: dmarc-reports@dmarc.kbmta.net
Subject: Report Domain: example.com
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: application/gzip
Content-Disposition: attachment; filename="google.com!example.com!1704067200!1704153599.xml.gz"

<fake gzip content here>
--boundary--`

	r := chi.NewRouter()
	r.Post("/api/v1/dmarc/reports", handler.ReceiveDMARCReport)

	req := httptest.NewRequest("POST", "/api/v1/dmarc/reports", bytes.NewBufferString(rawEmail))
	req.Header.Set("Content-Type", "message/rfc822")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response DMARCReportResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Success {
		t.Errorf("expected Success to be true, got error: %s", response.Error)
	}

	if response.ReportID == "" {
		t.Error("expected ReportID to be set")
	}

	// Verify it was stored in S3
	if len(storage.uploaded) != 1 {
		t.Errorf("expected 1 upload, got %d", len(storage.uploaded))
	}

	// Verify event was published
	if len(publisher.published) != 1 {
		t.Errorf("expected 1 published event, got %d", len(publisher.published))
	}

	if publisher.published[0].subject != "DMARC.reports.received" {
		t.Errorf("expected subject 'DMARC.reports.received', got '%s'", publisher.published[0].subject)
	}
}

func TestDMARCHandler_ReceiveDMARCReport_ExtractsHeaders(t *testing.T) {
	publisher := newMockDMARCPublisher()
	storage := newMockDMARCStorage()
	handler := NewDMARCHandler(publisher, storage, zerolog.Nop(), nil)

	rawEmail := `From: noreply-dmarc-support@google.com
To: dmarc@dmarc.kbmta.net
Subject: Report Domain: testdomain.com Submitter: google.com Report-ID: 123456
Content-Type: multipart/related; boundary="000000000000abc"

--000000000000abc
Content-Type: text/plain

DMARC report attached.
--000000000000abc--`

	r := chi.NewRouter()
	r.Post("/api/v1/dmarc/reports", handler.ReceiveDMARCReport)

	req := httptest.NewRequest("POST", "/api/v1/dmarc/reports", bytes.NewBufferString(rawEmail))
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify the event has correct metadata
	if len(publisher.published) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(publisher.published))
	}

	event, ok := publisher.published[0].payload.(DMARCReportEvent)
	if !ok {
		t.Fatalf("expected DMARCReportEvent payload")
	}

	if event.From != "noreply-dmarc-support@google.com" {
		t.Errorf("expected From 'noreply-dmarc-support@google.com', got '%s'", event.From)
	}

	if event.To != "dmarc@dmarc.kbmta.net" {
		t.Errorf("expected To 'dmarc@dmarc.kbmta.net', got '%s'", event.To)
	}

	expectedSubject := "Report Domain: testdomain.com Submitter: google.com Report-ID: 123456"
	if event.Subject != expectedSubject {
		t.Errorf("expected Subject '%s', got '%s'", expectedSubject, event.Subject)
	}
}

func TestExtractHeader(t *testing.T) {
	tests := []struct {
		name       string
		rawEmail   string
		headerName string
		expected   string
	}{
		{
			name: "simple from header",
			rawEmail: `From: test@example.com
To: recipient@example.com
Subject: Test

Body`,
			headerName: "From",
			expected:   "test@example.com",
		},
		{
			name: "to header",
			rawEmail: `From: test@example.com
To: recipient@example.com
Subject: Test

Body`,
			headerName: "To",
			expected:   "recipient@example.com",
		},
		{
			name: "subject header",
			rawEmail: `From: test@example.com
Subject: This is a test subject
To: recipient@example.com

Body`,
			headerName: "Subject",
			expected:   "This is a test subject",
		},
		{
			name: "missing header",
			rawEmail: `From: test@example.com
To: recipient@example.com

Body`,
			headerName: "Subject",
			expected:   "",
		},
		{
			name: "case insensitive",
			rawEmail: `FROM: test@example.com
TO: recipient@example.com

Body`,
			headerName: "from",
			expected:   "test@example.com",
		},
		{
			name: "folded header",
			rawEmail: `From: test@example.com
Subject: This is a very long subject line
 that has been folded
To: recipient@example.com

Body`,
			headerName: "Subject",
			expected:   "This is a very long subject line that has been folded",
		},
		{
			name: "CRLF line endings",
			rawEmail: "From: test@example.com\r\nTo: recipient@example.com\r\n\r\nBody",
			headerName: "From",
			expected:   "test@example.com",
		},
		{
			name: "empty email",
			rawEmail: "",
			headerName: "From",
			expected:   "",
		},
		{
			name: "no body separator",
			rawEmail: `From: test@example.com
To: recipient@example.com`,
			headerName: "From",
			expected:   "test@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractHeader([]byte(tt.rawEmail), tt.headerName)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestDMARCHandler_ReceiveDMARCReport_S3KeyFormat(t *testing.T) {
	publisher := newMockDMARCPublisher()
	storage := newMockDMARCStorage()
	handler := NewDMARCHandler(publisher, storage, zerolog.Nop(), nil)

	rawEmail := `From: dmarc@example.com
Subject: DMARC Report

Report content`

	r := chi.NewRouter()
	r.Post("/api/v1/dmarc/reports", handler.ReceiveDMARCReport)

	req := httptest.NewRequest("POST", "/api/v1/dmarc/reports", bytes.NewBufferString(rawEmail))
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Verify S3 key format
	if len(storage.uploaded) != 1 {
		t.Fatalf("expected 1 upload, got %d", len(storage.uploaded))
	}

	for key := range storage.uploaded {
		// Key should start with "dmarc-reports/"
		if len(key) < 14 || key[:14] != "dmarc-reports/" {
			t.Errorf("expected key to start with 'dmarc-reports/', got '%s'", key)
		}

		// Key should end with ".eml"
		if len(key) < 4 || key[len(key)-4:] != ".eml" {
			t.Errorf("expected key to end with '.eml', got '%s'", key)
		}
	}
}
