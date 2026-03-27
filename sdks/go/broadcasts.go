package kibamail

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

// BroadcastEmailContent represents the email content for a broadcast.
type BroadcastEmailContent struct {
	Subject     string                 `json:"subject,omitempty"`
	Html        string                 `json:"html,omitempty"`
	Text        string                 `json:"text,omitempty"`
	PreviewText string                 `json:"previewText,omitempty"`
	ContentJson map[string]interface{} `json:"contentJson,omitempty"`
	Styles      map[string]interface{} `json:"styles,omitempty"`
}

// BroadcastEmailContentResponse represents the email content in a broadcast response.
type BroadcastEmailContentResponse struct {
	Subject     string                 `json:"subject"`
	Html        string                 `json:"html"`
	Text        string                 `json:"text"`
	PreviewText string                 `json:"previewText"`
	Json        map[string]interface{} `json:"json"`
	Styles      map[string]interface{} `json:"styles"`
}

// BroadcastRecipients represents the recipients for a create-and-send broadcast.
type BroadcastRecipients struct {
	Contacts []string    `json:"contacts,omitempty"`
	Emails   interface{} `json:"emails,omitempty"`
	Segment  string      `json:"segment,omitempty"`
	Topic    string      `json:"topic,omitempty"`
}

// CreateBroadcastRequest is the request object for the Create call.
type CreateBroadcastRequest struct {
	Name         string                 `json:"name"`
	From         string                 `json:"from,omitempty"`
	EmailContent *BroadcastEmailContent `json:"emailContent,omitempty"`
	ReplyTo      string                 `json:"replyTo,omitempty"`
	TopicId      string                 `json:"topicId,omitempty"`
	SegmentId    string                 `json:"segmentId,omitempty"`
}

// UpdateBroadcastRequest is the request object for the Update call.
type UpdateBroadcastRequest struct {
	Name         string                 `json:"name,omitempty"`
	From         string                 `json:"from,omitempty"`
	EmailContent *BroadcastEmailContent `json:"emailContent,omitempty"`
	ReplyTo      string                 `json:"replyTo,omitempty"`
	TopicId      string                 `json:"topicId,omitempty"`
	SegmentId    string                 `json:"segmentId,omitempty"`
	SendAt       string                 `json:"sendAt,omitempty"`
}

// CreateAndSendBroadcastRequest is the request object for the CreateAndSend call.
type CreateAndSendBroadcastRequest struct {
	Name         string                 `json:"name"`
	From         string                 `json:"from,omitempty"`
	ReplyTo      string                 `json:"replyTo,omitempty"`
	EmailContent *BroadcastEmailContent `json:"emailContent"`
	Recipients   *BroadcastRecipients   `json:"recipients"`
	SendAt       string                 `json:"sendAt"`
}

// CreateAndSendBroadcastResponse is the response from the CreateAndSend call.
type CreateAndSendBroadcastResponse struct {
	Object string `json:"object"`
	ID     string `json:"id"`
}

// Broadcast provides the structure for a broadcast object.
type Broadcast struct {
	Object       string                          `json:"object"`
	ID           string                          `json:"id"`
	Name         string                          `json:"name"`
	Status       string                          `json:"status"`
	From         string                          `json:"from"`
	EmailContent *BroadcastEmailContentResponse  `json:"emailContent"`
	ReplyTo      string                          `json:"replyTo"`
	TopicId      string                          `json:"topicId"`
	SegmentId    string                          `json:"segmentId"`
	SendAt       string                          `json:"sendAt"`
	CreatedAt    string                          `json:"createdAt"`
}

// ListBroadcastsResponse is the response from the List call.
type ListBroadcastsResponse struct {
	Object      string      `json:"object"`
	HasMore     bool        `json:"hasMore"`
	HasPrevious bool        `json:"hasPrevious"`
	Data        []Broadcast `json:"data"`
}

// BroadcastSend represents an individual email send for a broadcast.
type BroadcastSend struct {
	ID                   string  `json:"id"`
	Email                string  `json:"email"`
	ContactId            string  `json:"contactId"`
	Status               string  `json:"status"`
	QueuedAt             string  `json:"queuedAt"`
	SentAt               string  `json:"sentAt"`
	DeliveredAt          string  `json:"deliveredAt"`
	FirstOpenedAt        string  `json:"firstOpenedAt"`
	FirstClickedAt       string  `json:"firstClickedAt"`
	BouncedAt            string  `json:"bouncedAt"`
	ComplainedAt         string  `json:"complainedAt"`
	OpenCount            float64 `json:"openCount"`
	ClickCount           float64 `json:"clickCount"`
	UniqueLinksClicked   float64 `json:"uniqueLinksClicked"`
	BounceClassification string  `json:"bounceClassification"`
	LastResponseCode     *float64 `json:"lastResponseCode"`
	LastResponseMessage  string  `json:"lastResponseMessage"`
}

// ListBroadcastSendsOptions contains query parameters for the ListSends call.
type ListBroadcastSendsOptions struct {
	Limit  *int    `json:"limit,omitempty"`
	After  *string `json:"after,omitempty"`
	Before *string `json:"before,omitempty"`
	Status *string `json:"status,omitempty"`
}

// ListBroadcastSendsResponse is the response from the ListSends call.
type ListBroadcastSendsResponse struct {
	Object      string          `json:"object"`
	HasMore     bool            `json:"hasMore"`
	HasPrevious bool            `json:"hasPrevious"`
	Data        []BroadcastSend `json:"data"`
}

// BroadcastStatsRecipients represents the recipient breakdown in broadcast stats.
type BroadcastStatsRecipients struct {
	Total        float64 `json:"total"`
	Queued       float64 `json:"queued"`
	Sent         float64 `json:"sent"`
	Delivered    float64 `json:"delivered"`
	Bounced      float64 `json:"bounced"`
	Complained   float64 `json:"complained"`
	Failed       float64 `json:"failed"`
	Unsubscribed float64 `json:"unsubscribed"`
}

// BroadcastStatsEngagement represents engagement metrics in broadcast stats.
type BroadcastStatsEngagement struct {
	Opened         float64 `json:"opened"`
	Clicked        float64 `json:"clicked"`
	OpenRate       float64 `json:"openRate"`
	ClickRate      float64 `json:"clickRate"`
	ClickToOpenRate float64 `json:"clickToOpenRate"`
}

// BroadcastStatsDeliverability represents deliverability metrics in broadcast stats.
type BroadcastStatsDeliverability struct {
	DeliveryRate  float64 `json:"deliveryRate"`
	BounceRate    float64 `json:"bounceRate"`
	ComplaintRate float64 `json:"complaintRate"`
}

// BroadcastStats represents aggregate statistics for a broadcast.
type BroadcastStats struct {
	Object         string                       `json:"object"`
	BroadcastId    string                       `json:"broadcastId"`
	Recipients     BroadcastStatsRecipients     `json:"recipients"`
	Engagement     BroadcastStatsEngagement     `json:"engagement"`
	Deliverability BroadcastStatsDeliverability `json:"deliverability"`
	DetailsPruned  bool                         `json:"detailsPruned"`
}

// BroadcastsSvc provides an interface for managing broadcasts.
type BroadcastsSvc interface {
	Create(params *CreateBroadcastRequest) (*Broadcast, error)
	CreateWithContext(ctx context.Context, params *CreateBroadcastRequest) (*Broadcast, error)
	List(params *ListOptions) (*ListBroadcastsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListBroadcastsResponse, error)
	Get(broadcastId string) (*Broadcast, error)
	GetWithContext(ctx context.Context, broadcastId string) (*Broadcast, error)
	Update(broadcastId string, params *UpdateBroadcastRequest) (*Broadcast, error)
	UpdateWithContext(ctx context.Context, broadcastId string, params *UpdateBroadcastRequest) (*Broadcast, error)
	Delete(broadcastId string) error
	DeleteWithContext(ctx context.Context, broadcastId string) error
	Send(broadcastId string) (*Broadcast, error)
	SendWithContext(ctx context.Context, broadcastId string) (*Broadcast, error)
	CreateAndSend(params *CreateAndSendBroadcastRequest) (*CreateAndSendBroadcastResponse, error)
	CreateAndSendWithContext(ctx context.Context, params *CreateAndSendBroadcastRequest) (*CreateAndSendBroadcastResponse, error)
	ListSends(broadcastId string, params *ListBroadcastSendsOptions) (*ListBroadcastSendsResponse, error)
	ListSendsWithContext(ctx context.Context, broadcastId string, params *ListBroadcastSendsOptions) (*ListBroadcastSendsResponse, error)
	Stats(broadcastId string) (*BroadcastStats, error)
	StatsWithContext(ctx context.Context, broadcastId string) (*BroadcastStats, error)
}

// BroadcastsSvcImpl implements BroadcastsSvc.
type BroadcastsSvcImpl struct {
	client *Client
}

// buildBroadcastSendsQuery constructs query parameters for the broadcast sends endpoint.
func buildBroadcastSendsQuery(options *ListBroadcastSendsOptions) string {
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

	if len(query) > 0 {
		return "?" + query.Encode()
	}
	return ""
}

// Create creates a new broadcast draft in your workspace.
func (s *BroadcastsSvcImpl) Create(params *CreateBroadcastRequest) (*Broadcast, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new broadcast draft in your workspace.
func (s *BroadcastsSvcImpl) CreateWithContext(ctx context.Context, params *CreateBroadcastRequest) (*Broadcast, error) {
	path := "v1/broadcasts"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsCreateRequest
	}

	// Build response recipient obj
	broadcast := new(Broadcast)

	// Send Request
	_, err = s.client.Perform(req, broadcast)

	if err != nil {
		return nil, err
	}

	return broadcast, nil
}

// List retrieves a paginated list of all broadcasts in your workspace.
func (s *BroadcastsSvcImpl) List(params *ListOptions) (*ListBroadcastsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all broadcasts in your workspace.
func (s *BroadcastsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListBroadcastsResponse, error) {
	path := "v1/broadcasts" + buildPaginationQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsListRequest
	}

	// Build response recipient obj
	listBroadcastsResponse := new(ListBroadcastsResponse)

	// Send Request
	_, err = s.client.Perform(req, listBroadcastsResponse)

	if err != nil {
		return nil, err
	}

	return listBroadcastsResponse, nil
}

// Get retrieves a specific broadcast by ID.
func (s *BroadcastsSvcImpl) Get(broadcastId string) (*Broadcast, error) {
	return s.GetWithContext(context.Background(), broadcastId)
}

// GetWithContext retrieves a specific broadcast by ID.
func (s *BroadcastsSvcImpl) GetWithContext(ctx context.Context, broadcastId string) (*Broadcast, error) {
	path := "v1/broadcasts/" + broadcastId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsGetRequest
	}

	// Build response recipient obj
	broadcast := new(Broadcast)

	// Send Request
	_, err = s.client.Perform(req, broadcast)

	if err != nil {
		return nil, err
	}

	return broadcast, nil
}

// Update updates an existing broadcast by ID.
func (s *BroadcastsSvcImpl) Update(broadcastId string, params *UpdateBroadcastRequest) (*Broadcast, error) {
	return s.UpdateWithContext(context.Background(), broadcastId, params)
}

// UpdateWithContext updates an existing broadcast by ID.
func (s *BroadcastsSvcImpl) UpdateWithContext(ctx context.Context, broadcastId string, params *UpdateBroadcastRequest) (*Broadcast, error) {
	path := "v1/broadcasts/" + broadcastId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsUpdateRequest
	}

	// Build response recipient obj
	broadcast := new(Broadcast)

	// Send Request
	_, err = s.client.Perform(req, broadcast)

	if err != nil {
		return nil, err
	}

	return broadcast, nil
}

// Delete deletes a broadcast by ID.
func (s *BroadcastsSvcImpl) Delete(broadcastId string) error {
	return s.DeleteWithContext(context.Background(), broadcastId)
}

// DeleteWithContext deletes a broadcast by ID.
func (s *BroadcastsSvcImpl) DeleteWithContext(ctx context.Context, broadcastId string) error {
	path := "v1/broadcasts/" + broadcastId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateBroadcastsDeleteRequest
	}

	// Send Request
	_, err = s.client.Perform(req, nil)

	if err != nil {
		return err
	}

	return nil
}

// Send schedules an existing broadcast for sending.
func (s *BroadcastsSvcImpl) Send(broadcastId string) (*Broadcast, error) {
	return s.SendWithContext(context.Background(), broadcastId)
}

// SendWithContext schedules an existing broadcast for sending.
func (s *BroadcastsSvcImpl) SendWithContext(ctx context.Context, broadcastId string) (*Broadcast, error) {
	path := "v1/broadcasts/" + broadcastId + "/send"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsSendRequest
	}

	// Build response recipient obj
	broadcast := new(Broadcast)

	// Send Request
	_, err = s.client.Perform(req, broadcast)

	if err != nil {
		return nil, err
	}

	return broadcast, nil
}

// CreateAndSend creates a broadcast and schedules it for delivery.
func (s *BroadcastsSvcImpl) CreateAndSend(params *CreateAndSendBroadcastRequest) (*CreateAndSendBroadcastResponse, error) {
	return s.CreateAndSendWithContext(context.Background(), params)
}

// CreateAndSendWithContext creates a broadcast and schedules it for delivery.
func (s *BroadcastsSvcImpl) CreateAndSendWithContext(ctx context.Context, params *CreateAndSendBroadcastRequest) (*CreateAndSendBroadcastResponse, error) {
	path := "v1/broadcasts/create-and-send"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsCreateAndSendRequest
	}

	// Build response recipient obj
	createAndSendResponse := new(CreateAndSendBroadcastResponse)

	// Send Request
	_, err = s.client.Perform(req, createAndSendResponse)

	if err != nil {
		return nil, err
	}

	return createAndSendResponse, nil
}

// ListSends retrieves a paginated list of individual email sends for a broadcast.
func (s *BroadcastsSvcImpl) ListSends(broadcastId string, params *ListBroadcastSendsOptions) (*ListBroadcastSendsResponse, error) {
	return s.ListSendsWithContext(context.Background(), broadcastId, params)
}

// ListSendsWithContext retrieves a paginated list of individual email sends for a broadcast.
func (s *BroadcastsSvcImpl) ListSendsWithContext(ctx context.Context, broadcastId string, params *ListBroadcastSendsOptions) (*ListBroadcastSendsResponse, error) {
	path := "v1/broadcasts/" + broadcastId + "/sends" + buildBroadcastSendsQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsListSendsRequest
	}

	// Build response recipient obj
	listBroadcastSendsResponse := new(ListBroadcastSendsResponse)

	// Send Request
	_, err = s.client.Perform(req, listBroadcastSendsResponse)

	if err != nil {
		return nil, err
	}

	return listBroadcastSendsResponse, nil
}

// Stats retrieves aggregate statistics for a broadcast.
func (s *BroadcastsSvcImpl) Stats(broadcastId string) (*BroadcastStats, error) {
	return s.StatsWithContext(context.Background(), broadcastId)
}

// StatsWithContext retrieves aggregate statistics for a broadcast.
func (s *BroadcastsSvcImpl) StatsWithContext(ctx context.Context, broadcastId string) (*BroadcastStats, error) {
	path := "v1/broadcasts/" + broadcastId + "/stats"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateBroadcastsStatsRequest
	}

	// Build response recipient obj
	broadcastStats := new(BroadcastStats)

	// Send Request
	_, err = s.client.Perform(req, broadcastStats)

	if err != nil {
		return nil, err
	}

	return broadcastStats, nil
}
