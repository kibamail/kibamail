package kibamail

import (
	"context"
	"net/http"
)

// CreateSegmentRequest is the request object for the Create call.
type CreateSegmentRequest struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Conditions  interface{} `json:"conditions"`
}

// UpdateSegmentRequest is the request object for the Update call.
type UpdateSegmentRequest struct {
	Name        string      `json:"name,omitempty"`
	Description string      `json:"description,omitempty"`
	Conditions  interface{} `json:"conditions,omitempty"`
}

// Segment provides the structure for a segment object.
type Segment struct {
	Object      string      `json:"object"`
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Conditions  interface{} `json:"conditions"`
	CreatedAt   string      `json:"createdAt"`
	UpdatedAt   string      `json:"updatedAt"`
}

// SegmentResponse is the response from the Create call.
type SegmentResponse struct {
	ID string `json:"id"`
}

// ListSegmentsResponse is the response from the List call.
type ListSegmentsResponse struct {
	Object      string    `json:"object"`
	Data        []Segment `json:"data"`
	HasMore     bool      `json:"hasMore"`
	HasPrevious bool      `json:"hasPrevious"`
}

// ListSegmentContactsResponse is the response from the ListContacts call.
type ListSegmentContactsResponse struct {
	Object      string    `json:"object"`
	Data        []Contact `json:"data"`
	HasMore     bool      `json:"hasMore"`
	HasPrevious bool      `json:"hasPrevious"`
}

// SegmentsSvc provides an interface for managing segments.
type SegmentsSvc interface {
	Create(params *CreateSegmentRequest) (*SegmentResponse, error)
	CreateWithContext(ctx context.Context, params *CreateSegmentRequest) (*SegmentResponse, error)
	List(params *ListOptions) (*ListSegmentsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListSegmentsResponse, error)
	Get(segmentId string) (*Segment, error)
	GetWithContext(ctx context.Context, segmentId string) (*Segment, error)
	Update(segmentId string, params *UpdateSegmentRequest) (*SegmentResponse, error)
	UpdateWithContext(ctx context.Context, segmentId string, params *UpdateSegmentRequest) (*SegmentResponse, error)
	Delete(segmentId string) error
	DeleteWithContext(ctx context.Context, segmentId string) error
	ListContacts(segmentId string, params *ListOptions) (*ListSegmentContactsResponse, error)
	ListContactsWithContext(ctx context.Context, segmentId string, params *ListOptions) (*ListSegmentContactsResponse, error)
}

// SegmentsSvcImpl implements SegmentsSvc.
type SegmentsSvcImpl struct {
	client *Client
}

// Create creates a new segment in your workspace.
func (s *SegmentsSvcImpl) Create(params *CreateSegmentRequest) (*SegmentResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new segment in your workspace.
func (s *SegmentsSvcImpl) CreateWithContext(ctx context.Context, params *CreateSegmentRequest) (*SegmentResponse, error) {
	path := "v1/segments"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateSegmentsCreateRequest
	}

	segmentResponse := new(SegmentResponse)
	_, err = s.client.Perform(req, segmentResponse)
	if err != nil {
		return nil, err
	}

	return segmentResponse, nil
}

// List retrieves a paginated list of all segments in your workspace.
func (s *SegmentsSvcImpl) List(params *ListOptions) (*ListSegmentsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all segments in your workspace.
func (s *SegmentsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListSegmentsResponse, error) {
	path := "v1/segments" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateSegmentsListRequest
	}

	listSegmentsResponse := new(ListSegmentsResponse)
	_, err = s.client.Perform(req, listSegmentsResponse)
	if err != nil {
		return nil, err
	}

	return listSegmentsResponse, nil
}

// Get retrieves a specific segment by ID.
func (s *SegmentsSvcImpl) Get(segmentId string) (*Segment, error) {
	return s.GetWithContext(context.Background(), segmentId)
}

// GetWithContext retrieves a specific segment by ID.
func (s *SegmentsSvcImpl) GetWithContext(ctx context.Context, segmentId string) (*Segment, error) {
	path := "v1/segments/" + segmentId

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateSegmentsGetRequest
	}

	segment := new(Segment)
	_, err = s.client.Perform(req, segment)
	if err != nil {
		return nil, err
	}

	return segment, nil
}

// Update updates an existing segment by ID.
func (s *SegmentsSvcImpl) Update(segmentId string, params *UpdateSegmentRequest) (*SegmentResponse, error) {
	return s.UpdateWithContext(context.Background(), segmentId, params)
}

// UpdateWithContext updates an existing segment by ID.
func (s *SegmentsSvcImpl) UpdateWithContext(ctx context.Context, segmentId string, params *UpdateSegmentRequest) (*SegmentResponse, error) {
	path := "v1/segments/" + segmentId

	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateSegmentsUpdateRequest
	}

	segmentResponse := new(SegmentResponse)
	_, err = s.client.Perform(req, segmentResponse)
	if err != nil {
		return nil, err
	}

	return segmentResponse, nil
}

// Delete deletes a segment by ID.
func (s *SegmentsSvcImpl) Delete(segmentId string) error {
	return s.DeleteWithContext(context.Background(), segmentId)
}

// DeleteWithContext deletes a segment by ID.
func (s *SegmentsSvcImpl) DeleteWithContext(ctx context.Context, segmentId string) error {
	path := "v1/segments/" + segmentId

	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateSegmentsDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	if err != nil {
		return err
	}

	return nil
}

// ListContacts retrieves contacts that belong to a specific segment.
func (s *SegmentsSvcImpl) ListContacts(segmentId string, params *ListOptions) (*ListSegmentContactsResponse, error) {
	return s.ListContactsWithContext(context.Background(), segmentId, params)
}

// ListContactsWithContext retrieves contacts that belong to a specific segment.
func (s *SegmentsSvcImpl) ListContactsWithContext(ctx context.Context, segmentId string, params *ListOptions) (*ListSegmentContactsResponse, error) {
	path := "v1/segments/" + segmentId + "/contacts" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateSegmentsListRequest
	}

	listContactsResponse := new(ListSegmentContactsResponse)
	_, err = s.client.Perform(req, listContactsResponse)
	if err != nil {
		return nil, err
	}

	return listContactsResponse, nil
}
