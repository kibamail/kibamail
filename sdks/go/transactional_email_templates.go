package kibamail

import (
	"context"
	"net/http"
)

// CreateTransactionalEmailTemplateRequest is the request object for creating
// a transactional email template from raw HTML.
//
// `Publish` defaults to true on the server side — set it to a pointer to
// false via Publish(false) if you want to create a DRAFT instead.
type CreateTransactionalEmailTemplateRequest struct {
	Name              string               `json:"name"`
	Description       string               `json:"description,omitempty"`
	UniqueSlug        string               `json:"uniqueSlug"`
	Subject           string               `json:"subject"`
	PreviewText       string               `json:"previewText,omitempty"`
	Html              string               `json:"html"`
	SenderIdentityId  string               `json:"senderIdentityId,omitempty"`
	ReplyToIdentityId string               `json:"replyToIdentityId,omitempty"`
	TrackClicks       *bool                `json:"trackClicks,omitempty"`
	TrackOpens        *bool                `json:"trackOpens,omitempty"`
	Variables         []VariableDefinition `json:"variables,omitempty"`
	Publish           *bool                `json:"publish,omitempty"`
}

// UpdateTransactionalEmailTemplateRequest is the request object for
// editing a DRAFT transactional email template.
type UpdateTransactionalEmailTemplateRequest struct {
	Name              string               `json:"name,omitempty"`
	Description       *string              `json:"description,omitempty"`
	UniqueSlug        string               `json:"uniqueSlug,omitempty"`
	Subject           string               `json:"subject,omitempty"`
	PreviewText       *string              `json:"previewText,omitempty"`
	Html              string               `json:"html,omitempty"`
	SenderIdentityId  *string              `json:"senderIdentityId,omitempty"`
	ReplyToIdentityId *string              `json:"replyToIdentityId,omitempty"`
	TrackClicks       *bool                `json:"trackClicks,omitempty"`
	TrackOpens        *bool                `json:"trackOpens,omitempty"`
	Variables         []VariableDefinition `json:"variables,omitempty"`
}

// VariableDefinition describes a typed variable used by a template.
type VariableDefinition struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // "text" or "number"
}

// TransactionalEmailTemplate is the full template representation returned
// by GET /v1/transactional-email-templates/{id}.
type TransactionalEmailTemplate struct {
	Object              string               `json:"object"`
	ID                  string               `json:"id"`
	Name                string               `json:"name"`
	Description         string               `json:"description"`
	UniqueSlug          string               `json:"uniqueSlug"`
	Status              string               `json:"status"`
	Version             int                  `json:"version"`
	ParentID            string               `json:"parentId"`
	Subject             string               `json:"subject"`
	PreviewText         string               `json:"previewText"`
	Html                string               `json:"html"`
	Text                string               `json:"text"`
	Variables           []string             `json:"variables"`
	VariableDefinitions []VariableDefinition `json:"variableDefinitions"`
	SenderIdentityId    string               `json:"senderIdentityId"`
	ReplyToIdentityId   string               `json:"replyToIdentityId"`
	TrackClicks         bool                 `json:"trackClicks"`
	TrackOpens          bool                 `json:"trackOpens"`
	PublishedAt         string               `json:"publishedAt"`
	CreatedAt           string               `json:"createdAt"`
	UpdatedAt           string               `json:"updatedAt"`
}

// TransactionalEmailTemplateListItem is a compact row in list responses.
type TransactionalEmailTemplateListItem = TransactionalEmailTemplate

// ListTransactionalEmailTemplatesResponse is the response from List.
type ListTransactionalEmailTemplatesResponse struct {
	Object      string                               `json:"object"`
	Data        []TransactionalEmailTemplateListItem `json:"data"`
	HasMore     bool                                 `json:"hasMore"`
	HasPrevious bool                                 `json:"hasPrevious"`
}

// TransactionalEmailTemplateResponse is the minimal response returned from
// write operations (create / update / publish / delete).
type TransactionalEmailTemplateResponse struct {
	Object     string `json:"object"`
	ID         string `json:"id"`
	UniqueSlug string `json:"uniqueSlug,omitempty"`
	Status     string `json:"status,omitempty"`
}

// TransactionalEmailTemplatePreview is the response from Preview.
type TransactionalEmailTemplatePreview struct {
	Object     string `json:"object"`
	Html       string `json:"html"`
	HasContent bool   `json:"hasContent"`
}

// TransactionalEmailTemplateVersion is a single row returned by the
// versions list endpoint.
type TransactionalEmailTemplateVersion struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Version     int    `json:"version"`
	Status      string `json:"status"`
	IsLive      bool   `json:"isLive"`
	PublishedAt string `json:"publishedAt"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// ListTransactionalEmailTemplateVersionsResponse is the response from
// the versions list endpoint.
type ListTransactionalEmailTemplateVersionsResponse struct {
	Object      string                              `json:"object"`
	Data        []TransactionalEmailTemplateVersion `json:"data"`
	HasMore     bool                                `json:"hasMore"`
	HasPrevious bool                                `json:"hasPrevious"`
}

// TransactionalEmailTemplatesSvc provides access to the
// /v1/transactional-email-templates resource.
type TransactionalEmailTemplatesSvc interface {
	Create(params *CreateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error)
	CreateWithContext(ctx context.Context, params *CreateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error)

	List(params *ListOptions) (*ListTransactionalEmailTemplatesResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListTransactionalEmailTemplatesResponse, error)

	Get(templateId string) (*TransactionalEmailTemplate, error)
	GetWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplate, error)

	Update(templateId string, params *UpdateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error)
	UpdateWithContext(ctx context.Context, templateId string, params *UpdateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error)

	Delete(templateId string) error
	DeleteWithContext(ctx context.Context, templateId string) error

	Publish(templateId string) (*TransactionalEmailTemplateResponse, error)
	PublishWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplateResponse, error)

	Preview(templateId string) (*TransactionalEmailTemplatePreview, error)
	PreviewWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplatePreview, error)

	CreateVersion(templateId string) (*TransactionalEmailTemplateResponse, error)
	CreateVersionWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplateResponse, error)

	ListVersions(templateId string) (*ListTransactionalEmailTemplateVersionsResponse, error)
	ListVersionsWithContext(ctx context.Context, templateId string) (*ListTransactionalEmailTemplateVersionsResponse, error)
}

// TransactionalEmailTemplatesSvcImpl is the concrete implementation.
type TransactionalEmailTemplatesSvcImpl struct {
	client *Client
}

const transactionalEmailTemplatesPath = "v1/transactional-email-templates"

func (s *TransactionalEmailTemplatesSvcImpl) Create(params *CreateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

func (s *TransactionalEmailTemplatesSvcImpl) CreateWithContext(ctx context.Context, params *CreateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, transactionalEmailTemplatesPath, params)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesCreateRequest
	}
	resp := new(TransactionalEmailTemplateResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) List(params *ListOptions) (*ListTransactionalEmailTemplatesResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

func (s *TransactionalEmailTemplatesSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListTransactionalEmailTemplatesResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, transactionalEmailTemplatesPath+buildPaginationQuery(params), nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesListRequest
	}
	resp := new(ListTransactionalEmailTemplatesResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) Get(templateId string) (*TransactionalEmailTemplate, error) {
	return s.GetWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) GetWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplate, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, transactionalEmailTemplatesPath+"/"+templateId, nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesGetRequest
	}
	template := new(TransactionalEmailTemplate)
	if _, err := s.client.Perform(req, template); err != nil {
		return nil, err
	}
	return template, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) Update(templateId string, params *UpdateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error) {
	return s.UpdateWithContext(context.Background(), templateId, params)
}

func (s *TransactionalEmailTemplatesSvcImpl) UpdateWithContext(ctx context.Context, templateId string, params *UpdateTransactionalEmailTemplateRequest) (*TransactionalEmailTemplateResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPut, transactionalEmailTemplatesPath+"/"+templateId, params)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesUpdateRequest
	}
	resp := new(TransactionalEmailTemplateResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) Delete(templateId string) error {
	return s.DeleteWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) DeleteWithContext(ctx context.Context, templateId string) error {
	req, err := s.client.NewRequest(ctx, http.MethodDelete, transactionalEmailTemplatesPath+"/"+templateId, nil)
	if err != nil {
		return ErrFailedToCreateTransactionalEmailTemplatesDeleteRequest
	}
	_, err = s.client.Perform(req, nil)
	return err
}

func (s *TransactionalEmailTemplatesSvcImpl) Publish(templateId string) (*TransactionalEmailTemplateResponse, error) {
	return s.PublishWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) PublishWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplateResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, transactionalEmailTemplatesPath+"/"+templateId+"/publish", nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesPublishRequest
	}
	resp := new(TransactionalEmailTemplateResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) Preview(templateId string) (*TransactionalEmailTemplatePreview, error) {
	return s.PreviewWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) PreviewWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplatePreview, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, transactionalEmailTemplatesPath+"/"+templateId+"/preview", nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesPreviewRequest
	}
	preview := new(TransactionalEmailTemplatePreview)
	if _, err := s.client.Perform(req, preview); err != nil {
		return nil, err
	}
	return preview, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) CreateVersion(templateId string) (*TransactionalEmailTemplateResponse, error) {
	return s.CreateVersionWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) CreateVersionWithContext(ctx context.Context, templateId string) (*TransactionalEmailTemplateResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, transactionalEmailTemplatesPath+"/"+templateId+"/versions", nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesCreateVersionRequest
	}
	resp := new(TransactionalEmailTemplateResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *TransactionalEmailTemplatesSvcImpl) ListVersions(templateId string) (*ListTransactionalEmailTemplateVersionsResponse, error) {
	return s.ListVersionsWithContext(context.Background(), templateId)
}

func (s *TransactionalEmailTemplatesSvcImpl) ListVersionsWithContext(ctx context.Context, templateId string) (*ListTransactionalEmailTemplateVersionsResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, transactionalEmailTemplatesPath+"/"+templateId+"/versions", nil)
	if err != nil {
		return nil, ErrFailedToCreateTransactionalEmailTemplatesListVersionsRequest
	}
	resp := new(ListTransactionalEmailTemplateVersionsResponse)
	if _, err := s.client.Perform(req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// BoolPtr returns a pointer to b — helpful for the optional *bool fields
// in the request structs (e.g. Publish, TrackClicks, TrackOpens).
func BoolPtr(b bool) *bool { return &b }
