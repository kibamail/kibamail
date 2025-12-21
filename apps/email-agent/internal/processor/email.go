// Package processor provides email processing pipeline
package processor

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/kumomta"
	"github.com/kibamail/email-agent/internal/observability"
	"github.com/kibamail/email-agent/internal/s3"
)

// Message interface for NATS message operations
// This allows using both nats.Msg and jetstream.Msg
type Message interface {
	Data() []byte
	Ack() error
	Nak() error
	Term() error
}

// NatsMsgAdapter wraps nats.Msg to implement the Message interface
type NatsMsgAdapter struct {
	Msg interface {
		Ack() error
		Nak() error
		Term() error
	}
	MsgData []byte
}

// Data returns the message data
func (a *NatsMsgAdapter) Data() []byte {
	return a.MsgData
}

// Ack acknowledges the message
func (a *NatsMsgAdapter) Ack() error {
	return a.Msg.Ack()
}

// Nak negatively acknowledges the message for retry
func (a *NatsMsgAdapter) Nak() error {
	return a.Msg.Nak()
}

// Term terminates the message (permanent failure)
func (a *NatsMsgAdapter) Term() error {
	return a.Msg.Term()
}

// EmailProcessor handles email processing pipeline
type EmailProcessor struct {
	s3Client   *s3.Client
	kumoClient *kumomta.Client
	logger     zerolog.Logger
	metrics    *observability.Metrics
}

// NewEmailProcessor creates a new email processor
func NewEmailProcessor(
	s3Client *s3.Client,
	kumoClient *kumomta.Client,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) *EmailProcessor {
	return &EmailProcessor{
		s3Client:   s3Client,
		kumoClient: kumoClient,
		logger:     logger.With().Str("component", "processor").Logger(),
		metrics:    metrics,
	}
}

// HandleMessage processes a NATS message containing an email injection request
func (p *EmailProcessor) HandleMessage(ctx context.Context, msg Message) error {
	start := time.Now()

	// Parse the email message
	var emailMsg domain.EmailMessage
	if err := json.Unmarshal(msg.Data(), &emailMsg); err != nil {
		p.logger.Error().Err(err).Msg("failed to unmarshal email message")
		// Terminate - malformed message won't be fixed by retry
		msg.Term()
		return kiberrors.Mark(err, kiberrors.ErrPermanent)
	}

	msgLogger := p.logger.With().
		Str("message_id", emailMsg.ID).
		Str("tenant_id", emailMsg.TenantID).
		Str("broadcast_id", emailMsg.BroadcastID).
		Str("recipient", emailMsg.Recipient.Email).
		Logger()

	msgLogger.Debug().Msg("processing email message")

	// Process the email
	err := p.processEmail(ctx, &emailMsg, msgLogger)

	duration := time.Since(start)

	if err != nil {
		if kiberrors.IsPermanent(err) {
			msgLogger.Error().
				Err(err).
				Dur("duration_ms", duration).
				Msg("email processing failed permanently - terminating")
			msg.Term()
			return err
		}

		// Transient error - NAK for retry
		msgLogger.Warn().
			Err(err).
			Dur("duration_ms", duration).
			Msg("email processing failed transiently - will retry")
		msg.Nak()
		return err
	}

	// Success - ACK the message
	if err := msg.Ack(); err != nil {
		msgLogger.Error().Err(err).Msg("failed to ACK message")
	}

	if p.metrics != nil {
		p.metrics.EmailsProcessed.Inc()
		p.metrics.EmailProcessingDuration.Observe(duration.Seconds())
	}

	msgLogger.Debug().
		Dur("duration_ms", duration).
		Msg("email processed successfully")

	return nil
}

// processEmail performs the actual email processing
func (p *EmailProcessor) processEmail(ctx context.Context, msg *domain.EmailMessage, logger zerolog.Logger) error {
	// 1. Download content from S3 (already processed by control plane)
	content, err := p.s3Client.DownloadEmailContent(ctx, msg.ContentKey)
	if err != nil {
		if kiberrors.Is(err, kiberrors.ErrContentNotFound) {
			return kiberrors.Mark(err, kiberrors.ErrPermanent)
		}
		return kiberrors.Mark(err, kiberrors.ErrTransient)
	}

	// 2. Download and encode attachments
	var attachments []kumomta.Attachment
	for _, att := range msg.Attachments {
		data, err := p.s3Client.DownloadAttachment(ctx, att.S3Key)
		if err != nil {
			logger.Error().
				Err(err).
				Str("s3_key", att.S3Key).
				Str("file_name", att.FileName).
				Msg("failed to download attachment")
			// Attachment failure is permanent - content is missing
			return kiberrors.Mark(err, kiberrors.ErrPermanent)
		}

		attachments = append(attachments, kumomta.Attachment{
			Data:        base64.StdEncoding.EncodeToString(data),
			Base64:      true,
			ContentType: att.ContentType,
			FileName:    att.FileName,
			ContentID:   att.ContentID,
		})

		logger.Debug().
			Str("file_name", att.FileName).
			Int("size_bytes", len(data)).
			Msg("attachment downloaded and encoded")
	}

	// 3. Build KumoMTA injection request
	req := &kumomta.InjectRequest{
		EnvelopeSender: msg.Sender.FullAddress(),
		Content: kumomta.ContentBuilder{
			HTMLBody: content.HTML,
			TextBody: content.Text,
			From: kumomta.EmailAddress{
				Email: msg.Sender.FullAddress(),
				Name:  msg.Sender.Name,
			},
			Subject:     msg.Subject,
			Attachments: attachments,
			Headers: map[string]string{
				"X-Kibamail-Tenant":    msg.TenantID,
				"X-Kibamail-Broadcast": msg.BroadcastID,
				"X-Kibamail-Contact":   msg.ContactID,
				"X-Kibamail-Message":   msg.ID,
			},
		},
		Recipients: []kumomta.Recipient{{
			Email: msg.Recipient.Email,
			Name:  msg.Recipient.Name,
		}},
		DeferredGeneration: true,
		TraceHeaders: &kumomta.TraceHeaders{
			SupplementalHeader: true,
			HeaderName:         "X-Kibamail-Ref",
			IncludeMetaNames:   []string{"tenant_id", "broadcast_id", "contact_id", "message_id"},
		},
	}

	// Add reply-to if specified
	if msg.ReplyTo != nil {
		req.Content.ReplyTo = &kumomta.EmailAddress{
			Email: msg.ReplyTo.Email,
			Name:  msg.ReplyTo.Name,
		}
	}

	// Add metadata headers
	for k, v := range msg.Metadata {
		req.Content.Headers["X-Kibamail-Meta-"+k] = v
	}

	// 4. Inject into KumoMTA
	resp, err := p.kumoClient.Inject(ctx, req)
	if err != nil {
		return err
	}

	// 5. Check injection result
	if resp.FailCount > 0 {
		logger.Warn().
			Int("success", resp.SuccessCount).
			Int("failed", resp.FailCount).
			Interface("errors", resp.Errors).
			Msg("partial injection failure")

		if resp.SuccessCount == 0 {
			// Complete failure
			if p.metrics != nil {
				p.metrics.EmailInjectionFailures.Inc()
			}
			return kiberrors.Mark(kiberrors.ErrInjectionFailed, kiberrors.ErrTransient)
		}
	}

	if p.metrics != nil {
		p.metrics.EmailsInjected.Inc()
	}

	logger.Debug().
		Int("success", resp.SuccessCount).
		Strs("ids", resp.IDs).
		Int("attachments", len(attachments)).
		Msg("email injected into KumoMTA")

	return nil
}

