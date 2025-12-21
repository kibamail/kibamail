// Package errors provides domain-specific error types and utilities for the email-agent.
// It uses cockroachdb/errors for enhanced error handling with stack traces and context.
package errors

import (
	"github.com/cockroachdb/errors"
)

// Base error markers for classification
var (
	// ErrTransient marks errors that are temporary and should be retried
	ErrTransient = errors.New("transient error")

	// ErrPermanent marks errors that are permanent and should not be retried
	ErrPermanent = errors.New("permanent error")
)

// NATS-related errors
var (
	// ErrNATSUnavailable indicates NATS server is unreachable
	ErrNATSUnavailable = errors.Mark(errors.New("NATS server unavailable"), ErrTransient)

	// ErrNATSTimeout indicates NATS operation timed out
	ErrNATSTimeout = errors.Mark(errors.New("NATS operation timeout"), ErrTransient)

	// ErrInvalidMessage indicates message format is invalid
	ErrInvalidMessage = errors.Mark(errors.New("invalid message format"), ErrPermanent)

	// ErrStreamNotFound indicates JetStream stream doesn't exist
	ErrStreamNotFound = errors.Mark(errors.New("JetStream stream not found"), ErrPermanent)

	// ErrConsumerNotFound indicates JetStream consumer doesn't exist
	ErrConsumerNotFound = errors.Mark(errors.New("JetStream consumer not found"), ErrPermanent)
)

// KumoMTA-related errors
var (
	// ErrKumoMTAUnavailable indicates KumoMTA API is unreachable
	ErrKumoMTAUnavailable = errors.Mark(errors.New("KumoMTA API unavailable"), ErrTransient)

	// ErrKumoMTATimeout indicates KumoMTA operation timed out
	ErrKumoMTATimeout = errors.Mark(errors.New("KumoMTA operation timeout"), ErrTransient)

	// ErrInjectionFailed indicates email injection failed
	ErrInjectionFailed = errors.Mark(errors.New("email injection failed"), ErrTransient)

	// ErrInvalidRecipient indicates recipient email is invalid
	ErrInvalidRecipient = errors.Mark(errors.New("invalid recipient email"), ErrPermanent)
)

// S3-related errors
var (
	// ErrS3Unavailable indicates S3 service is unreachable
	ErrS3Unavailable = errors.Mark(errors.New("S3 service unavailable"), ErrTransient)

	// ErrContentNotFound indicates email content not found in S3
	ErrContentNotFound = errors.Mark(errors.New("email content not found"), ErrPermanent)
)

// Redis-related errors
var (
	// ErrRedisUnavailable indicates Redis is unreachable
	ErrRedisUnavailable = errors.Mark(errors.New("Redis unavailable"), ErrTransient)

	// ErrCacheMiss indicates cache entry not found
	ErrCacheMiss = errors.New("cache miss")
)

// Control API errors
var (
	// ErrControlAPIUnavailable indicates control plane API is unreachable
	ErrControlAPIUnavailable = errors.Mark(errors.New("control plane API unavailable"), ErrTransient)

	// ErrTenantNotFound indicates tenant doesn't exist
	ErrTenantNotFound = errors.Mark(errors.New("tenant not found"), ErrPermanent)

	// ErrAuthenticationFailed indicates API key is invalid
	ErrAuthenticationFailed = errors.Mark(errors.New("authentication failed"), ErrPermanent)
)

// Crypto errors
var (
	// ErrDecryptionFailed indicates DKIM key decryption failed
	ErrDecryptionFailed = errors.Mark(errors.New("DKIM key decryption failed"), ErrPermanent)
)

// Configuration errors
var (
	// ErrInvalidConfig indicates configuration is invalid
	ErrInvalidConfig = errors.New("invalid configuration")

	// ErrMissingRequired indicates required configuration field is missing
	ErrMissingRequired = errors.New("missing required configuration")
)

// IsTransient returns true if the error is marked as transient and should be retried
func IsTransient(err error) bool {
	return errors.Is(err, ErrTransient)
}

// IsPermanent returns true if the error is marked as permanent and should not be retried
func IsPermanent(err error) bool {
	return errors.Is(err, ErrPermanent)
}

// Wrap wraps an error with additional context
func Wrap(err error, msg string) error {
	return errors.Wrap(err, msg)
}

// Wrapf wraps an error with formatted context
func Wrapf(err error, format string, args ...interface{}) error {
	return errors.Wrapf(err, format, args...)
}

// WithDetail adds structured details to an error
func WithDetail(err error, key string, value interface{}) error {
	return errors.WithDetailf(err, "%s: %v", key, value)
}

// WithHint adds a troubleshooting hint to an error
func WithHint(err error, hint string) error {
	return errors.WithHint(err, hint)
}

// Mark marks an error with a reference error for classification
func Mark(err, reference error) error {
	return errors.Mark(err, reference)
}

// New creates a new error
func New(msg string) error {
	return errors.New(msg)
}

// Newf creates a new error with formatting
func Newf(format string, args ...interface{}) error {
	return errors.Newf(format, args...)
}

// Is reports whether any error in err's chain matches target
func Is(err, target error) bool {
	return errors.Is(err, target)
}
