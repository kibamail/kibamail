// Package observability provides OpenTelemetry tracing and metrics infrastructure
package observability

import (
	"context"
	"time"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// OTelConfig contains configuration for OpenTelemetry
type OTelConfig struct {
	Enabled     bool
	Endpoint    string
	Insecure    bool
	ServiceName string
	Version     string
	Environment string
	Hostname    string
}

// OTelProvider holds the OpenTelemetry providers
type OTelProvider struct {
	tracerProvider *sdktrace.TracerProvider
	meterProvider  *metric.MeterProvider
	logger         zerolog.Logger
}

// InitOTel initializes OpenTelemetry tracing and metrics
func InitOTel(ctx context.Context, cfg OTelConfig, logger zerolog.Logger) (*OTelProvider, error) {
	if !cfg.Enabled {
		logger.Info().Msg("OpenTelemetry disabled")
		return &OTelProvider{logger: logger}, nil
	}

	logger.Info().
		Str("endpoint", cfg.Endpoint).
		Str("service", cfg.ServiceName).
		Bool("insecure", cfg.Insecure).
		Msg("initializing OpenTelemetry")

	// Create resource with service information
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.Version),
			semconv.DeploymentEnvironment(cfg.Environment),
			attribute.String("host.name", cfg.Hostname),
		),
		resource.WithHost(),
		resource.WithProcess(),
		resource.WithOS(),
	)
	if err != nil {
		return nil, err
	}

	// Configure gRPC connection options
	var dialOpts []grpc.DialOption
	if cfg.Insecure {
		dialOpts = append(dialOpts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	} else {
		dialOpts = append(dialOpts, grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(nil, "")))
	}

	// Create gRPC connection
	conn, err := grpc.NewClient(cfg.Endpoint, dialOpts...)
	if err != nil {
		return nil, err
	}

	// Initialize trace exporter
	traceExporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithGRPCConn(conn),
	)
	if err != nil {
		return nil, err
	}

	// Create tracer provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter,
			sdktrace.WithBatchTimeout(5*time.Second),
			sdktrace.WithMaxExportBatchSize(512),
		),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	// Set global tracer provider
	otel.SetTracerProvider(tp)

	// Set global text map propagator for distributed tracing
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Initialize metric exporter
	metricExporter, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithGRPCConn(conn),
	)
	if err != nil {
		tp.Shutdown(ctx)
		return nil, err
	}

	// Create meter provider
	mp := metric.NewMeterProvider(
		metric.WithReader(metric.NewPeriodicReader(metricExporter,
			metric.WithInterval(30*time.Second),
		)),
		metric.WithResource(res),
	)

	// Set global meter provider
	otel.SetMeterProvider(mp)

	logger.Info().Msg("OpenTelemetry initialized successfully")

	return &OTelProvider{
		tracerProvider: tp,
		meterProvider:  mp,
		logger:         logger,
	}, nil
}

// Shutdown gracefully shuts down the OpenTelemetry providers
func (p *OTelProvider) Shutdown(ctx context.Context) error {
	if p.tracerProvider == nil && p.meterProvider == nil {
		return nil
	}

	p.logger.Info().Msg("shutting down OpenTelemetry")

	var firstErr error

	if p.tracerProvider != nil {
		if err := p.tracerProvider.Shutdown(ctx); err != nil {
			p.logger.Error().Err(err).Msg("failed to shutdown tracer provider")
			firstErr = err
		}
	}

	if p.meterProvider != nil {
		if err := p.meterProvider.Shutdown(ctx); err != nil {
			p.logger.Error().Err(err).Msg("failed to shutdown meter provider")
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}

// Tracer returns a named tracer from the global provider
func Tracer(name string) trace.Tracer {
	return otel.Tracer(name)
}

// StartSpan creates a new span with the given name
func StartSpan(ctx context.Context, name string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return Tracer("email-agent").Start(ctx, name, opts...)
}

// SpanFromContext returns the current span from the context
func SpanFromContext(ctx context.Context) trace.Span {
	return trace.SpanFromContext(ctx)
}

// RecordError records an error on the current span
func RecordError(ctx context.Context, err error, opts ...trace.EventOption) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.RecordError(err, opts...)
		span.SetStatus(codes.Error, err.Error())
	}
}

// SetSpanAttributes sets attributes on the current span
func SetSpanAttributes(ctx context.Context, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.SetAttributes(attrs...)
	}
}

// AddSpanEvent adds an event to the current span
func AddSpanEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.AddEvent(name, trace.WithAttributes(attrs...))
	}
}
