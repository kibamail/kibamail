package kibamail

import (
	"context"
	"net/http"
)

// CreateContactRequest is the request object for the Create call.
type CreateContactRequest struct {
	Email          string                 `json:"email"`
	FirstName      string                 `json:"firstName,omitempty"`
	LastName       string                 `json:"lastName,omitempty"`
	Phone          string                 `json:"phone,omitempty"`
	Country        string                 `json:"country,omitempty"`
	City           string                 `json:"city,omitempty"`
	Timezone       string                 `json:"timezone,omitempty"`
	Status         string                 `json:"status,omitempty"`
	SubscribedAt   string                 `json:"subscribedAt,omitempty"`
	UnsubscribedAt string                 `json:"unsubscribedAt,omitempty"`
	Properties     map[string]interface{} `json:"properties,omitempty"`
	Topics         []string               `json:"topics,omitempty"`
}

// UpdateContactRequest is the request object for the Update call.
type UpdateContactRequest struct {
	Email      string                 `json:"email,omitempty"`
	FirstName  string                 `json:"firstName,omitempty"`
	LastName   string                 `json:"lastName,omitempty"`
	Phone      string                 `json:"phone,omitempty"`
	Country    string                 `json:"country,omitempty"`
	City       string                 `json:"city,omitempty"`
	Timezone   string                 `json:"timezone,omitempty"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	Topics     []string               `json:"topics,omitempty"`
}

// SearchContactRequest is the request object for the Search call.
type SearchContactRequest struct {
	Filters interface{} `json:"filters"`
	Limit   *int        `json:"limit,omitempty"`
	After   *string     `json:"after,omitempty"`
	Before  *string     `json:"before,omitempty"`
}

// Contact provides the structure for a contact object.
type Contact struct {
	Object     string                 `json:"object"`
	ID         string                 `json:"id"`
	Email      string                 `json:"email"`
	FirstName  string                 `json:"firstName"`
	LastName   string                 `json:"lastName"`
	Phone      string                 `json:"phone"`
	Country    string                 `json:"country"`
	City       string                 `json:"city"`
	Timezone   string                 `json:"timezone"`
	Status     string                 `json:"status"`
	Properties map[string]interface{} `json:"properties"`
	Topics     []string               `json:"topics"`
	CreatedAt  string                 `json:"createdAt"`
	UpdatedAt  string                 `json:"updatedAt"`
}

// ContactResponse is the response from the Create call.
type ContactResponse struct {
	ID string `json:"id"`
}

// ListContactsResponse is the response from the List call.
type ListContactsResponse struct {
	Object      string    `json:"object"`
	Data        []Contact `json:"data"`
	HasMore     bool      `json:"hasMore"`
	HasPrevious bool      `json:"hasPrevious"`
}

// SearchContactsResponse is the response from the Search call.
type SearchContactsResponse struct {
	Object      string    `json:"object"`
	Data        []Contact `json:"data"`
	HasMore     bool      `json:"hasMore"`
	HasPrevious bool      `json:"hasPrevious"`
}

// ContactsSvc provides an interface for managing contacts.
type ContactsSvc interface {
	Create(params *CreateContactRequest) (*ContactResponse, error)
	CreateWithContext(ctx context.Context, params *CreateContactRequest) (*ContactResponse, error)
	List(params *ListOptions) (*ListContactsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListContactsResponse, error)
	Get(contactId string) (*Contact, error)
	GetWithContext(ctx context.Context, contactId string) (*Contact, error)
	Update(contactId string, params *UpdateContactRequest) (*ContactResponse, error)
	UpdateWithContext(ctx context.Context, contactId string, params *UpdateContactRequest) (*ContactResponse, error)
	Delete(contactId string) error
	DeleteWithContext(ctx context.Context, contactId string) error
	Search(params *SearchContactRequest) (*SearchContactsResponse, error)
	SearchWithContext(ctx context.Context, params *SearchContactRequest) (*SearchContactsResponse, error)
}

// ContactsSvcImpl implements ContactsSvc.
type ContactsSvcImpl struct {
	client *Client
}

// Create creates a new contact in your workspace.
func (s *ContactsSvcImpl) Create(params *CreateContactRequest) (*ContactResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new contact in your workspace.
func (s *ContactsSvcImpl) CreateWithContext(ctx context.Context, params *CreateContactRequest) (*ContactResponse, error) {
	path := "v1/contacts"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateContactsCreateRequest
	}

	// Build response recipient obj
	contactResponse := new(ContactResponse)

	// Send Request
	_, err = s.client.Perform(req, contactResponse)

	if err != nil {
		return nil, err
	}

	return contactResponse, nil
}

// List retrieves a paginated list of all contacts in your workspace.
func (s *ContactsSvcImpl) List(params *ListOptions) (*ListContactsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all contacts in your workspace.
func (s *ContactsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListContactsResponse, error) {
	path := "v1/contacts" + buildPaginationQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateContactsListRequest
	}

	// Build response recipient obj
	listContactsResponse := new(ListContactsResponse)

	// Send Request
	_, err = s.client.Perform(req, listContactsResponse)

	if err != nil {
		return nil, err
	}

	return listContactsResponse, nil
}

// Get retrieves a specific contact by ID.
func (s *ContactsSvcImpl) Get(contactId string) (*Contact, error) {
	return s.GetWithContext(context.Background(), contactId)
}

// GetWithContext retrieves a specific contact by ID.
func (s *ContactsSvcImpl) GetWithContext(ctx context.Context, contactId string) (*Contact, error) {
	path := "v1/contacts/" + contactId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateContactsGetRequest
	}

	// Build response recipient obj
	contact := new(Contact)

	// Send Request
	_, err = s.client.Perform(req, contact)

	if err != nil {
		return nil, err
	}

	return contact, nil
}

// Update updates an existing contact by ID.
func (s *ContactsSvcImpl) Update(contactId string, params *UpdateContactRequest) (*ContactResponse, error) {
	return s.UpdateWithContext(context.Background(), contactId, params)
}

// UpdateWithContext updates an existing contact by ID.
func (s *ContactsSvcImpl) UpdateWithContext(ctx context.Context, contactId string, params *UpdateContactRequest) (*ContactResponse, error) {
	path := "v1/contacts/" + contactId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateContactsUpdateRequest
	}

	// Build response recipient obj
	contactResponse := new(ContactResponse)

	// Send Request
	_, err = s.client.Perform(req, contactResponse)

	if err != nil {
		return nil, err
	}

	return contactResponse, nil
}

// Delete deletes a contact by ID.
func (s *ContactsSvcImpl) Delete(contactId string) error {
	return s.DeleteWithContext(context.Background(), contactId)
}

// DeleteWithContext deletes a contact by ID.
func (s *ContactsSvcImpl) DeleteWithContext(ctx context.Context, contactId string) error {
	path := "v1/contacts/" + contactId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateContactsDeleteRequest
	}

	// Send Request
	_, err = s.client.Perform(req, nil)

	if err != nil {
		return err
	}

	return nil
}

// Search searches contacts using advanced filtering conditions.
func (s *ContactsSvcImpl) Search(params *SearchContactRequest) (*SearchContactsResponse, error) {
	return s.SearchWithContext(context.Background(), params)
}

// SearchWithContext searches contacts using advanced filtering conditions.
func (s *ContactsSvcImpl) SearchWithContext(ctx context.Context, params *SearchContactRequest) (*SearchContactsResponse, error) {
	path := "v1/contacts/search"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateContactsSearchRequest
	}

	// Build response recipient obj
	searchContactsResponse := new(SearchContactsResponse)

	// Send Request
	_, err = s.client.Perform(req, searchContactsResponse)

	if err != nil {
		return nil, err
	}

	return searchContactsResponse, nil
}
