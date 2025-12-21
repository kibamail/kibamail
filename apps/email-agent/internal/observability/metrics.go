// Package observability provides metrics infrastructure using Prometheus
package observability

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds all Prometheus metrics for the email-agent
type Metrics struct {
	// Email processing metrics
	EmailsProcessed         prometheus.Counter
	EmailsInFlight          prometheus.Gauge
	EmailProcessingDuration prometheus.Histogram
	EmailsInjected          prometheus.Counter
	EmailInjectionFailures  prometheus.Counter
	EmailAttachmentsTotal   prometheus.Counter
	EmailAttachmentBytes    prometheus.Counter

	// NATS operations metrics
	NATSMessagesConsumed   prometheus.Counter
	NATSMessagesPublished  prometheus.Counter
	NATSPublishErrors      prometheus.Counter
	NATSConnectionStatus   prometheus.Gauge
	NATSConsumerLag        prometheus.Gauge
	NATSPublishDuration    prometheus.Histogram
	NATSConsumeDuration    prometheus.Histogram
	NATSPendingMessages    prometheus.Gauge
	NATSAckedMessages      prometheus.Counter
	NATSNakedMessages      prometheus.Counter
	NATSTerminatedMessages prometheus.Counter

	// HTTP metrics
	HTTPRequestsTotal    *prometheus.CounterVec
	HTTPRequestDuration  *prometheus.HistogramVec
	HTTPRequestBodyBytes *prometheus.HistogramVec
	HTTPActiveRequests   prometheus.Gauge

	// Webhook metrics
	WebhooksReceived        *prometheus.CounterVec
	WebhooksPublished       prometheus.Counter
	WebhookPublishErrors    prometheus.Counter
	WebhookBatchSize        prometheus.Histogram
	WebhookProcessDuration  prometheus.Histogram
	WebhooksInFlight        prometheus.Gauge

	// Redis cache metrics
	CacheHits     prometheus.Counter
	CacheMisses   prometheus.Counter
	CacheErrors   prometheus.Counter
	CacheLatency  prometheus.Histogram
	CacheKeyCount prometheus.Gauge

	// S3 metrics
	S3DownloadsTotal   prometheus.Counter
	S3DownloadDuration prometheus.Histogram
	S3DownloadErrors   prometheus.Counter
	S3DownloadBytes    prometheus.Counter

	// KumoMTA metrics
	KumoMTAInjections       prometheus.Counter
	KumoMTAInjectionErrors  prometheus.Counter
	KumoMTALatency          prometheus.Histogram
	KumoMTARequestBytes     prometheus.Counter
	KumoMTAActiveRequests   prometheus.Gauge

	// Control Plane API metrics
	ControlPlaneRequests      prometheus.Counter
	ControlPlaneErrors        prometheus.Counter
	ControlPlaneLatency       prometheus.Histogram
	ControlPlaneActiveReqs    prometheus.Gauge

	// Circuit breaker metrics
	CircuitBreakerState *prometheus.GaugeVec
	CircuitBreakerTrips *prometheus.CounterVec

	// System metrics
	GoroutinesTotal   prometheus.Gauge
	MemoryUsageBytes  prometheus.Gauge
	MemoryAllocBytes  prometheus.Gauge
	MemoryHeapObjects prometheus.Gauge
	GCPauseSeconds    prometheus.Histogram

	// Worker metrics
	WorkerActiveCount   prometheus.Gauge
	WorkerIdleCount     prometheus.Gauge
	WorkerBatchesTotal  prometheus.Counter
	WorkerBatchDuration prometheus.Histogram
}

// NewMetrics creates and registers all Prometheus metrics
func NewMetrics(registry prometheus.Registerer) *Metrics {
	if registry == nil {
		registry = prometheus.DefaultRegisterer
	}

	factory := promauto.With(registry)

	return &Metrics{
		// Email processing metrics
		EmailsProcessed: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_emails_processed_total",
			Help: "Total number of emails processed",
		}),
		EmailsInFlight: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_emails_in_flight",
			Help: "Number of emails currently being processed",
		}),
		EmailProcessingDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_email_processing_duration_seconds",
			Help:    "Duration of email processing",
			Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
		}),
		EmailsInjected: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_emails_injected_total",
			Help: "Total number of emails injected into KumoMTA",
		}),
		EmailInjectionFailures: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_email_injection_failures_total",
			Help: "Total number of email injection failures",
		}),
		EmailAttachmentsTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_email_attachments_total",
			Help: "Total number of email attachments processed",
		}),
		EmailAttachmentBytes: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_email_attachment_bytes_total",
			Help: "Total bytes of attachments processed",
		}),

		// NATS operations metrics
		NATSMessagesConsumed: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_messages_consumed_total",
			Help: "Total number of messages consumed from NATS",
		}),
		NATSMessagesPublished: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_messages_published_total",
			Help: "Total number of messages published to NATS",
		}),
		NATSPublishErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_publish_errors_total",
			Help: "Total number of NATS publish errors",
		}),
		NATSConnectionStatus: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_nats_connection_status",
			Help: "NATS connection status (1=connected, 0=disconnected)",
		}),
		NATSConsumerLag: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_nats_consumer_lag",
			Help: "Number of pending messages in consumer queue",
		}),
		NATSPublishDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_nats_publish_duration_seconds",
			Help:    "Duration of NATS publish operations",
			Buckets: []float64{.0001, .0005, .001, .005, .01, .025, .05, .1},
		}),
		NATSConsumeDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_nats_consume_duration_seconds",
			Help:    "Duration of NATS consume operations",
			Buckets: []float64{.0001, .0005, .001, .005, .01, .025, .05, .1},
		}),
		NATSPendingMessages: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_nats_pending_messages",
			Help: "Number of pending messages awaiting acknowledgment",
		}),
		NATSAckedMessages: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_acked_messages_total",
			Help: "Total number of acknowledged messages",
		}),
		NATSNakedMessages: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_naked_messages_total",
			Help: "Total number of negatively acknowledged messages",
		}),
		NATSTerminatedMessages: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_nats_terminated_messages_total",
			Help: "Total number of terminated messages",
		}),

		// HTTP metrics
		HTTPRequestsTotal: factory.NewCounterVec(prometheus.CounterOpts{
			Name: "kibamail_http_requests_total",
			Help: "Total number of HTTP requests",
		}, []string{"method", "path", "status"}),
		HTTPRequestDuration: factory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "kibamail_http_request_duration_seconds",
			Help:    "Duration of HTTP requests",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		}, []string{"method", "path"}),
		HTTPRequestBodyBytes: factory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "kibamail_http_request_body_bytes",
			Help:    "Size of HTTP request bodies in bytes",
			Buckets: []float64{100, 1000, 10000, 100000, 1000000, 10000000},
		}, []string{"method", "path"}),
		HTTPActiveRequests: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_http_active_requests",
			Help: "Number of active HTTP requests being processed",
		}),

		// Webhook metrics
		WebhooksReceived: factory.NewCounterVec(prometheus.CounterOpts{
			Name: "kibamail_webhooks_received_total",
			Help: "Total number of webhooks received from KumoMTA",
		}, []string{"type"}),
		WebhooksPublished: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_webhooks_published_total",
			Help: "Total number of webhooks published to NATS",
		}),
		WebhookPublishErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_webhook_publish_errors_total",
			Help: "Total number of webhook publish errors",
		}),
		WebhookBatchSize: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_webhook_batch_size",
			Help:    "Size of webhook batches received from KumoMTA",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000},
		}),
		WebhookProcessDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_webhook_process_duration_seconds",
			Help:    "Duration of webhook batch processing",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		}),
		WebhooksInFlight: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_webhooks_in_flight",
			Help: "Number of webhooks currently being processed",
		}),

		// Redis cache metrics
		CacheHits: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_cache_hits_total",
			Help: "Total number of cache hits",
		}),
		CacheMisses: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_cache_misses_total",
			Help: "Total number of cache misses",
		}),
		CacheErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_cache_errors_total",
			Help: "Total number of cache errors",
		}),
		CacheLatency: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_cache_latency_seconds",
			Help:    "Latency of Redis cache operations",
			Buckets: []float64{.0001, .0005, .001, .005, .01, .025, .05},
		}),
		CacheKeyCount: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_cache_key_count",
			Help: "Number of keys in cache (sampled)",
		}),

		// S3 metrics
		S3DownloadsTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_s3_downloads_total",
			Help: "Total number of S3 downloads",
		}),
		S3DownloadDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_s3_download_duration_seconds",
			Help:    "Duration of S3 downloads",
			Buckets: []float64{.01, .025, .05, .1, .25, .5, 1, 2.5, 5},
		}),
		S3DownloadErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_s3_download_errors_total",
			Help: "Total number of S3 download errors",
		}),
		S3DownloadBytes: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_s3_download_bytes_total",
			Help: "Total bytes downloaded from S3",
		}),

		// KumoMTA metrics
		KumoMTAInjections: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_kumomta_injections_total",
			Help: "Total number of KumoMTA injections",
		}),
		KumoMTAInjectionErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_kumomta_injection_errors_total",
			Help: "Total number of KumoMTA injection errors",
		}),
		KumoMTALatency: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_kumomta_latency_seconds",
			Help:    "Latency of KumoMTA API calls",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		}),
		KumoMTARequestBytes: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_kumomta_request_bytes_total",
			Help: "Total bytes sent to KumoMTA",
		}),
		KumoMTAActiveRequests: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_kumomta_active_requests",
			Help: "Number of active KumoMTA injection requests",
		}),

		// Control Plane API metrics
		ControlPlaneRequests: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_control_plane_requests_total",
			Help: "Total number of control plane API requests",
		}),
		ControlPlaneErrors: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_control_plane_errors_total",
			Help: "Total number of control plane API errors",
		}),
		ControlPlaneLatency: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_control_plane_latency_seconds",
			Help:    "Latency of control plane API calls",
			Buckets: []float64{.01, .025, .05, .1, .25, .5, 1, 2.5, 5},
		}),
		ControlPlaneActiveReqs: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_control_plane_active_requests",
			Help: "Number of active control plane API requests",
		}),

		// Circuit breaker metrics
		CircuitBreakerState: factory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "kibamail_circuit_breaker_state",
			Help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
		}, []string{"service"}),
		CircuitBreakerTrips: factory.NewCounterVec(prometheus.CounterOpts{
			Name: "kibamail_circuit_breaker_trips_total",
			Help: "Total number of circuit breaker trips",
		}, []string{"service"}),

		// System metrics
		GoroutinesTotal: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_goroutines_total",
			Help: "Current number of goroutines",
		}),
		MemoryUsageBytes: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_memory_usage_bytes",
			Help: "Current memory usage in bytes (Alloc)",
		}),
		MemoryAllocBytes: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_memory_alloc_bytes",
			Help: "Total bytes allocated (TotalAlloc)",
		}),
		MemoryHeapObjects: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_memory_heap_objects",
			Help: "Number of allocated heap objects",
		}),
		GCPauseSeconds: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_gc_pause_seconds",
			Help:    "GC pause duration",
			Buckets: []float64{.00001, .0001, .001, .01, .1},
		}),

		// Worker metrics
		WorkerActiveCount: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_worker_active_count",
			Help: "Number of active worker goroutines",
		}),
		WorkerIdleCount: factory.NewGauge(prometheus.GaugeOpts{
			Name: "kibamail_worker_idle_count",
			Help: "Number of idle worker goroutines",
		}),
		WorkerBatchesTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "kibamail_worker_batches_total",
			Help: "Total number of batches processed by workers",
		}),
		WorkerBatchDuration: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "kibamail_worker_batch_duration_seconds",
			Help:    "Duration of worker batch processing",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		}),
	}
}
