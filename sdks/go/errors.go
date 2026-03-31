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

// APIError represents a structured error response from the Kibamail API.
// It preserves the full error envelope including code, hint, and validation details.
type APIError struct {
	StatusCode       int                    `json:"-"`
	Type             string                 `json:"type"`
	Code             string                 `json:"code"`
	Message          string                 `json:"message"`
	Hint             string                 `json:"hint,omitempty"`
	RequestID        string                 `json:"requestId,omitempty"`
	ValidationErrors []APIValidationError   `json:"validationErrors,omitempty"`
	Details          map[string]interface{} `json:"details,omitempty"`
}

// APIValidationError represents a single field-level validation error.
type APIValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	if e.Hint != "" {
		return e.Message + " — " + e.Hint
	}
	return e.Message
}

// Is implements errors.Is for detecting API errors.
func (e *APIError) Is(target error) bool {
	_, ok := target.(*APIError)
	return ok
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
	ErrFailedToCreateTopicsCreateRequest       = errors.New("[ERROR]: Failed to create Topics.Create request")
	ErrFailedToCreateTopicsListRequest         = errors.New("[ERROR]: Failed to create Topics.List request")
	ErrFailedToCreateTopicsGetRequest          = errors.New("[ERROR]: Failed to create Topics.Get request")
	ErrFailedToCreateTopicsUpdateRequest       = errors.New("[ERROR]: Failed to create Topics.Update request")
	ErrFailedToCreateTopicsDeleteRequest       = errors.New("[ERROR]: Failed to create Topics.Delete request")
	ErrFailedToCreateTopicsListContactsRequest = errors.New("[ERROR]: Failed to create Topics.ListContacts request")
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
	ErrFailedToCreateFormsDeleteRequest  = errors.New("[ERROR]: Failed to create Forms.Delete request")
	ErrFailedToCreateFormsDeployRequest  = errors.New("[ERROR]: Failed to create Forms.Deploy request")
	ErrFailedToCreateFormsPublishRequest       = errors.New("[ERROR]: Failed to create Forms.Publish request")
	ErrFailedToCreateFormsCreateVersionRequest = errors.New("[ERROR]: Failed to create Forms.CreateVersion request")
	ErrFailedToCreateFormsListVersionsRequest  = errors.New("[ERROR]: Failed to create Forms.ListVersions request")
	ErrFailedToCreateFormsSubmitRequest         = errors.New("[ERROR]: Failed to create Forms.Submit request")
)

// MarketingEmailsSvc errors
var (
	ErrFailedToCreateMarketingEmailsCreateRequest  = errors.New("[ERROR]: Failed to create MarketingEmails.Create request")
	ErrFailedToCreateMarketingEmailsListRequest    = errors.New("[ERROR]: Failed to create MarketingEmails.List request")
	ErrFailedToCreateMarketingEmailsGetRequest     = errors.New("[ERROR]: Failed to create MarketingEmails.Get request")
	ErrFailedToCreateMarketingEmailsUpdateRequest  = errors.New("[ERROR]: Failed to create MarketingEmails.Update request")
	ErrFailedToCreateMarketingEmailsDeleteRequest  = errors.New("[ERROR]: Failed to create MarketingEmails.Delete request")
	ErrFailedToCreateMarketingEmailsPreviewRequest = errors.New("[ERROR]: Failed to create MarketingEmails.Preview request")
	ErrFailedToCreateMarketingEmailsStatsRequest   = errors.New("[ERROR]: Failed to create MarketingEmails.Stats request")
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

// EmailsSvc errors
var (
	ErrFailedToCreateEmailsSendRequest    = errors.New("[ERROR]: Failed to create Emails.Send request")
	ErrFailedToCreateEmailsListRequest    = errors.New("[ERROR]: Failed to create Emails.List request")
	ErrFailedToCreateEmailsGetRequest     = errors.New("[ERROR]: Failed to create Emails.Get request")
	ErrFailedToCreateEmailsEventsRequest  = errors.New("[ERROR]: Failed to create Emails.Events request")
	ErrFailedToCreateEmailsContentRequest = errors.New("[ERROR]: Failed to create Emails.Content request")
)

// DomainsSvc errors
var (
	ErrFailedToCreateDomainsCreateRequest = errors.New("[ERROR]: Failed to create Domains.Create request")
	ErrFailedToCreateDomainsListRequest   = errors.New("[ERROR]: Failed to create Domains.List request")
	ErrFailedToCreateDomainsGetRequest    = errors.New("[ERROR]: Failed to create Domains.Get request")
	ErrFailedToCreateDomainsUpdateRequest = errors.New("[ERROR]: Failed to create Domains.Update request")
	ErrFailedToCreateDomainsDeleteRequest = errors.New("[ERROR]: Failed to create Domains.Delete request")
	ErrFailedToCreateDomainsVerifyRequest = errors.New("[ERROR]: Failed to create Domains.Verify request")
)

// BroadcastsSvc errors
var (
	ErrFailedToCreateBroadcastsCreateRequest        = errors.New("[ERROR]: Failed to create Broadcasts.Create request")
	ErrFailedToCreateBroadcastsListRequest          = errors.New("[ERROR]: Failed to create Broadcasts.List request")
	ErrFailedToCreateBroadcastsGetRequest           = errors.New("[ERROR]: Failed to create Broadcasts.Get request")
	ErrFailedToCreateBroadcastsUpdateRequest        = errors.New("[ERROR]: Failed to create Broadcasts.Update request")
	ErrFailedToCreateBroadcastsDeleteRequest        = errors.New("[ERROR]: Failed to create Broadcasts.Delete request")
	ErrFailedToCreateBroadcastsSendRequest          = errors.New("[ERROR]: Failed to create Broadcasts.Send request")
	ErrFailedToCreateBroadcastsCreateAndSendRequest = errors.New("[ERROR]: Failed to create Broadcasts.CreateAndSend request")
	ErrFailedToCreateBroadcastsListSendsRequest     = errors.New("[ERROR]: Failed to create Broadcasts.ListSends request")
	ErrFailedToCreateBroadcastsStatsRequest         = errors.New("[ERROR]: Failed to create Broadcasts.Stats request")
)

// AutomationsSvc errors
var (
	ErrFailedToCreateAutomationsCreateRequest        = errors.New("[ERROR]: Failed to create Automations.Create request")
	ErrFailedToCreateAutomationsListRequest          = errors.New("[ERROR]: Failed to create Automations.List request")
	ErrFailedToCreateAutomationsGetRequest           = errors.New("[ERROR]: Failed to create Automations.Get request")
	ErrFailedToCreateAutomationsUpdateRequest        = errors.New("[ERROR]: Failed to create Automations.Update request")
	ErrFailedToCreateAutomationsDeleteRequest        = errors.New("[ERROR]: Failed to create Automations.Delete request")
	ErrFailedToCreateAutomationsPublishRequest       = errors.New("[ERROR]: Failed to create Automations.Publish request")
	ErrFailedToCreateAutomationsArchiveRequest       = errors.New("[ERROR]: Failed to create Automations.Archive request")
	ErrFailedToCreateAutomationsTriggerRequest       = errors.New("[ERROR]: Failed to create Automations.Trigger request")
	ErrFailedToCreateAutomationsSimulateRequest      = errors.New("[ERROR]: Failed to create Automations.Simulate request")
	ErrFailedToCreateAutomationsListVersionsRequest  = errors.New("[ERROR]: Failed to create Automations.ListVersions request")
	ErrFailedToCreateAutomationsCreateVersionRequest = errors.New("[ERROR]: Failed to create Automations.CreateVersion request")
)

// EventsSvc errors
var (
	ErrFailedToCreateEventsCreateRequest = errors.New("[ERROR]: Failed to create Events.Create request")
)

// InboxSvc errors
var (
	ErrFailedToCreateInboxListConversationsRequest  = errors.New("[ERROR]: Failed to create Inbox.ListConversations request")
	ErrFailedToCreateInboxGetConversationRequest    = errors.New("[ERROR]: Failed to create Inbox.GetConversation request")
	ErrFailedToCreateInboxUpdateConversationRequest = errors.New("[ERROR]: Failed to create Inbox.UpdateConversation request")
	ErrFailedToCreateInboxReplyRequest              = errors.New("[ERROR]: Failed to create Inbox.Reply request")
	ErrFailedToCreateInboxStatsRequest              = errors.New("[ERROR]: Failed to create Inbox.Stats request")
)

// handleError tries to handle errors based on HTTP status codes.
// It preserves the full structured error response from the API.
func handleError(resp *http.Response) error {
	// Handle rate limit errors (429) separately for RateLimitError type
	if resp.StatusCode == http.StatusTooManyRequests {
		apiErr := parseAPIError(resp)
		return &RateLimitError{
			Message:    apiErr.Message,
			Limit:      resp.Header.Get("ratelimit-limit"),
			Remaining:  resp.Header.Get("ratelimit-remaining"),
			Reset:      resp.Header.Get("ratelimit-reset"),
			RetryAfter: resp.Header.Get("retry-after"),
		}
	}

	return parseAPIError(resp)
}

// parseAPIError reads the response body and extracts the structured error envelope.
func parseAPIError(resp *http.Response) *APIError {
	if !strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
		return &APIError{
			StatusCode: resp.StatusCode,
			Code:       "UNKNOWN_ERROR",
			Message:    resp.Status,
		}
	}

	// Try to parse the full { "error": { ... } } envelope
	var envelope struct {
		Error struct {
			Type             string                 `json:"type"`
			Code             string                 `json:"code"`
			Message          string                 `json:"message"`
			Hint             string                 `json:"hint"`
			RequestID        string                 `json:"requestId"`
			ValidationErrors []APIValidationError   `json:"validationErrors"`
			Details          map[string]interface{} `json:"details"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return &APIError{
			StatusCode: resp.StatusCode,
			Code:       "PARSE_ERROR",
			Message:    "Failed to parse API error response",
		}
	}

	return &APIError{
		StatusCode:       resp.StatusCode,
		Type:             envelope.Error.Type,
		Code:             envelope.Error.Code,
		Message:          envelope.Error.Message,
		Hint:             envelope.Error.Hint,
		RequestID:        envelope.Error.RequestID,
		ValidationErrors: envelope.Error.ValidationErrors,
		Details:          envelope.Error.Details,
	}
}
