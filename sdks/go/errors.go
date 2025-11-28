package kibamail

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// DefaultError is the standard error response structure
type DefaultError struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// RateLimitError is a sentinel error for rate limit detection with errors.Is
var ErrRateLimit = errors.New("rate limit exceeded")

// RateLimitError represents a rate limit error with metadata from response headers
type RateLimitError struct {
	// Message is the error message from the API
	Message string

	// Limit is the maximum number of requests allowed in the current window (raw header value)
	Limit string

	// Remaining is the number of requests remaining in the current window (raw header value)
	Remaining string

	// Reset is the time when the rate limit will reset in seconds (raw header value)
	Reset string

	// RetryAfter is the recommended wait time before retrying in seconds (raw header value)
	RetryAfter string
}

// Error implements the error interface
func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limit exceeded: %s (limit: %s, remaining: %s, reset: %s, retry after: %s)",
		e.Message, e.Limit, e.Remaining, e.Reset, e.RetryAfter)
}

// Is implements errors.Is support for detecting rate limit errors
func (e *RateLimitError) Is(target error) bool {
	return target == ErrRateLimit
}

// ContactsSvc errors
var (
	ErrFailedToCreateContactsCreateRequest = errors.New("[ERROR]: Failed to create Contacts.Create request")
	ErrFailedToCreateContactsListRequest   = errors.New("[ERROR]: Failed to create Contacts.List request")
	ErrFailedToCreateContactsGetRequest    = errors.New("[ERROR]: Failed to create Contacts.Get request")
	ErrFailedToCreateContactsUpdateRequest = errors.New("[ERROR]: Failed to create Contacts.Update request")
	ErrFailedToCreateContactsDeleteRequest = errors.New("[ERROR]: Failed to create Contacts.Delete request")
	ErrFailedToCreateContactsSearchRequest = errors.New("[ERROR]: Failed to create Contacts.Search request")
)

// TopicsSvc errors
var (
	ErrFailedToCreateTopicsCreateRequest = errors.New("[ERROR]: Failed to create Topics.Create request")
	ErrFailedToCreateTopicsListRequest   = errors.New("[ERROR]: Failed to create Topics.List request")
	ErrFailedToCreateTopicsGetRequest    = errors.New("[ERROR]: Failed to create Topics.Get request")
	ErrFailedToCreateTopicsUpdateRequest = errors.New("[ERROR]: Failed to create Topics.Update request")
	ErrFailedToCreateTopicsDeleteRequest = errors.New("[ERROR]: Failed to create Topics.Delete request")
)

// SegmentsSvc errors
var (
	ErrFailedToCreateSegmentsCreateRequest = errors.New("[ERROR]: Failed to create Segments.Create request")
	ErrFailedToCreateSegmentsListRequest   = errors.New("[ERROR]: Failed to create Segments.List request")
	ErrFailedToCreateSegmentsGetRequest    = errors.New("[ERROR]: Failed to create Segments.Get request")
	ErrFailedToCreateSegmentsUpdateRequest = errors.New("[ERROR]: Failed to create Segments.Update request")
	ErrFailedToCreateSegmentsDeleteRequest = errors.New("[ERROR]: Failed to create Segments.Delete request")
)

// FormsSvc errors
var (
	ErrFailedToCreateFormsCreateRequest = errors.New("[ERROR]: Failed to create Forms.Create request")
	ErrFailedToCreateFormsListRequest   = errors.New("[ERROR]: Failed to create Forms.List request")
	ErrFailedToCreateFormsGetRequest    = errors.New("[ERROR]: Failed to create Forms.Get request")
	ErrFailedToCreateFormsUpdateRequest = errors.New("[ERROR]: Failed to create Forms.Update request")
	ErrFailedToCreateFormsDeleteRequest = errors.New("[ERROR]: Failed to create Forms.Delete request")
)

// ApiKeysSvc errors
var (
	ErrFailedToCreateApiKeysCreateRequest = errors.New("[ERROR]: Failed to create ApiKeys.Create request")
	ErrFailedToCreateApiKeysListRequest   = errors.New("[ERROR]: Failed to create ApiKeys.List request")
	ErrFailedToCreateApiKeysDeleteRequest = errors.New("[ERROR]: Failed to create ApiKeys.Delete request")
)

// ContactPropertiesSvc errors
var (
	ErrFailedToCreateContactPropertiesCreateRequest = errors.New("[ERROR]: Failed to create ContactProperties.Create request")
	ErrFailedToCreateContactPropertiesListRequest   = errors.New("[ERROR]: Failed to create ContactProperties.List request")
	ErrFailedToCreateContactPropertiesGetRequest    = errors.New("[ERROR]: Failed to create ContactProperties.Get request")
	ErrFailedToCreateContactPropertiesUpdateRequest = errors.New("[ERROR]: Failed to create ContactProperties.Update request")
	ErrFailedToCreateContactPropertiesDeleteRequest = errors.New("[ERROR]: Failed to create ContactProperties.Delete request")
)

// handleError tries to handle errors based on HTTP status codes
func handleError(resp *http.Response) error {
	switch resp.StatusCode {

	// Handle rate limit errors (429)
	case http.StatusTooManyRequests:
		r := &DefaultError{}
		if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
			err := json.NewDecoder(resp.Body).Decode(r)
			if err != nil {
				r.Message = resp.Status
			}
		} else {
			r.Message = resp.Status
		}

		return &RateLimitError{
			Message:    r.Message,
			Limit:      resp.Header.Get("ratelimit-limit"),
			Remaining:  resp.Header.Get("ratelimit-remaining"),
			Reset:      resp.Header.Get("ratelimit-reset"),
			RetryAfter: resp.Header.Get("retry-after"),
		}

	// Handles errors most likely caused by the client
	case http.StatusUnprocessableEntity, http.StatusBadRequest, http.StatusNotFound, http.StatusConflict:
		r := &DefaultError{}
		if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
			err := json.NewDecoder(resp.Body).Decode(r)
			if err != nil {
				r.Message = resp.Status
			}
		} else {
			r.Message = resp.Status
		}

		return errors.New("[ERROR]: " + r.Message)
	default:
		// Tries to parse `message` attr from error
		r := &DefaultError{}

		if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
			err := json.NewDecoder(resp.Body).Decode(r)
			if err != nil {
				r.Message = resp.Status
			}
		} else {
			r.Message = resp.Status
		}

		if r.Message != "" {
			return errors.New("[ERROR]: " + r.Message)
		}
		return errors.New("[ERROR]: Unknown Error")
	}
}
