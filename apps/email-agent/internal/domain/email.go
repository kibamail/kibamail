// Package domain contains domain types for the email agent
package domain

// EmailMessage is the NATS message payload for email injection requests.
// The control plane has already processed templates - content is ready to send.
type EmailMessage struct {
	ID          string             `json:"id"`           // Unique message ID
	TenantID    string             `json:"tenant_id"`    // Workspace/tenant ID
	BroadcastID string             `json:"broadcast_id"` // Broadcast campaign ID
	ContactID   string             `json:"contact_id"`   // Contact ID
	Recipient   EmailRecipient     `json:"recipient"`    // Recipient details
	Sender      EmailSender        `json:"sender"`       // Sender details
	ReplyTo     *EmailAddress      `json:"reply_to"`     // Optional reply-to address
	Subject     string             `json:"subject"`      // Email subject
	PreviewText string             `json:"preview_text"` // Preview text for email clients
	ContentKey  string             `json:"content_key"`  // S3 key prefix for content (HTML/text)
	Attachments []EmailAttachment  `json:"attachments"`  // Attachments to include
	Metadata    map[string]string  `json:"metadata"`     // Additional metadata
	TrackOpens  bool               `json:"track_opens"`  // Track email opens
	TrackClicks bool               `json:"track_clicks"` // Track link clicks
}

// EmailRecipient contains recipient information
type EmailRecipient struct {
	Email string `json:"email"` // Recipient email address
	Name  string `json:"name"`  // Recipient display name
}

// EmailSender contains sender information
type EmailSender struct {
	Email  string `json:"email"`  // Sender local part (before @)
	Name   string `json:"name"`   // Sender display name
	Domain string `json:"domain"` // Sender domain
}

// EmailAddress represents a simple email address with optional name
type EmailAddress struct {
	Email string `json:"email"` // Email address
	Name  string `json:"name"`  // Display name
}

// EmailAttachment represents an attachment to be downloaded from S3
type EmailAttachment struct {
	S3Key       string `json:"s3_key"`       // S3 key where attachment is stored
	FileName    string `json:"file_name"`    // Original file name
	ContentType string `json:"content_type"` // MIME type (e.g., "application/pdf")
	ContentID   string `json:"content_id"`   // Optional Content-ID for inline images
}

// EmailContent contains the downloaded email content
type EmailContent struct {
	HTML string `json:"html"` // HTML body
	Text string `json:"text"` // Plain text body
}

// FullAddress returns the full email address
func (s EmailSender) FullAddress() string {
	return s.Email + "@" + s.Domain
}
