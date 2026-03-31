package kibamail

import (
	"context"
	"net/http"
)

// CreateContactPropertyRequest is the request object for the Create call.
type CreateContactPropertyRequest struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// UpdateContactPropertyRequest is the request object for the Update call.
type UpdateContactPropertyRequest struct {
	Name string `json:"name,omitempty"`
	Type string `json:"type,omitempty"`
}

// ContactProperty provides the structure for a contact property object.
type ContactProperty struct {
	Object       string  `json:"object"`
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

// ContactPropertyResponse is the response from the Create call.
type ContactPropertyResponse struct {
	ID string `json:"id"`
}

// ListContactPropertiesResponse is the response from the List call.
type ListContactPropertiesResponse struct {
	Object      string            `json:"object"`
	Data        []ContactProperty `json:"data"`
	HasMore     bool              `json:"hasMore"`
	HasPrevious bool              `json:"hasPrevious"`
}

// ContactPropertiesSvc provides an interface for managing contact properties.
type ContactPropertiesSvc interface {
	Create(params *CreateContactPropertyRequest) (*ContactPropertyResponse, error)
	CreateWithContext(ctx context.Context, params *CreateContactPropertyRequest) (*ContactPropertyResponse, error)
	List(params *ListOptions) (*ListContactPropertiesResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListContactPropertiesResponse, error)
	Get(propertyId string) (*ContactProperty, error)
	GetWithContext(ctx context.Context, propertyId string) (*ContactProperty, error)
	Update(propertyId string, params *UpdateContactPropertyRequest) (*ContactPropertyResponse, error)
	UpdateWithContext(ctx context.Context, propertyId string, params *UpdateContactPropertyRequest) (*ContactPropertyResponse, error)
	Delete(propertyId string) error
	DeleteWithContext(ctx context.Context, propertyId string) error
}

// ContactPropertiesSvcImpl implements ContactPropertiesSvc.
type ContactPropertiesSvcImpl struct {
	client *Client
}

// Create creates a new contact property in your workspace.
func (s *ContactPropertiesSvcImpl) Create(params *CreateContactPropertyRequest) (*ContactPropertyResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new contact property in your workspace.
func (s *ContactPropertiesSvcImpl) CreateWithContext(ctx context.Context, params *CreateContactPropertyRequest) (*ContactPropertyResponse, error) {
	path := "v1/contact-properties"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateContactPropertiesCreateRequest
	}

	contactPropertyResponse := new(ContactPropertyResponse)
	_, err = s.client.Perform(req, contactPropertyResponse)
	if err != nil {
		return nil, err
	}

	return contactPropertyResponse, nil
}

// List retrieves a paginated list of all contact properties in your workspace.
func (s *ContactPropertiesSvcImpl) List(params *ListOptions) (*ListContactPropertiesResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all contact properties in your workspace.
func (s *ContactPropertiesSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListContactPropertiesResponse, error) {
	path := "v1/contact-properties" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateContactPropertiesListRequest
	}

	listContactPropertiesResponse := new(ListContactPropertiesResponse)
	_, err = s.client.Perform(req, listContactPropertiesResponse)
	if err != nil {
		return nil, err
	}

	return listContactPropertiesResponse, nil
}

// Get retrieves a specific contact property by ID.
func (s *ContactPropertiesSvcImpl) Get(propertyId string) (*ContactProperty, error) {
	return s.GetWithContext(context.Background(), propertyId)
}

// GetWithContext retrieves a specific contact property by ID.
func (s *ContactPropertiesSvcImpl) GetWithContext(ctx context.Context, propertyId string) (*ContactProperty, error) {
	path := "v1/contact-properties/" + propertyId

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateContactPropertiesGetRequest
	}

	contactProperty := new(ContactProperty)
	_, err = s.client.Perform(req, contactProperty)
	if err != nil {
		return nil, err
	}

	return contactProperty, nil
}

// Update updates an existing contact property by ID.
func (s *ContactPropertiesSvcImpl) Update(propertyId string, params *UpdateContactPropertyRequest) (*ContactPropertyResponse, error) {
	return s.UpdateWithContext(context.Background(), propertyId, params)
}

// UpdateWithContext updates an existing contact property by ID.
func (s *ContactPropertiesSvcImpl) UpdateWithContext(ctx context.Context, propertyId string, params *UpdateContactPropertyRequest) (*ContactPropertyResponse, error) {
	path := "v1/contact-properties/" + propertyId

	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateContactPropertiesUpdateRequest
	}

	contactPropertyResponse := new(ContactPropertyResponse)
	_, err = s.client.Perform(req, contactPropertyResponse)
	if err != nil {
		return nil, err
	}

	return contactPropertyResponse, nil
}

// Delete deletes a contact property by ID.
func (s *ContactPropertiesSvcImpl) Delete(propertyId string) error {
	return s.DeleteWithContext(context.Background(), propertyId)
}

// DeleteWithContext deletes a contact property by ID.
func (s *ContactPropertiesSvcImpl) DeleteWithContext(ctx context.Context, propertyId string) error {
	path := "v1/contact-properties/" + propertyId

	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateContactPropertiesDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	if err != nil {
		return err
	}

	return nil
}
