// Package handlers provides HTTP handlers for the email agent
package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	"github.com/kibamail/email-agent/internal/nats"
	"github.com/kibamail/email-agent/internal/observability"
)

// maxWebhookBodySize limits incoming webhook payload size (50MB)
const maxWebhookBodySize = 50 << 20

// maxWebhookBatchSize limits the number of webhooks in a single batch
const maxWebhookBatchSize = 1000

// WebhookHandler handles KumoMTA webhook requests
type WebhookHandler struct {
	publisher *nats.Publisher
	logger    zerolog.Logger
	metrics   *observability.Metrics
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(
	publisher *nats.Publisher,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *WebhookHandler {
	return &WebhookHandler{
		publisher: publisher,
		logger:    logger.With().Str("handler", "webhook").Logger(),
		metrics:   metrics,
	}
}

// HandleWebhook receives webhooks from KumoMTA and publishes them to NATS
// POST /webhooks
// Optimized for high throughput with async NATS publishing
func (h *WebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()

	// Track active webhooks for metrics
	if h.metrics != nil {
		h.metrics.WebhooksInFlight.Inc()
		defer h.metrics.WebhooksInFlight.Dec()
	}

	// Limit request body size to prevent memory exhaustion
	limitedReader := io.LimitReader(r.Body, maxWebhookBodySize)

	// KumoMTA sends webhooks as an array of events
	var webhooks []domain.KumoMTAWebhook
	if err := json.NewDecoder(limitedReader).Decode(&webhooks); err != nil {
		h.logger.Warn().Err(err).Msg("failed to decode webhook payload")
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	// Log warning for unusually large batches (but process ALL events - never drop customer data)
	if len(webhooks) > maxWebhookBatchSize {
		h.logger.Warn().
			Int("received", len(webhooks)).
			Int("threshold", maxWebhookBatchSize).
			Msg("received unusually large webhook batch - processing all events")
	}

	// Track batch size
	if h.metrics != nil {
		h.metrics.WebhookBatchSize.Observe(float64(len(webhooks)))
	}

	h.logger.Debug().
		Int("count", len(webhooks)).
		Msg("received webhooks from KumoMTA")

	// Process webhooks concurrently for high throughput
	// Use a worker pool pattern to limit concurrency
	const maxConcurrency = 50
	semaphore := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	var publishErrors int32
	var errorsMu sync.Mutex

	for i := range webhooks {
		wh := &webhooks[i] // Use pointer to avoid copying

		// Update received metrics
		if h.metrics != nil {
			h.metrics.WebhooksReceived.WithLabelValues(wh.Type).Inc()
		}

		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore

		go func(wh *domain.KumoMTAWebhook) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore

			// Extract metadata from the webhook
			tenantID := extractString(wh.Meta, "tenant_id")
			broadcastID := extractString(wh.Meta, "broadcast_id")
			contactID := extractString(wh.Meta, "contact_id")

			// Build event for NATS
			event := domain.EmailEvent{
				Type:                 wh.Type,
				SendingID:            wh.ID,
				Recipient:            wh.Recipient,
				TenantID:             tenantID,
				BroadcastID:          broadcastID,
				ContactID:            contactID,
				Response:             wh.Response,
				BounceClassification: wh.BounceClassification,
				Timestamp:            wh.EventTime,
				NodeID:               wh.NodeID,
			}

			// Publish to NATS EVENTS stream
			subject := h.buildSubject(wh.Type, tenantID)

			if err := h.publisher.Publish(ctx, subject, event); err != nil {
				h.logger.Error().
					Err(err).
					Str("type", wh.Type).
					Str("recipient", wh.Recipient).
					Str("tenant_id", tenantID).
					Msg("failed to publish webhook event")

				errorsMu.Lock()
				publishErrors++
				errorsMu.Unlock()

				if h.metrics != nil {
					h.metrics.WebhookPublishErrors.Inc()
				}
				return
			}

			if h.metrics != nil {
				h.metrics.WebhooksPublished.Inc()
			}
		}(wh)
	}

	// Wait for all publishes to complete
	wg.Wait()

	duration := time.Since(start)
	if h.metrics != nil {
		h.metrics.WebhookProcessDuration.Observe(duration.Seconds())
	}

	// Log summary
	if publishErrors > 0 {
		h.logger.Warn().
			Int("total", len(webhooks)).
			Int32("errors", publishErrors).
			Dur("duration", duration).
			Msg("webhook processing completed with errors")
	} else {
		h.logger.Debug().
			Int("total", len(webhooks)).
			Dur("duration", duration).
			Msg("webhook processing completed successfully")
	}

	// Always return 200 OK to KumoMTA to prevent retries
	w.WriteHeader(http.StatusOK)
}

// buildSubject constructs the NATS subject for the event
func (h *WebhookHandler) buildSubject(eventType, tenantID string) string {
	// Normalize event type to lowercase
	normalizedType := strings.ToLower(eventType)

	// Subject format: kibamail.events.<type>
	// If tenant ID is available, include it for routing
	if tenantID != "" {
		return "kibamail.events." + normalizedType + "." + tenantID
	}
	return "kibamail.events." + normalizedType
}

// extractString safely extracts a string from a map
func extractString(m map[string]interface{}, key string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
