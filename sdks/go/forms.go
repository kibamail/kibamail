package kibamail

import (
	"context"
	"net/http"
)

// CreateFormRequest is the request object for the Create call.
type CreateFormRequest struct {
	Name         string                 `json:"name"`
	Description  string                 `json:"description,omitempty"`
	Type         string                 `json:"type,omitempty"`
	FieldMapping map[string]interface{} `json:"fieldMapping"`
}

// UpdateFormRequest is the request object for the Update call.
type UpdateFormRequest struct {
	Name               string                 `json:"name,omitempty"`
	Description        string                 `json:"description,omitempty"`
	FieldMapping       map[string]interface{} `json:"fieldMapping,omitempty"`
	Settings           map[string]interface{} `json:"settings,omitempty"`
	SeoTitle           *string                `json:"seoTitle,omitempty"`
	SeoDescription     *string                `json:"seoDescription,omitempty"`
	SeoImageUrl        *string                `json:"seoImageUrl,omitempty"`
	SeoFaviconUrl      *string                `json:"seoFaviconUrl,omitempty"`
	Slug               *string                `json:"slug,omitempty"`
	DoubleOptInEmailId *string                `json:"doubleOptInEmailId,omitempty"`
}

// Form provides the structure for a form object.
type Form struct {
	Object         string                 `json:"object"`
	ID             string                 `json:"id"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description"`
	Status         string                 `json:"status"`
	HTML           string                 `json:"html"`
	DeployId       string                 `json:"deployId"`
	DeployedFiles  []DeployedFile         `json:"deployedFiles"`
	FieldMapping   map[string]interface{} `json:"fieldMapping"`
	Settings       map[string]interface{} `json:"settings"`
	SeoTitle       string                 `json:"seoTitle"`
	SeoDescription string                 `json:"seoDescription"`
	SeoImageUrl    string                 `json:"seoImageUrl"`
	SeoFaviconUrl  string                 `json:"seoFaviconUrl"`
	Slug           string                 `json:"slug"`
	CreatedAt      string                 `json:"createdAt"`
	UpdatedAt      string                 `json:"updatedAt"`
}

// FormResponse is the response from the Create/Update/Publish call.
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

// CreateFormVersionRequest is the request for creating a new version.
type CreateFormVersionRequest struct {
	Name         string                 `json:"name,omitempty"`
	Description  string                 `json:"description,omitempty"`
	FieldMapping map[string]interface{} `json:"fieldMapping,omitempty"`
}

// FormVersion represents a form version in a list.
type FormVersion struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Display     string `json:"display"`
	Status      string `json:"status"`
	Version     int    `json:"version"`
}

// ListFormVersionsResponse is the response from ListVersions.
type ListFormVersionsResponse struct {
	Object string        `json:"object"`
	Data   []FormVersion `json:"data"`
}

// FormSubmissionResponse is the response from the Submit call.
type FormSubmissionResponse struct {
	Object string `json:"object"`
	ID     string `json:"id"`
}

// DeployFormResponse is the response from the Deploy call.
type DeployFormResponse struct {
	DeployId string         `json:"deployId"`
	Files    []DeployedFile `json:"files"`
}

// DeployedFile represents a file in a deployment.
type DeployedFile struct {
	Name string `json:"name"`
	URL  string `json:"url"`
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
	Deploy(formId string, files []FileUpload) (*DeployFormResponse, error)
	DeployWithContext(ctx context.Context, formId string, files []FileUpload) (*DeployFormResponse, error)
	Publish(formId string) (*FormResponse, error)
	PublishWithContext(ctx context.Context, formId string) (*FormResponse, error)
	CreateVersion(formId string, params *CreateFormVersionRequest) (*FormResponse, error)
	CreateVersionWithContext(ctx context.Context, formId string, params *CreateFormVersionRequest) (*FormResponse, error)
	ListVersions(formId string) (*ListFormVersionsResponse, error)
	ListVersionsWithContext(ctx context.Context, formId string) (*ListFormVersionsResponse, error)
	Submit(formId string, data map[string]interface{}) (*FormSubmissionResponse, error)
	SubmitWithContext(ctx context.Context, formId string, data map[string]interface{}) (*FormSubmissionResponse, error)
}

// FormsSvcImpl implements FormsSvc.
type FormsSvcImpl struct {
	client *Client
}

func (s *FormsSvcImpl) Create(params *CreateFormRequest) (*FormResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

func (s *FormsSvcImpl) CreateWithContext(ctx context.Context, params *CreateFormRequest) (*FormResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, "v1/forms", params)
	if err != nil {
		return nil, ErrFailedToCreateFormsCreateRequest
	}

	resp := new(FormResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) List(params *ListOptions) (*ListFormsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

func (s *FormsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListFormsResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/forms"+buildPaginationQuery(params), nil)
	if err != nil {
		return nil, ErrFailedToCreateFormsListRequest
	}

	resp := new(ListFormsResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) Get(formId string) (*Form, error) {
	return s.GetWithContext(context.Background(), formId)
}

func (s *FormsSvcImpl) GetWithContext(ctx context.Context, formId string) (*Form, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/forms/"+formId, nil)
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

func (s *FormsSvcImpl) Update(formId string, params *UpdateFormRequest) (*FormResponse, error) {
	return s.UpdateWithContext(context.Background(), formId, params)
}

func (s *FormsSvcImpl) UpdateWithContext(ctx context.Context, formId string, params *UpdateFormRequest) (*FormResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPut, "v1/forms/"+formId, params)
	if err != nil {
		return nil, ErrFailedToCreateFormsUpdateRequest
	}

	resp := new(FormResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) Delete(formId string) error {
	return s.DeleteWithContext(context.Background(), formId)
}

func (s *FormsSvcImpl) DeleteWithContext(ctx context.Context, formId string) error {
	req, err := s.client.NewRequest(ctx, http.MethodDelete, "v1/forms/"+formId, nil)
	if err != nil {
		return ErrFailedToCreateFormsDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	return err
}

func (s *FormsSvcImpl) Deploy(formId string, files []FileUpload) (*DeployFormResponse, error) {
	return s.DeployWithContext(context.Background(), formId, files)
}

func (s *FormsSvcImpl) DeployWithContext(ctx context.Context, formId string, files []FileUpload) (*DeployFormResponse, error) {
	req, err := s.client.NewMultipartRequest(ctx, http.MethodPost, "v1/forms/"+formId+"/deploy", "files", files)
	if err != nil {
		return nil, ErrFailedToCreateFormsDeployRequest
	}

	resp := new(DeployFormResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) Publish(formId string) (*FormResponse, error) {
	return s.PublishWithContext(context.Background(), formId)
}

func (s *FormsSvcImpl) PublishWithContext(ctx context.Context, formId string) (*FormResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, "v1/forms/"+formId+"/publish", nil)
	if err != nil {
		return nil, ErrFailedToCreateFormsPublishRequest
	}

	resp := new(FormResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) CreateVersion(formId string, params *CreateFormVersionRequest) (*FormResponse, error) {
	return s.CreateVersionWithContext(context.Background(), formId, params)
}

func (s *FormsSvcImpl) CreateVersionWithContext(ctx context.Context, formId string, params *CreateFormVersionRequest) (*FormResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, "v1/forms/"+formId+"/versions", params)
	if err != nil {
		return nil, ErrFailedToCreateFormsCreateVersionRequest
	}

	resp := new(FormResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) ListVersions(formId string) (*ListFormVersionsResponse, error) {
	return s.ListVersionsWithContext(context.Background(), formId)
}

func (s *FormsSvcImpl) ListVersionsWithContext(ctx context.Context, formId string) (*ListFormVersionsResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/forms/"+formId+"/versions", nil)
	if err != nil {
		return nil, ErrFailedToCreateFormsListVersionsRequest
	}

	resp := new(ListFormVersionsResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *FormsSvcImpl) Submit(formId string, data map[string]interface{}) (*FormSubmissionResponse, error) {
	return s.SubmitWithContext(context.Background(), formId, data)
}

func (s *FormsSvcImpl) SubmitWithContext(ctx context.Context, formId string, data map[string]interface{}) (*FormSubmissionResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, "v1/forms/"+formId+"/submissions", data)
	if err != nil {
		return nil, ErrFailedToCreateFormsSubmitRequest
	}

	resp := new(FormSubmissionResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}
