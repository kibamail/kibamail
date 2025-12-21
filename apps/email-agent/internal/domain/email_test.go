package domain

import "testing"

func TestEmailSender_FullAddress(t *testing.T) {
	tests := []struct {
		name     string
		sender   EmailSender
		expected string
	}{
		{
			name: "standard address",
			sender: EmailSender{
				Email:  "hello",
				Name:   "Company",
				Domain: "mail.example.com",
			},
			expected: "hello@mail.example.com",
		},
		{
			name: "no-reply address",
			sender: EmailSender{
				Email:  "no-reply",
				Name:   "",
				Domain: "notifications.example.com",
			},
			expected: "no-reply@notifications.example.com",
		},
		{
			name: "simple domain",
			sender: EmailSender{
				Email:  "info",
				Name:   "Info",
				Domain: "example.com",
			},
			expected: "info@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sender.FullAddress()
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestEmailRecipient_Fields(t *testing.T) {
	recipient := EmailRecipient{
		Email: "user@example.com",
		Name:  "John Doe",
	}

	if recipient.Email != "user@example.com" {
		t.Errorf("expected email 'user@example.com', got '%s'", recipient.Email)
	}

	if recipient.Name != "John Doe" {
		t.Errorf("expected name 'John Doe', got '%s'", recipient.Name)
	}
}

func TestEmailAttachment_Fields(t *testing.T) {
	att := EmailAttachment{
		S3Key:       "attachments/report.pdf",
		FileName:    "monthly-report.pdf",
		ContentType: "application/pdf",
		ContentID:   "report-inline",
	}

	if att.S3Key != "attachments/report.pdf" {
		t.Errorf("expected S3Key 'attachments/report.pdf', got '%s'", att.S3Key)
	}

	if att.FileName != "monthly-report.pdf" {
		t.Errorf("expected FileName 'monthly-report.pdf', got '%s'", att.FileName)
	}

	if att.ContentType != "application/pdf" {
		t.Errorf("expected ContentType 'application/pdf', got '%s'", att.ContentType)
	}

	if att.ContentID != "report-inline" {
		t.Errorf("expected ContentID 'report-inline', got '%s'", att.ContentID)
	}
}

func TestEmailMessage_Fields(t *testing.T) {
	msg := EmailMessage{
		ID:          "msg_123",
		TenantID:    "ws_456",
		BroadcastID: "brd_789",
		ContactID:   "cnt_abc",
		Subject:     "Welcome!",
		ContentKey:  "broadcasts/brd_789/content",
		TrackOpens:  true,
		TrackClicks: true,
		Recipient: EmailRecipient{
			Email: "user@example.com",
			Name:  "User",
		},
		Sender: EmailSender{
			Email:  "hello",
			Name:   "Company",
			Domain: "mail.example.com",
		},
		Metadata: map[string]string{
			"campaign": "welcome-series",
		},
	}

	if msg.ID != "msg_123" {
		t.Errorf("expected ID 'msg_123', got '%s'", msg.ID)
	}

	if msg.Sender.FullAddress() != "hello@mail.example.com" {
		t.Errorf("expected sender address 'hello@mail.example.com', got '%s'", msg.Sender.FullAddress())
	}

	if !msg.TrackOpens {
		t.Error("expected TrackOpens to be true")
	}

	if !msg.TrackClicks {
		t.Error("expected TrackClicks to be true")
	}

	if msg.Metadata["campaign"] != "welcome-series" {
		t.Errorf("expected campaign 'welcome-series', got '%s'", msg.Metadata["campaign"])
	}
}

func TestEmailContent_Fields(t *testing.T) {
	content := EmailContent{
		HTML: "<html><body><h1>Hello</h1></body></html>",
		Text: "Hello",
	}

	if content.HTML == "" {
		t.Error("expected HTML content to be non-empty")
	}

	if content.Text == "" {
		t.Error("expected Text content to be non-empty")
	}
}
