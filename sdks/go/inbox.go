package kibamail

import (
	"context"
	"net/http"
)

// Conversation provides the structure for a conversation object.
type Conversation struct {
	Object    string                 `json:"object"`
	ID        string                 `json:"id"`
	Subject   string                 `json:"subject"`
	Status    string                 `json:"status"`
	From      string                 `json:"from"`
	To        string                 `json:"to"`
	Preview   string                 `json:"preview"`
	Messages  []ConversationMessage  `json:"messages"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt string                 `json:"createdAt"`
	UpdatedAt string                 `json:"updatedAt"`
}

// ConversationMessage represents a message within a conversation.
type ConversationMessage struct {
	ID        string                 `json:"id"`
	From      string                 `json:"from"`
	To        string                 `json:"to"`
	Subject   string                 `json:"subject"`
	Body      string                 `json:"body"`
	Direction string                 `json:"direction"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt string                 `json:"createdAt"`
}

// UpdateConversationRequest is the request object for the UpdateConversation call.
type UpdateConversationRequest struct {
	Status   string                 `json:"status,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ReplyRequest is the request object for the Reply call.
type ReplyRequest struct {
	Body    string                 `json:"body"`
	From    string                 `json:"from,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ConversationListResponse is the response from the ListConversations call.
type ConversationListResponse struct {
	Object      string         `json:"object"`
	Data        []Conversation `json:"data"`
	HasMore     bool           `json:"hasMore"`
	HasPrevious bool           `json:"hasPrevious"`
}

// ConversationUpdateResponse is the response from the UpdateConversation call.
type ConversationUpdateResponse struct {
	ID string `json:"id"`
}

// ReplyResponse is the response from the Reply call.
type ReplyResponse struct {
	ID string `json:"id"`
}

// InboxStatsResponse is the response from the Stats call.
type InboxStatsResponse struct {
	Object string                 `json:"object"`
	Stats  map[string]interface{} `json:"stats"`
}

// InboxSvc provides an interface for managing inbox conversations.
type InboxSvc interface {
	ListConversations(opts *ListOptions) (*ConversationListResponse, error)
	ListConversationsWithContext(ctx context.Context, opts *ListOptions) (*ConversationListResponse, error)
	GetConversation(conversationId string) (*Conversation, error)
	GetConversationWithContext(ctx context.Context, conversationId string) (*Conversation, error)
	UpdateConversation(conversationId string, params *UpdateConversationRequest) (*ConversationUpdateResponse, error)
	UpdateConversationWithContext(ctx context.Context, conversationId string, params *UpdateConversationRequest) (*ConversationUpdateResponse, error)
	Reply(conversationId string, params *ReplyRequest) (*ReplyResponse, error)
	ReplyWithContext(ctx context.Context, conversationId string, params *ReplyRequest) (*ReplyResponse, error)
	Stats() (*InboxStatsResponse, error)
	StatsWithContext(ctx context.Context) (*InboxStatsResponse, error)
}

// InboxSvcImpl implements InboxSvc.
type InboxSvcImpl struct {
	client *Client
}

// ListConversations retrieves a paginated list of inbox conversations.
func (s *InboxSvcImpl) ListConversations(opts *ListOptions) (*ConversationListResponse, error) {
	return s.ListConversationsWithContext(context.Background(), opts)
}

// ListConversationsWithContext retrieves a paginated list of inbox conversations.
func (s *InboxSvcImpl) ListConversationsWithContext(ctx context.Context, opts *ListOptions) (*ConversationListResponse, error) {
	path := "v1/inbox/conversations" + buildPaginationQuery(opts)

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateInboxListConversationsRequest
	}

	listResponse := new(ConversationListResponse)
	_, err = s.client.Perform(req, listResponse)
	if err != nil {
		return nil, err
	}

	return listResponse, nil
}

// GetConversation retrieves a specific conversation by ID.
func (s *InboxSvcImpl) GetConversation(conversationId string) (*Conversation, error) {
	return s.GetConversationWithContext(context.Background(), conversationId)
}

// GetConversationWithContext retrieves a specific conversation by ID.
func (s *InboxSvcImpl) GetConversationWithContext(ctx context.Context, conversationId string) (*Conversation, error) {
	path := "v1/inbox/conversations/" + conversationId

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateInboxGetConversationRequest
	}

	conversation := new(Conversation)
	_, err = s.client.Perform(req, conversation)
	if err != nil {
		return nil, err
	}

	return conversation, nil
}

// UpdateConversation updates a conversation by ID.
func (s *InboxSvcImpl) UpdateConversation(conversationId string, params *UpdateConversationRequest) (*ConversationUpdateResponse, error) {
	return s.UpdateConversationWithContext(context.Background(), conversationId, params)
}

// UpdateConversationWithContext updates a conversation by ID.
func (s *InboxSvcImpl) UpdateConversationWithContext(ctx context.Context, conversationId string, params *UpdateConversationRequest) (*ConversationUpdateResponse, error) {
	path := "v1/inbox/conversations/" + conversationId

	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateInboxUpdateConversationRequest
	}

	resp := new(ConversationUpdateResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// Reply sends a reply to a conversation.
func (s *InboxSvcImpl) Reply(conversationId string, params *ReplyRequest) (*ReplyResponse, error) {
	return s.ReplyWithContext(context.Background(), conversationId, params)
}

// ReplyWithContext sends a reply to a conversation.
func (s *InboxSvcImpl) ReplyWithContext(ctx context.Context, conversationId string, params *ReplyRequest) (*ReplyResponse, error) {
	path := "v1/inbox/conversations/" + conversationId + "/reply"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateInboxReplyRequest
	}

	resp := new(ReplyResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// Stats retrieves inbox statistics.
func (s *InboxSvcImpl) Stats() (*InboxStatsResponse, error) {
	return s.StatsWithContext(context.Background())
}

// StatsWithContext retrieves inbox statistics.
func (s *InboxSvcImpl) StatsWithContext(ctx context.Context) (*InboxStatsResponse, error) {
	path := "v1/inbox/stats"

	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateInboxStatsRequest
	}

	resp := new(InboxStatsResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}
