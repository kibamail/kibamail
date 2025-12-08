package kibamail

import (
	"context"
	"net/http"
)

// CreateFormRequest is the request object for the Create call.
type CreateFormRequest struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Fields      interface{} `json:"fields"`
}

// UpdateFormRequest is the request object for the Update call.
type UpdateFormRequest struct {
	Name        string        `json:"name,omitempty"`
	Description string        `json:"description,omitempty"`
	Fields      []interface{} `json:"fields,omitempty"`
}

// Form provides the structure for a form object.
type Form struct {
	Object      string        `json:"object"`
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Fields      []interface{} `json:"fields"`
	Status      string        `json:"status"`
	CreatedAt   string        `json:"createdAt"`
	UpdatedAt   string        `json:"updatedAt"`
}

// FormResponse is the response from the Create call.
type FormResponse struct {
	Object string `json:"object"`
	ID     string `json:"id"`
}

// ListFormsResponse is the response from the List call.
type ListFormsResponse struct {
	Object      string `json:"object"`
	Data        []Form `json:"data"`
	HasMore     bool   `json:"hasMore"`
	HasPrevious bool   `json:"hasPrevious"`
}

// FormsSvc provides an interface for managing forms.
type FormsSvc interface {
	Create(params *CreateFormRequest) (*FormResponse, error)
	CreateWithContext(ctx context.Context, params *CreateFormRequest) (*FormResponse, error)
	List(params *ListOptions) (*ListFormsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListFormsResponse, error)
	Get(formId string) (*Form, error)
	GetWithContext(ctx context.Context, formId string) (*Form, error)
	Update(formId string, params *UpdateFormRequest) (*FormResponse, error)
	UpdateWithContext(ctx context.Context, formId string, params *UpdateFormRequest) (*FormResponse, error)
	Delete(formId string) error
	DeleteWithContext(ctx context.Context, formId string) error
}

// FormsSvcImpl implements FormsSvc.
type FormsSvcImpl struct {
	client *Client
}

// Create creates a new form in your workspace.
func (s *FormsSvcImpl) Create(params *CreateFormRequest) (*FormResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new form in your workspace.
func (s *FormsSvcImpl) CreateWithContext(ctx context.Context, params *CreateFormRequest) (*FormResponse, error) {
	path := "v1/forms"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateFormsCreateRequest
	}

	formResponse := new(FormResponse)
	_, err = s.client.Perform(req, formResponse)
	if err != nil {
		return nil, err
	}

	return formResponse, nil
}

// List retrieves a paginated list of all forms in your workspace.
func (s *FormsSvcImpl) List(params *ListOptions) (*ListFormsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all forms in your workspace.
func (s *FormsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListFormsResponse, error) {
	path := "v1/forms" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateFormsListRequest
	}

	listFormsResponse := new(ListFormsResponse)
	_, err = s.client.Perform(req, listFormsResponse)
	if err != nil {
		return nil, err
	}

	return listFormsResponse, nil
}

// Get retrieves a specific form by ID.
func (s *FormsSvcImpl) Get(formId string) (*Form, error) {
	return s.GetWithContext(context.Background(), formId)
}

// GetWithContext retrieves a specific form by ID.
func (s *FormsSvcImpl) GetWithContext(ctx context.Context, formId string) (*Form, error) {
	path := "v1/forms/" + formId

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateFormsGetRequest
	}

	form := new(Form)
	_, err = s.client.Perform(req, form)
	if err != nil {
		return nil, err
	}

	return form, nil
}

// Update updates an existing form by ID.
func (s *FormsSvcImpl) Update(formId string, params *UpdateFormRequest) (*FormResponse, error) {
	return s.UpdateWithContext(context.Background(), formId, params)
}

// UpdateWithContext updates an existing form by ID.
func (s *FormsSvcImpl) UpdateWithContext(ctx context.Context, formId string, params *UpdateFormRequest) (*FormResponse, error) {
	path := "v1/forms/" + formId

	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateFormsUpdateRequest
	}

	formResponse := new(FormResponse)
	_, err = s.client.Perform(req, formResponse)
	if err != nil {
		return nil, err
	}

	return formResponse, nil
}

// Delete deletes a form by ID.
func (s *FormsSvcImpl) Delete(formId string) error {
	return s.DeleteWithContext(context.Background(), formId)
}

// DeleteWithContext deletes a form by ID.
func (s *FormsSvcImpl) DeleteWithContext(ctx context.Context, formId string) error {
	path := "v1/forms/" + formId

	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateFormsDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	if err != nil {
		return err
	}

	return nil
}
