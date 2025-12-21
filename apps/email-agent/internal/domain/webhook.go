// Package domain contains domain types for the email agent
package domain

import "time"

// KumoMTAWebhook represents a webhook payload from KumoMTA
// See: https://docs.kumomta.com/reference/log_record/
type KumoMTAWebhook struct {
	Type                 string                 `json:"type"`                  // Delivery, Bounce, TransientFailure, etc.
	ID                   string                 `json:"id"`                    // Message ID
	Sender               string                 `json:"sender"`                // Envelope sender
	Recipient            string                 `json:"recipient"`             // Recipient email
	Queue                string                 `json:"queue"`                 // Queue name
	Site                 string                 `json:"site"`                  // Destination site
	Size                 int                    `json:"size"`                  // Message size
	Response             WebhookResponse        `json:"response"`              // SMTP response
	PeerAddress          WebhookPeerAddress     `json:"peer_address"`          // Remote server address
	Timestamp            int64                  `json:"timestamp"`             // Unix timestamp
	EventTime            time.Time              `json:"event_time"`            // Event timestamp (RFC3339)
	Created              int64                  `json:"created"`               // Message creation Unix timestamp
	CreatedTime          time.Time              `json:"created_time"`          // Message creation time (RFC3339)
	NumAttempts          int                    `json:"num_attempts"`          // Number of delivery attempts
	BounceClassification string                 `json:"bounce_classification"` // Bounce classification
	EgressPool           string                 `json:"egress_pool"`           // Egress pool name
	EgressSource         string                 `json:"egress_source"`         // Egress source name
	SourceAddress        *WebhookSourceAddress  `json:"source_address"`        // Local source address
	FeedbackReport       interface{}            `json:"feedback_report"`       // ARF feedback report
	Meta                 map[string]interface{} `json:"meta"`                  // Custom metadata
	Headers              map[string]string      `json:"headers"`               // Captured headers
	DeliveryProtocol     string                 `json:"delivery_protocol"`     // Delivery protocol
	ReceptionProtocol    string                 `json:"reception_protocol"`    // Reception protocol
	NodeID               string                 `json:"nodeid"`                // KumoMTA node ID
	SessionID            string                 `json:"session_id"`            // Session ID
}

// WebhookResponse contains SMTP response details
type WebhookResponse struct {
	Code         int                   `json:"code"`          // SMTP response code
	EnhancedCode *WebhookEnhancedCode  `json:"enhanced_code"` // Enhanced status code
	Content      string                `json:"content"`       // Response message
	Command      string                `json:"command"`       // SMTP command
}

// WebhookEnhancedCode contains the enhanced status code parts
type WebhookEnhancedCode struct {
	Class   int `json:"class"`
	Subject int `json:"subject"`
	Detail  int `json:"detail"`
}

// WebhookPeerAddress contains the remote server address info
type WebhookPeerAddress struct {
	Name string `json:"name"` // Resolved hostname
	Addr string `json:"addr"` // IP address
}

// WebhookSourceAddress contains the local source address
type WebhookSourceAddress struct {
	Address string `json:"address"` // IP:port
}

// EmailEvent represents an email event to publish to NATS
type EmailEvent struct {
	Type                 string          `json:"type"`                  // Event type
	SendingID            string          `json:"sending_id"`            // Original message ID
	Recipient            string          `json:"recipient"`             // Recipient email
	TenantID             string          `json:"tenant_id"`             // Tenant/workspace ID
	BroadcastID          string          `json:"broadcast_id"`          // Broadcast ID
	ContactID            string          `json:"contact_id"`            // Contact ID
	Response             WebhookResponse `json:"response"`              // SMTP response
	BounceClassification string          `json:"bounce_classification"` // Bounce classification
	Timestamp            time.Time       `json:"timestamp"`             // Event timestamp
	NodeID               string          `json:"node_id"`               // KumoMTA node ID
}

// Webhook types from KumoMTA
const (
	WebhookTypeDelivery         = "Delivery"
	WebhookTypeBounce           = "Bounce"
	WebhookTypeTransientFailure = "TransientFailure"
	WebhookTypeFeedback         = "Feedback"
	WebhookTypeInjection        = "Injection"
	WebhookTypeReception        = "Reception"
	WebhookTypeExpiration       = "Expiration"
	WebhookTypeAdminBounce      = "AdminBounce"
)
