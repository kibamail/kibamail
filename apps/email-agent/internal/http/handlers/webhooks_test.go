package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
)

// mockPublisher is a mock NATS publisher for testing
type mockPublisher struct {
	published []publishedEvent
	shouldErr bool
}

type publishedEvent struct {
	subject string
	event   domain.EmailEvent
}

func newMockPublisher() *mockPublisher {
	return &mockPublisher{
		published: make([]publishedEvent, 0),
	}
}

func (m *mockPublisher) Publish(ctx context.Context, subject string, data interface{}) error {
	if m.shouldErr {
		return &mockError{msg: "publish failed"}
	}
	if event, ok := data.(domain.EmailEvent); ok {
		m.published = append(m.published, publishedEvent{
			subject: subject,
			event:   event,
		})
	}
	return nil
}

type mockError struct {
	msg string
}

func (e *mockError) Error() string {
	return e.msg
}

// testWebhookHandler wraps the logic for testing without requiring real NATS
type testWebhookHandler struct {
	publisher *mockPublisher
	logger    zerolog.Logger
}

func newTestWebhookHandler(pub *mockPublisher) *testWebhookHandler {
	return &testWebhookHandler{
		publisher: pub,
		logger:    zerolog.Nop(),
	}
}

func (h *testWebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	var webhooks []domain.KumoMTAWebhook
	if err := json.NewDecoder(r.Body).Decode(&webhooks); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	for _, wh := range webhooks {
		tenantID := extractString(wh.Meta, "tenant_id")
		broadcastID := extractString(wh.Meta, "broadcast_id")
		contactID := extractString(wh.Meta, "contact_id")

		event := domain.EmailEvent{
			Type:                 wh.Type,
			SendingID:            wh.ID,
			Recipient:            wh.Recipient,
			TenantID:             tenantID,
			BroadcastID:          broadcastID,
			ContactID:            contactID,
			Response:             wh.Response,
			BounceClassification: wh.BounceClassification,
			Timestamp:            wh.EventTime, // Use RFC3339 timestamp
			NodeID:               wh.NodeID,
		}

		subject := h.buildSubject(wh.Type, tenantID)
		h.publisher.Publish(ctx, subject, event)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *testWebhookHandler) buildSubject(eventType, tenantID string) string {
	normalizedType := eventType
	if tenantID != "" {
		return "kibamail.events." + normalizedType + "." + tenantID
	}
	return "kibamail.events." + normalizedType
}

func TestHandleWebhook_InvalidPayload(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBufferString("not json"))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestHandleWebhook_EmptyArray(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	payload := []domain.KumoMTAWebhook{}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if len(pub.published) != 0 {
		t.Errorf("expected 0 published events, got %d", len(pub.published))
	}
}

func TestHandleWebhook_SingleDelivery(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	payload := []domain.KumoMTAWebhook{
		{
			Type:      "Delivery",
			ID:        "msg_123",
			Recipient: "user@example.com",
			Timestamp: time.Now().Unix(),
			EventTime: time.Now(),
			Meta: map[string]interface{}{
				"tenant_id":    "ws_abc",
				"broadcast_id": "brd_456",
				"contact_id":   "cnt_789",
			},
			Response: domain.WebhookResponse{
				Code:         250,
				EnhancedCode: &domain.WebhookEnhancedCode{Class: 2, Subject: 0, Detail: 0},
				Content:      "OK",
			},
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if len(pub.published) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(pub.published))
	}

	event := pub.published[0]
	if event.subject != "kibamail.events.Delivery.ws_abc" {
		t.Errorf("expected subject 'kibamail.events.Delivery.ws_abc', got '%s'", event.subject)
	}

	if event.event.Type != "Delivery" {
		t.Errorf("expected type 'Delivery', got '%s'", event.event.Type)
	}

	if event.event.TenantID != "ws_abc" {
		t.Errorf("expected tenant_id 'ws_abc', got '%s'", event.event.TenantID)
	}

	if event.event.BroadcastID != "brd_456" {
		t.Errorf("expected broadcast_id 'brd_456', got '%s'", event.event.BroadcastID)
	}

	if event.event.ContactID != "cnt_789" {
		t.Errorf("expected contact_id 'cnt_789', got '%s'", event.event.ContactID)
	}
}

func TestHandleWebhook_MultipleEvents(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	payload := []domain.KumoMTAWebhook{
		{
			Type:      "Delivery",
			ID:        "msg_1",
			Recipient: "user1@example.com",
			Meta:      map[string]interface{}{"tenant_id": "ws_1"},
		},
		{
			Type:                 "Bounce",
			ID:                   "msg_2",
			Recipient:            "user2@example.com",
			Meta:                 map[string]interface{}{"tenant_id": "ws_2"},
			BounceClassification: "InvalidRecipient",
			Response: domain.WebhookResponse{
				Code: 550,
			},
		},
		{
			Type:      "TransientFailure",
			ID:        "msg_3",
			Recipient: "user3@example.com",
			Meta:      map[string]interface{}{"tenant_id": "ws_1"},
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if len(pub.published) != 3 {
		t.Fatalf("expected 3 published events, got %d", len(pub.published))
	}

	// Verify each event type
	types := make(map[string]bool)
	for _, e := range pub.published {
		types[e.event.Type] = true
	}

	expectedTypes := []string{"Delivery", "Bounce", "TransientFailure"}
	for _, et := range expectedTypes {
		if !types[et] {
			t.Errorf("expected event type '%s' to be published", et)
		}
	}
}

func TestHandleWebhook_NoTenantID(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	payload := []domain.KumoMTAWebhook{
		{
			Type:      "Delivery",
			ID:        "msg_123",
			Recipient: "user@example.com",
			Meta:      map[string]interface{}{}, // No tenant_id
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	if len(pub.published) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(pub.published))
	}

	// Subject should not include tenant_id
	event := pub.published[0]
	if event.subject != "kibamail.events.Delivery" {
		t.Errorf("expected subject 'kibamail.events.Delivery', got '%s'", event.subject)
	}
}

func TestBuildSubject(t *testing.T) {
	handler := &testWebhookHandler{logger: zerolog.Nop()}

	tests := []struct {
		name     string
		evtType  string
		tenantID string
		expected string
	}{
		{
			name:     "with tenant ID",
			evtType:  "Delivery",
			tenantID: "ws_123",
			expected: "kibamail.events.Delivery.ws_123",
		},
		{
			name:     "without tenant ID",
			evtType:  "Bounce",
			tenantID: "",
			expected: "kibamail.events.Bounce",
		},
		{
			name:     "transient failure",
			evtType:  "TransientFailure",
			tenantID: "ws_abc",
			expected: "kibamail.events.TransientFailure.ws_abc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.buildSubject(tt.evtType, tt.tenantID)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestHandleWebhook_BounceClassification(t *testing.T) {
	pub := newMockPublisher()
	handler := newTestWebhookHandler(pub)

	payload := []domain.KumoMTAWebhook{
		{
			Type:                 "Bounce",
			ID:                   "msg_bounce",
			Recipient:            "invalid@example.com",
			BounceClassification: "InvalidRecipient",
			Meta: map[string]interface{}{
				"tenant_id": "ws_test",
			},
			Response: domain.WebhookResponse{
				Code:         550,
				EnhancedCode: &domain.WebhookEnhancedCode{Class: 5, Subject: 1, Detail: 1},
				Content:      "User unknown",
			},
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webhooks", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	handler.HandleWebhook(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	event := pub.published[0]
	if event.event.BounceClassification != "InvalidRecipient" {
		t.Errorf("expected bounce classification 'InvalidRecipient', got '%s'",
			event.event.BounceClassification)
	}
}
