// Package nats provides NATS JetStream publisher for event publishing
package nats

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// Publisher publishes events to NATS JetStream
type Publisher struct {
	js      nats.JetStreamContext
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewPublisher creates a new NATS publisher
func NewPublisher(js nats.JetStreamContext, logger zerolog.Logger, metrics *observability.Metrics) *Publisher {
	return &Publisher{
		js:      js,
		logger:  logger.With().Str("component", "publisher").Logger(),
		metrics: metrics,
	}
}

// Publish publishes a message to a subject
func (p *Publisher) Publish(ctx context.Context, subject string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return kiberrors.Wrap(err, "failed to marshal payload")
	}

	_, err = p.js.Publish(subject, data)
	if err != nil {
		if p.metrics != nil {
			p.metrics.NATSPublishErrors.Inc()
		}
		return kiberrors.Wrap(err, "failed to publish message")
	}

	if p.metrics != nil {
		p.metrics.NATSMessagesPublished.Inc()
	}

	p.logger.Debug().
		Str("subject", subject).
		Int("size", len(data)).
		Msg("message published")

	return nil
}

// PublishAsync publishes a message asynchronously and returns a PubAckFuture
func (p *Publisher) PublishAsync(subject string, payload interface{}) (nats.PubAckFuture, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to marshal payload")
	}

	future, err := p.js.PublishAsync(subject, data)
	if err != nil {
		if p.metrics != nil {
			p.metrics.NATSPublishErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to publish async message")
	}

	return future, nil
}

// PublishRaw publishes raw bytes to a subject
func (p *Publisher) PublishRaw(ctx context.Context, subject string, data []byte) error {
	_, err := p.js.Publish(subject, data)
	if err != nil {
		if p.metrics != nil {
			p.metrics.NATSPublishErrors.Inc()
		}
		return kiberrors.Wrap(err, "failed to publish raw message")
	}

	if p.metrics != nil {
		p.metrics.NATSMessagesPublished.Inc()
	}

	return nil
}
