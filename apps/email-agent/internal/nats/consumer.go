// Package nats provides NATS JetStream consumer for high-throughput message processing
package nats

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/observability"
)

// Consumer handles high-throughput message consumption from JetStream
// Designed for 5000+ messages/second with multiple concurrent fetchers
type Consumer struct {
	js           nats.JetStreamContext
	sub          *nats.Subscription
	streamName   string
	consumerName string
	fetchBatch   int
	fetchWorkers int
	logger       zerolog.Logger
	metrics      *observability.Metrics

	wg      sync.WaitGroup
	stopCh  chan struct{}
	stopped bool
	stopMu  sync.Mutex
}

// ConsumerConfig contains consumer configuration
type ConsumerConfig struct {
	StreamName   string
	ConsumerName string
	FetchBatch   int // Number of messages to fetch per batch
	FetchWorkers int // Number of concurrent fetcher goroutines
}

// Message interface for message operations
type Message interface {
	Data() []byte
	Ack() error
	Nak() error
	Term() error
}

// MessageHandler processes a single message
type MessageHandler func(ctx context.Context, msg Message) error

// natsMsgAdapter wraps nats.Msg to implement the Message interface
type natsMsgAdapter struct {
	msg *nats.Msg
}

func (a *natsMsgAdapter) Data() []byte { return a.msg.Data }
func (a *natsMsgAdapter) Ack() error   { return a.msg.Ack() }
func (a *natsMsgAdapter) Nak() error   { return a.msg.Nak() }
func (a *natsMsgAdapter) Term() error  { return a.msg.Term() }

// NewConsumer creates a new high-throughput consumer
// It binds to an EXISTING consumer (created by Ansible) and does not create new consumers
func NewConsumer(
	js nats.JetStreamContext,
	cfg ConsumerConfig,
	logger zerolog.Logger,
	metrics *observability.Metrics,
) (*Consumer, error) {
	consumerLogger := logger.With().Str("component", "consumer").Logger()

	consumerLogger.Info().
		Str("stream", cfg.StreamName).
		Str("consumer", cfg.ConsumerName).
		Int("fetch_batch", cfg.FetchBatch).
		Int("fetch_workers", cfg.FetchWorkers).
		Msg("binding to JetStream consumer")

	// Bind to PRE-EXISTING consumer (created by Ansible)
	// Do NOT create a new consumer - this will fail if the consumer doesn't exist
	sub, err := js.PullSubscribe(
		"",              // Empty subject - consumer already knows which stream/subjects
		cfg.ConsumerName,
		nats.Bind(cfg.StreamName, cfg.ConsumerName), // Bind to existing consumer
	)
	if err != nil {
		return nil, fmt.Errorf("failed to bind to consumer: %w", err)
	}

	consumerLogger.Info().
		Str("stream", cfg.StreamName).
		Str("consumer", cfg.ConsumerName).
		Msg("successfully bound to JetStream consumer")

	return &Consumer{
		js:           js,
		sub:          sub,
		streamName:   cfg.StreamName,
		consumerName: cfg.ConsumerName,
		fetchBatch:   cfg.FetchBatch,
		fetchWorkers: cfg.FetchWorkers,
		logger:       consumerLogger,
		metrics:      metrics,
		stopCh:       make(chan struct{}),
	}, nil
}

// Start begins consuming messages with multiple concurrent fetchers
// This implements a high-throughput pull-based consumption pattern
func (c *Consumer) Start(ctx context.Context, handler MessageHandler) error {
	c.logger.Info().
		Int("fetch_workers", c.fetchWorkers).
		Int("batch_size", c.fetchBatch).
		Msg("starting consumer with concurrent fetchers")

	// Start multiple fetcher goroutines for high throughput with staggered intervals
	// Stagger interval is calculated dynamically to ensure even distribution of fetch requests
	// Formula: staggerInterval = maxWait / fetchWorkers
	// This ensures a new fetch starts every staggerInterval milliseconds
	// More workers = smaller stagger interval = lower latency
	maxWait := 100 * time.Millisecond // Reduced MaxWait for even lower latency
	staggerInterval := maxWait / time.Duration(c.fetchWorkers)
	if staggerInterval < 1*time.Millisecond {
		// Minimum 1ms stagger to avoid overwhelming the server
		staggerInterval = 1 * time.Millisecond
	}

	c.logger.Info().
		Int("fetch_workers", c.fetchWorkers).
		Dur("max_wait", maxWait).
		Dur("stagger_interval", staggerInterval).
		Msg("starting fetchers with optimized stagger pattern")

	for i := 0; i < c.fetchWorkers; i++ {
		c.wg.Add(1)
		go func(workerID int) {
			// Stagger worker startup: each worker starts at a different time
			// Worker 0 starts immediately, Worker 1 starts after staggerInterval, etc.
			if workerID > 0 {
				initialStagger := time.Duration(workerID) * staggerInterval
				time.Sleep(initialStagger)
			}
			c.fetchLoop(ctx, workerID, handler, staggerInterval, maxWait)
		}(i)
	}

	// Wait for all fetchers to complete
	c.wg.Wait()
	c.logger.Info().Msg("all fetcher goroutines stopped")

	return nil
}

// fetchLoop runs in a goroutine and continuously fetches and processes messages
// staggerInterval is used to maintain stagger pattern between workers
// maxWait is the maximum time to wait for messages in each fetch
func (c *Consumer) fetchLoop(ctx context.Context, workerID int, handler MessageHandler, staggerInterval time.Duration, maxWait time.Duration) {
	defer c.wg.Done()

	workerLogger := c.logger.With().
		Int("worker_id", workerID).
		Logger()

	workerLogger.Debug().
		Dur("stagger_offset", time.Duration(workerID)*staggerInterval).
		Dur("max_wait", maxWait).
		Dur("stagger_interval", staggerInterval).
		Msg("fetch worker started with optimized stagger pattern")

	for {
		// Check if we should stop
		select {
		case <-c.stopCh:
			workerLogger.Debug().Msg("fetch worker stopping")
			return
		case <-ctx.Done():
			workerLogger.Debug().Msg("fetch worker cancelled")
			return
		default:
		}

		// Fetch a batch of messages with optimized MaxWait for minimal latency
		// Dynamic stagger ensures messages are picked up within staggerInterval (typically <5ms with 30 workers)
		msgs, err := c.sub.Fetch(c.fetchBatch, nats.MaxWait(maxWait))
		if err != nil {
			if err == nats.ErrTimeout {
				// No messages available - this is normal
				// Wait for stagger interval before next fetch to maintain stagger pattern
				// This ensures workers stay staggered even after timeouts
				select {
				case <-time.After(staggerInterval):
					// Continue to next fetch after stagger delay
				case <-c.stopCh:
					workerLogger.Debug().Msg("fetch worker stopping")
					return
				case <-ctx.Done():
					workerLogger.Debug().Msg("fetch worker cancelled")
					return
				}
				continue
			}

			workerLogger.Error().
				Err(err).
				Msg("fetch failed")

			// Back off on errors to avoid tight error loop
			time.Sleep(1 * time.Second)
			continue
		}

		// Process each message in the batch
		batchStart := time.Now()
		for _, msg := range msgs {
			c.processMessage(ctx, msg, handler, workerLogger)
		}

		batchDuration := time.Since(batchStart)

		// Log batch processing stats
		workerLogger.Debug().
			Int("batch_size", len(msgs)).
			Dur("duration_ms", batchDuration).
			Float64("msgs_per_sec", float64(len(msgs))/batchDuration.Seconds()).
			Msg("batch processed")

		// After processing messages, wait for stagger interval before next fetch
		// This maintains the stagger pattern: workers don't all fetch simultaneously
		// Processing time variance helps maintain stagger naturally, but we add a small
		// delay to ensure workers don't synchronize after processing batches
		select {
		case <-time.After(staggerInterval):
			// Continue to next fetch after stagger delay
		case <-c.stopCh:
			workerLogger.Debug().Msg("fetch worker stopping")
			return
		case <-ctx.Done():
			workerLogger.Debug().Msg("fetch worker cancelled")
			return
		}
	}
}

// processMessage processes a single message
func (c *Consumer) processMessage(
	ctx context.Context,
	msg *nats.Msg,
	handler MessageHandler,
	logger zerolog.Logger,
) {
	start := time.Now()

	// Update metrics
	if c.metrics != nil {
		c.metrics.NATSMessagesConsumed.Inc()
		c.metrics.EmailsInFlight.Inc()
		defer c.metrics.EmailsInFlight.Dec()
	}

	// Get message metadata
	meta, err := msg.Metadata()
	if err != nil {
		logger.Warn().
			Err(err).
			Msg("failed to get message metadata")
	}

	msgLogger := logger
	if meta != nil {
		msgLogger = logger.With().
			Str("subject", msg.Subject).
			Uint64("stream_seq", meta.Sequence.Stream).
			Uint64("consumer_seq", meta.Sequence.Consumer).
			Uint64("num_delivered", meta.NumDelivered).
			Logger()
	}

	// Add logger with worker_id to context so handler can extract it
	ctxWithLogger := msgLogger.WithContext(ctx)

	// Wrap msg with adapter to implement Message interface
	adaptedMsg := &natsMsgAdapter{msg: msg}

	// Call the handler with context containing logger
	err = handler(ctxWithLogger, adaptedMsg)

	duration := time.Since(start)

	if err != nil {
		msgLogger.Error().
			Err(err).
			Dur("duration_ms", duration).
			Msg("message processing failed")

		// Note: Handler is responsible for ACK/NAK/Term
		// We don't do it here to give handler full control
		return
	}

	msgLogger.Debug().
		Dur("duration_ms", duration).
		Msg("message processed successfully")
}

// Stop gracefully stops the consumer
func (c *Consumer) Stop(ctx context.Context) error {
	c.stopMu.Lock()
	if c.stopped {
		c.stopMu.Unlock()
		return nil
	}
	c.stopped = true
	c.stopMu.Unlock()

	c.logger.Info().Msg("stopping consumer")
	close(c.stopCh)

	// Wait for all fetchers to stop with timeout
	done := make(chan struct{})
	go func() {
		c.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		c.logger.Info().Msg("consumer stopped gracefully")
	case <-ctx.Done():
		c.logger.Warn().Msg("consumer stop timeout exceeded")
	}

	// Unsubscribe
	if err := c.sub.Unsubscribe(); err != nil {
		c.logger.Error().Err(err).Msg("failed to unsubscribe")
		return err
	}

	return nil
}

// Stats returns consumer statistics
func (c *Consumer) Stats() (*nats.ConsumerInfo, error) {
	return c.sub.ConsumerInfo()
}

// GetPendingCount returns the number of pending messages (consumer lag)
func (c *Consumer) GetPendingCount() (int64, error) {
	info, err := c.sub.ConsumerInfo()
	if err != nil {
		return 0, err
	}
	// NumPending represents the number of messages waiting to be consumed
	return int64(info.NumPending), nil
}

// CollectLagMetrics collects consumer lag metrics
func (c *Consumer) CollectLagMetrics() {
	if c.metrics == nil {
		return
	}

	info, err := c.sub.ConsumerInfo()
	if err != nil {
		c.logger.Warn().Err(err).Msg("failed to get consumer info for lag metrics")
		return
	}

	// NumPending is the number of messages waiting to be delivered
	c.metrics.NATSConsumerLag.Set(float64(info.NumPending))
	c.metrics.NATSPendingMessages.Set(float64(info.NumPending))
}
