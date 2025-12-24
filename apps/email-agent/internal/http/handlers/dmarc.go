// Package handlers provides HTTP handlers for the email agent
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/observability"
	"github.com/kibamail/email-agent/internal/s3"
)

// maxDMARCReportSize limits the size of DMARC report emails (10MB)
const maxDMARCReportSize = 10 << 20

// DMARCPublisher interface for publishing DMARC events
type DMARCPublisher interface {
	Publish(ctx context.Context, subject string, payload interface{}) error
}

// DMARCStorage interface for storing DMARC reports
type DMARCStorage interface {
	Upload(ctx context.Context, key string, data []byte, contentType string) error
}

// DMARCHandler handles DMARC aggregate report HTTP requests from KumoMTA
type DMARCHandler struct {
	publisher DMARCPublisher
	storage   DMARCStorage
	logger    zerolog.Logger
	metrics   *observability.Metrics
}

// NewDMARCHandler creates a new DMARC handler
func NewDMARCHandler(
	publisher DMARCPublisher,
	storage DMARCStorage,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *DMARCHandler {
	return &DMARCHandler{
		publisher: publisher,
		storage:   storage,
		logger:    logger.With().Str("handler", "dmarc").Logger(),
		metrics:   metrics,
	}
}

// DMARCReportEvent is published to NATS for async processing
type DMARCReportEvent struct {
	ID          string    `json:"id"`
	ReceivedAt  time.Time `json:"received_at"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Subject     string    `json:"subject"`
	ContentType string    `json:"content_type"`
	S3Key       string    `json:"s3_key"`
	Size        int       `json:"size"`
}

// DMARCReportResponse is the response for DMARC report submission
type DMARCReportResponse struct {
	Success   bool   `json:"success"`
	ReportID  string `json:"report_id,omitempty"`
	Error     string `json:"error,omitempty"`
}

// ReceiveDMARCReport receives and processes DMARC aggregate reports
// POST /api/v1/dmarc/reports
//
// This endpoint is called by KumoMTA when it receives a DMARC aggregate report
// email at dmarc.kbmta.net. The raw email is stored in S3 and a processing
// event is published to NATS.
func (h *DMARCHandler) ReceiveDMARCReport(w http.ResponseWriter, r *http.Request) {
	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxDMARCReportSize)

	// Read the raw email content
	rawEmail, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to read DMARC report body")
		h.respondError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	if len(rawEmail) == 0 {
		h.respondError(w, http.StatusBadRequest, "empty request body")
		return
	}

	ctx := r.Context()

	// Generate unique report ID
	reportID := uuid.New().String()

	// Extract headers from raw email for metadata
	from := extractHeader(rawEmail, "From")
	to := extractHeader(rawEmail, "To")
	subject := extractHeader(rawEmail, "Subject")
	contentType := extractHeader(rawEmail, "Content-Type")

	h.logger.Info().
		Str("report_id", reportID).
		Str("from", from).
		Str("to", to).
		Str("subject", subject).
		Int("size", len(rawEmail)).
		Msg("received DMARC report")

	// Store raw email in S3
	s3Key := fmt.Sprintf("dmarc-reports/%s/%s.eml",
		time.Now().Format("2006/01/02"),
		reportID,
	)

	if err := h.storage.Upload(ctx, s3Key, rawEmail, "message/rfc822"); err != nil {
		h.logger.Error().Err(err).Str("report_id", reportID).Msg("failed to store DMARC report")
		h.respondError(w, http.StatusInternalServerError, "failed to store report")
		return
	}

	// Publish event for async processing
	event := DMARCReportEvent{
		ID:          reportID,
		ReceivedAt:  time.Now().UTC(),
		From:        from,
		To:          to,
		Subject:     subject,
		ContentType: contentType,
		S3Key:       s3Key,
		Size:        len(rawEmail),
	}

	if err := h.publisher.Publish(ctx, "DMARC.reports.received", event); err != nil {
		// Log but don't fail - the report is safely stored in S3
		h.logger.Warn().Err(err).Str("report_id", reportID).Msg("failed to publish DMARC event, report stored in S3")
	}

	if h.metrics != nil {
		h.metrics.DMARCReportsReceived.Inc()
	}

	h.respondJSON(w, http.StatusOK, DMARCReportResponse{
		Success:  true,
		ReportID: reportID,
	})
}

// extractHeader extracts a header value from raw email bytes
// This is a simple implementation that handles basic cases
func extractHeader(raw []byte, headerName string) string {
	content := string(raw)

	// Find header end (empty line)
	headerEnd := strings.Index(content, "\r\n\r\n")
	if headerEnd == -1 {
		headerEnd = strings.Index(content, "\n\n")
	}
	if headerEnd == -1 {
		headerEnd = len(content)
	}

	headers := content[:headerEnd]
	lines := strings.Split(headers, "\n")

	searchPrefix := strings.ToLower(headerName + ":")

	for i, line := range lines {
		line = strings.TrimRight(line, "\r")
		lowerLine := strings.ToLower(line)

		if strings.HasPrefix(lowerLine, searchPrefix) {
			value := strings.TrimSpace(line[len(headerName)+1:])

			// Handle folded headers (continuation lines starting with whitespace)
			for j := i + 1; j < len(lines); j++ {
				nextLine := strings.TrimRight(lines[j], "\r")
				if len(nextLine) > 0 && (nextLine[0] == ' ' || nextLine[0] == '\t') {
					value += " " + strings.TrimSpace(nextLine)
				} else {
					break
				}
			}

			return value
		}
	}

	return ""
}

// respondJSON sends a JSON response
func (h *DMARCHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// respondError sends an error response
func (h *DMARCHandler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, DMARCReportResponse{
		Success: false,
		Error:   message,
	})
}

// S3Adapter adapts the s3.Client to the DMARCStorage interface
type S3Adapter struct {
	client *s3.Client
}

// NewS3Adapter creates a new S3 adapter
func NewS3Adapter(client *s3.Client) *S3Adapter {
	return &S3Adapter{client: client}
}

// Upload uploads data to S3
func (a *S3Adapter) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	return a.client.Upload(ctx, key, data, contentType)
}
