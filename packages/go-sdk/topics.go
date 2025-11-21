package kibamail

import (
	"context"
	"net/http"
)

// CreateTopicRequest is the request object for the Create call.
type CreateTopicRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	Visibility   string `json:"visibility,omitempty"`
	DefaultOptIn bool   `json:"defaultOptIn,omitempty"`
}

// UpdateTopicRequest is the request object for the Update call.
type UpdateTopicRequest struct {
	Name         string `json:"name,omitempty"`
	Description  string `json:"description,omitempty"`
	Visibility   string `json:"visibility,omitempty"`
	DefaultOptIn *bool  `json:"defaultOptIn,omitempty"`
}

// Topic provides the structure for a topic object.
type Topic struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Visibility   string `json:"visibility"`
	DefaultOptIn bool   `json:"defaultOptIn"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// TopicResponse is the response from the Create call.
type TopicResponse struct {
	ID string `json:"id"`
}

// ListTopicsResponse is the response from the List call.
type ListTopicsResponse struct {
	Data        []Topic `json:"data"`
	HasMore     bool    `json:"hasMore"`
	HasPrevious bool    `json:"hasPrevious"`
}

// TopicsSvc provides an interface for managing topics.
type TopicsSvc interface {
	Create(params *CreateTopicRequest) (*TopicResponse, error)
	CreateWithContext(ctx context.Context, params *CreateTopicRequest) (*TopicResponse, error)
	List(params *ListOptions) (*ListTopicsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListTopicsResponse, error)
	Get(topicId string) (*Topic, error)
	GetWithContext(ctx context.Context, topicId string) (*Topic, error)
	Update(topicId string, params *UpdateTopicRequest) (*TopicResponse, error)
	UpdateWithContext(ctx context.Context, topicId string, params *UpdateTopicRequest) (*TopicResponse, error)
	Delete(topicId string) error
	DeleteWithContext(ctx context.Context, topicId string) error
}

// TopicsSvcImpl implements TopicsSvc.
type TopicsSvcImpl struct {
	client *Client
}

// Create creates a new topic in your workspace.
func (s *TopicsSvcImpl) Create(params *CreateTopicRequest) (*TopicResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new topic in your workspace.
func (s *TopicsSvcImpl) CreateWithContext(ctx context.Context, params *CreateTopicRequest) (*TopicResponse, error) {
	path := "v1/topics"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateTopicsCreateRequest
	}

	topicResponse := new(TopicResponse)
	_, err = s.client.Perform(req, topicResponse)
	if err != nil {
		return nil, err
	}

	return topicResponse, nil
}

// List retrieves a paginated list of all topics in your workspace.
func (s *TopicsSvcImpl) List(params *ListOptions) (*ListTopicsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all topics in your workspace.
func (s *TopicsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListTopicsResponse, error) {
	path := "v1/topics" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateTopicsListRequest
	}

	listTopicsResponse := new(ListTopicsResponse)
	_, err = s.client.Perform(req, listTopicsResponse)
	if err != nil {
		return nil, err
	}

	return listTopicsResponse, nil
}

// Get retrieves a specific topic by ID.
func (s *TopicsSvcImpl) Get(topicId string) (*Topic, error) {
	return s.GetWithContext(context.Background(), topicId)
}

// GetWithContext retrieves a specific topic by ID.
func (s *TopicsSvcImpl) GetWithContext(ctx context.Context, topicId string) (*Topic, error) {
	path := "v1/topics/" + topicId

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateTopicsGetRequest
	}

	topic := new(Topic)
	_, err = s.client.Perform(req, topic)
	if err != nil {
		return nil, err
	}

	return topic, nil
}

// Update updates an existing topic by ID.
func (s *TopicsSvcImpl) Update(topicId string, params *UpdateTopicRequest) (*TopicResponse, error) {
	return s.UpdateWithContext(context.Background(), topicId, params)
}

// UpdateWithContext updates an existing topic by ID.
func (s *TopicsSvcImpl) UpdateWithContext(ctx context.Context, topicId string, params *UpdateTopicRequest) (*TopicResponse, error) {
	path := "v1/topics/" + topicId

	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateTopicsUpdateRequest
	}

	topicResponse := new(TopicResponse)
	_, err = s.client.Perform(req, topicResponse)
	if err != nil {
		return nil, err
	}

	return topicResponse, nil
}

// Delete deletes a topic by ID.
func (s *TopicsSvcImpl) Delete(topicId string) error {
	return s.DeleteWithContext(context.Background(), topicId)
}

// DeleteWithContext deletes a topic by ID.
func (s *TopicsSvcImpl) DeleteWithContext(ctx context.Context, topicId string) error {
	path := "v1/topics/" + topicId

	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateTopicsDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	if err != nil {
		return err
	}

	return nil
}
