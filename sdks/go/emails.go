package kibamail

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

// SendEmailReplyTo represents the reply-to address for a transactional email.
type SendEmailReplyTo struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

// SendEmailTemplate represents template-based sending configuration.
type SendEmailTemplate struct {
	ID        string                 `json:"id"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// SendEmailAttachment represents a file attachment for a transactional email.
type SendEmailAttachment struct {
	Filename    string `json:"filename"`
	Content     string `json:"content"`
	ContentType string `json:"contentType,omitempty"`
}

// SendEmailRequest is the request object for the Send call.
type SendEmailRequest struct {
	From        string               `json:"from"`
	To          interface{}          `json:"to"`
	Subject     string               `json:"subject,omitempty"`
	Html        string               `json:"html,omitempty"`
	Text        string               `json:"text,omitempty"`
	PreviewText string               `json:"previewText,omitempty"`
	ReplyTo     *SendEmailReplyTo    `json:"replyTo,omitempty"`
	Template    *SendEmailTemplate   `json:"template,omitempty"`
	Attachments []SendEmailAttachment `json:"attachments,omitempty"`
	Metadata    map[string]string    `json:"metadata,omitempty"`
}

// SendEmailResponse is the response from the Send call.
type SendEmailResponse struct {
	Object string `json:"object"`
	ID     string `json:"id"`
}

// ListEmailsOptions contains query parameters for the List emails call.
type ListEmailsOptions struct {
	Limit    *int    `json:"limit,omitempty"`
	After    *string `json:"after,omitempty"`
	Before   *string `json:"before,omitempty"`
	Status   *string `json:"status,omitempty"`
	To       *string `json:"to,omitempty"`
	Subject  *string `json:"subject,omitempty"`
	FromDate *string `json:"from_date,omitempty"`
	ToDate   *string `json:"to_date,omitempty"`
}

// EmailFrom represents the sender information for an email.
type EmailFrom struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// EmailListItem represents a transactional email in a list response.
type EmailListItem struct {
	ID             string    `json:"id"`
	SendingID      string    `json:"sendingId"`
	From           EmailFrom `json:"from"`
	To             string    `json:"to"`
	Subject        string    `json:"subject"`
	Status         string    `json:"status"`
	OpenCount      float64   `json:"openCount"`
	ClickCount     float64   `json:"clickCount"`
	CreatedAt      string    `json:"createdAt"`
	SentAt         string    `json:"sentAt"`
	DeliveredAt    string    `json:"deliveredAt"`
	FirstOpenedAt  string    `json:"firstOpenedAt"`
	FirstClickedAt string    `json:"firstClickedAt"`
	BouncedAt      string    `json:"bouncedAt"`
}

// ListEmailsResponse is the response from the List call.
type ListEmailsResponse struct {
	Object  string          `json:"object"`
	HasMore bool            `json:"hasMore"`
	Data    []EmailListItem `json:"data"`
}

// EmailReplyTo represents the reply-to information on an email detail.
type EmailReplyTo struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// EmailDetail represents a full transactional email detail.
type EmailDetail struct {
	Object               string                 `json:"object"`
	ID                   string                 `json:"id"`
	SendingID            string                 `json:"sendingId"`
	From                 EmailFrom              `json:"from"`
	ReplyTo              *EmailReplyTo          `json:"replyTo"`
	To                   string                 `json:"to"`
	Subject              string                 `json:"subject"`
	PreviewText          string                 `json:"previewText"`
	Status               string                 `json:"status"`
	LastResponseCode     *float64               `json:"lastResponseCode"`
	LastResponseMessage  string                 `json:"lastResponseMessage"`
	BounceClassification string                 `json:"bounceClassification"`
	OpenTrackingEnabled  bool                   `json:"openTrackingEnabled"`
	ClickTrackingEnabled bool                   `json:"clickTrackingEnabled"`
	Metadata             map[string]interface{} `json:"metadata"`
	Tags                 []string               `json:"tags"`
	OpenCount            float64                `json:"openCount"`
	ClickCount           float64                `json:"clickCount"`
	UniqueLinksClicked   float64                `json:"uniqueLinksClicked"`
	TotalEvents          float64                `json:"totalEvents"`
	CreatedAt            string                 `json:"createdAt"`
	SentAt               string                 `json:"sentAt"`
	DeliveredAt          string                 `json:"deliveredAt"`
	FirstOpenedAt        string                 `json:"firstOpenedAt"`
	FirstClickedAt       string                 `json:"firstClickedAt"`
	BouncedAt            string                 `json:"bouncedAt"`
	ComplainedAt         string                 `json:"complainedAt"`
}

// EmailEventResponse represents the SMTP response details for an event.
type EmailEventResponse struct {
	Code    float64 `json:"code"`
	Content string  `json:"content"`
	Command string  `json:"command"`
}

// EmailEventOrigin represents geographic and device origin for open/click events.
type EmailEventOrigin struct {
	Country string `json:"country"`
	City    string `json:"city"`
	Device  string `json:"device"`
	Browser string `json:"browser"`
}

// EmailEvent represents a single event in an email's timeline.
type EmailEvent struct {
	ID                   string              `json:"id"`
	Type                 string              `json:"type"`
	Timestamp            string              `json:"timestamp"`
	Response             *EmailEventResponse `json:"response"`
	BounceClassification string              `json:"bounceClassification"`
	Origin               *EmailEventOrigin   `json:"origin"`
	Server               string              `json:"server"`
}

// EmailEventsResponse is the response from the Events call.
type EmailEventsResponse struct {
	Object    string       `json:"object"`
	EmailID   string       `json:"emailId"`
	SendingID string       `json:"sendingId"`
	Events    []EmailEvent `json:"events"`
}

// EmailContent represents the content of a transactional email.
type EmailContent struct {
	Object string `json:"object"`
	Html   string `json:"html"`
	Text   string `json:"text"`
}

// EmailsSvc provides an interface for managing transactional emails.
type EmailsSvc interface {
	Send(params *SendEmailRequest) (*SendEmailResponse, error)
	SendWithContext(ctx context.Context, params *SendEmailRequest) (*SendEmailResponse, error)
	List(params *ListEmailsOptions) (*ListEmailsResponse, error)
	ListWithContext(ctx context.Context, params *ListEmailsOptions) (*ListEmailsResponse, error)
	Get(emailId string) (*EmailDetail, error)
	GetWithContext(ctx context.Context, emailId string) (*EmailDetail, error)
	Events(emailId string) (*EmailEventsResponse, error)
	EventsWithContext(ctx context.Context, emailId string) (*EmailEventsResponse, error)
	Content(emailId string) (*EmailContent, error)
	ContentWithContext(ctx context.Context, emailId string) (*EmailContent, error)
}

// EmailsSvcImpl implements EmailsSvc.
type EmailsSvcImpl struct {
	client *Client
}

// buildEmailsListQuery constructs query parameters for the emails list endpoint.
func buildEmailsListQuery(options *ListEmailsOptions) string {
	if options == nil {
		return ""
	}

	query := make(url.Values)
	if options.Limit != nil {
		query.Set("limit", fmt.Sprintf("%d", *options.Limit))
	}
	if options.After != nil {
		query.Set("after", *options.After)
	}
	if options.Before != nil {
		query.Set("before", *options.Before)
	}
	if options.Status != nil {
		query.Set("status", *options.Status)
	}
	if options.To != nil {
		query.Set("to", *options.To)
	}
	if options.Subject != nil {
		query.Set("subject", *options.Subject)
	}
	if options.FromDate != nil {
		query.Set("from_date", *options.FromDate)
	}
	if options.ToDate != nil {
		query.Set("to_date", *options.ToDate)
	}

	if len(query) > 0 {
		return "?" + query.Encode()
	}
	return ""
}

// Send sends a transactional email.
func (s *EmailsSvcImpl) Send(params *SendEmailRequest) (*SendEmailResponse, error) {
	return s.SendWithContext(context.Background(), params)
}

// SendWithContext sends a transactional email.
func (s *EmailsSvcImpl) SendWithContext(ctx context.Context, params *SendEmailRequest) (*SendEmailResponse, error) {
	path := "v1/emails/send"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateEmailsSendRequest
	}

	// Build response recipient obj
	sendEmailResponse := new(SendEmailResponse)

	// Send Request
	_, err = s.client.Perform(req, sendEmailResponse)

	if err != nil {
		return nil, err
	}

	return sendEmailResponse, nil
}

// List retrieves a paginated list of transactional emails.
func (s *EmailsSvcImpl) List(params *ListEmailsOptions) (*ListEmailsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of transactional emails.
func (s *EmailsSvcImpl) ListWithContext(ctx context.Context, params *ListEmailsOptions) (*ListEmailsResponse, error) {
	path := "v1/emails" + buildEmailsListQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateEmailsListRequest
	}

	// Build response recipient obj
	listEmailsResponse := new(ListEmailsResponse)

	// Send Request
	_, err = s.client.Perform(req, listEmailsResponse)

	if err != nil {
		return nil, err
	}

	return listEmailsResponse, nil
}

// Get retrieves a specific transactional email by ID.
func (s *EmailsSvcImpl) Get(emailId string) (*EmailDetail, error) {
	return s.GetWithContext(context.Background(), emailId)
}

// GetWithContext retrieves a specific transactional email by ID.
func (s *EmailsSvcImpl) GetWithContext(ctx context.Context, emailId string) (*EmailDetail, error) {
	path := "v1/emails/" + emailId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateEmailsGetRequest
	}

	// Build response recipient obj
	emailDetail := new(EmailDetail)

	// Send Request
	_, err = s.client.Perform(req, emailDetail)

	if err != nil {
		return nil, err
	}

	return emailDetail, nil
}

// Events retrieves the event timeline for a specific transactional email.
func (s *EmailsSvcImpl) Events(emailId string) (*EmailEventsResponse, error) {
	return s.EventsWithContext(context.Background(), emailId)
}

// EventsWithContext retrieves the event timeline for a specific transactional email.
func (s *EmailsSvcImpl) EventsWithContext(ctx context.Context, emailId string) (*EmailEventsResponse, error) {
	path := "v1/emails/" + emailId + "/events"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateEmailsEventsRequest
	}

	// Build response recipient obj
	emailEventsResponse := new(EmailEventsResponse)

	// Send Request
	_, err = s.client.Perform(req, emailEventsResponse)

	if err != nil {
		return nil, err
	}

	return emailEventsResponse, nil
}

// Content retrieves the HTML and plain text content of a specific transactional email.
func (s *EmailsSvcImpl) Content(emailId string) (*EmailContent, error) {
	return s.ContentWithContext(context.Background(), emailId)
}

// ContentWithContext retrieves the HTML and plain text content of a specific transactional email.
func (s *EmailsSvcImpl) ContentWithContext(ctx context.Context, emailId string) (*EmailContent, error) {
	path := "v1/emails/" + emailId + "/content"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateEmailsContentRequest
	}

	// Build response recipient obj
	emailContent := new(EmailContent)

	// Send Request
	_, err = s.client.Perform(req, emailContent)

	if err != nil {
		return nil, err
	}

	return emailContent, nil
}
