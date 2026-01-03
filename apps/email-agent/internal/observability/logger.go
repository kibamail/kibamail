// Package observability provides logging, metrics, and health check infrastructure
package observability

import (
	"context"
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

// LoggerConfig contains configuration for the logger
type LoggerConfig struct {
	Level      string // debug, info, warn, error
	Format     string // json, console
	Service    string // service name
	Version    string // service version
	AddCaller  bool   // add caller information
	TimeFormat string // timestamp format
}

// NewLogger creates a new configured zerolog logger
func NewLogger(cfg LoggerConfig) zerolog.Logger {
	// Parse log level
	level := parseLogLevel(cfg.Level)
	zerolog.SetGlobalLevel(level)

	// Configure output writer
	var output io.Writer = os.Stdout
	if cfg.Format == "console" {
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: cfg.TimeFormat,
			NoColor:    false,
		}
	}

	// Build logger with context
	logger := zerolog.New(output).
		Level(level).
		With().
		Timestamp().
		Str("service", cfg.Service).
		Str("version", cfg.Version).
		Logger()

	// Add caller information if requested or in debug mode
	if cfg.AddCaller || level == zerolog.DebugLevel {
		logger = logger.With().Caller().Logger()
	}

	return logger
}

// parseLogLevel converts string level to zerolog level
func parseLogLevel(level string) zerolog.Level {
	switch level {
	case "debug":
		return zerolog.DebugLevel
	case "info":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	case "panic":
		return zerolog.PanicLevel
	default:
		return zerolog.InfoLevel
	}
}

// ContextWithLogger adds a logger to the context
func ContextWithLogger(ctx context.Context, logger zerolog.Logger) context.Context {
	return logger.WithContext(ctx)
}

// LoggerFromContext retrieves the logger from context, or returns a default logger
func LoggerFromContext(ctx context.Context) *zerolog.Logger {
	logger := zerolog.Ctx(ctx)
	if logger.GetLevel() == zerolog.Disabled {
		// Return default logger if none in context
		defaultLogger := NewLogger(LoggerConfig{
			Level:      "info",
			Format:     "json",
			Service:    "email-agent",
			Version:    "unknown",
			TimeFormat: time.RFC3339,
		})
		return &defaultLogger
	}
	return logger
}

// LogOperation logs the start and end of an operation with duration
func LogOperation(logger zerolog.Logger, operation string, fn func() error) error {
	start := time.Now()
	logger.Debug().
		Str("operation", operation).
		Msg("starting operation")

	err := fn()
	duration := time.Since(start)

	if err != nil {
		logger.Error().
			Err(err).
			Str("operation", operation).
			Dur("duration_ms", duration).
			Msg("operation failed")
	} else {
		logger.Debug().
			Str("operation", operation).
			Dur("duration_ms", duration).
			Msg("operation completed")
	}

	return err
}

// LoggerWithTrace returns a logger with trace_id and span_id from the context
// This enables log correlation with distributed traces in SigNoz
func LoggerWithTrace(ctx context.Context, logger zerolog.Logger) zerolog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return logger
	}

	return logger.With().
		Str("trace_id", span.SpanContext().TraceID().String()).
		Str("span_id", span.SpanContext().SpanID().String()).
		Logger()
}

// LoggerFromContextWithTrace retrieves the logger from context and adds trace correlation
func LoggerFromContextWithTrace(ctx context.Context) *zerolog.Logger {
	logger := LoggerFromContext(ctx)
	loggerWithTrace := LoggerWithTrace(ctx, *logger)
	return &loggerWithTrace
}
