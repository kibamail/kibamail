package kibamail

import (
	"context"
	"net/http"
)

// CreateApiKeyRequest is the request object for the Create call.
type CreateApiKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes,omitempty"`
}

// ApiKey provides the structure for an API key object.
type ApiKey struct {
	Object    string   `json:"object"`
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Key       string   `json:"key,omitempty"`
	Scopes    []string `json:"scopes"`
	CreatedAt string   `json:"createdAt"`
	UpdatedAt string   `json:"updatedAt"`
}

// ApiKeyResponse is the response from the Create call.
type ApiKeyResponse struct {
	ID  string `json:"id"`
	Key string `json:"key"`
}

// ListApiKeysResponse is the response from the List call.
type ListApiKeysResponse struct {
	Object      string   `json:"object"`
	Data        []ApiKey `json:"data"`
	HasMore     bool     `json:"hasMore"`
	HasPrevious bool     `json:"hasPrevious"`
}

// ApiKeysSvc provides an interface for managing API keys.
type ApiKeysSvc interface {
	Create(params *CreateApiKeyRequest) (*ApiKeyResponse, error)
	CreateWithContext(ctx context.Context, params *CreateApiKeyRequest) (*ApiKeyResponse, error)
	List(params *ListOptions) (*ListApiKeysResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListApiKeysResponse, error)
	Delete(apiKeyId string) error
	DeleteWithContext(ctx context.Context, apiKeyId string) error
}

// ApiKeysSvcImpl implements ApiKeysSvc.
type ApiKeysSvcImpl struct {
	client *Client
}

// Create creates a new API key in your workspace.
func (s *ApiKeysSvcImpl) Create(params *CreateApiKeyRequest) (*ApiKeyResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new API key in your workspace.
func (s *ApiKeysSvcImpl) CreateWithContext(ctx context.Context, params *CreateApiKeyRequest) (*ApiKeyResponse, error) {
	path := "v1/api-keys"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateApiKeysCreateRequest
	}

	apiKeyResponse := new(ApiKeyResponse)
	_, err = s.client.Perform(req, apiKeyResponse)
	if err != nil {
		return nil, err
	}

	return apiKeyResponse, nil
}

// List retrieves a paginated list of all API keys in your workspace.
func (s *ApiKeysSvcImpl) List(params *ListOptions) (*ListApiKeysResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all API keys in your workspace.
func (s *ApiKeysSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListApiKeysResponse, error) {
	path := "v1/api-keys" + buildPaginationQuery(params)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateApiKeysListRequest
	}

	listApiKeysResponse := new(ListApiKeysResponse)
	_, err = s.client.Perform(req, listApiKeysResponse)
	if err != nil {
		return nil, err
	}

	return listApiKeysResponse, nil
}

// Delete deletes an API key by ID.
func (s *ApiKeysSvcImpl) Delete(apiKeyId string) error {
	return s.DeleteWithContext(context.Background(), apiKeyId)
}

// DeleteWithContext deletes an API key by ID.
func (s *ApiKeysSvcImpl) DeleteWithContext(ctx context.Context, apiKeyId string) error {
	path := "v1/api-keys/" + apiKeyId

	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateApiKeysDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	if err != nil {
		return err
	}

	return nil
}
