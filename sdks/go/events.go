package kibamail

import (
	"context"
	"net/http"
)

// CreateEventRequest is the request object for the Create call.
type CreateEventRequest struct {
	EventName  string                 `json:"eventName"`
	ContactId  string                 `json:"contactId"`
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// CreateEventResponse is the response from the Create call.
type CreateEventResponse struct {
	Object    string `json:"object"`
	EventName string `json:"eventName"`
	ContactId string `json:"contactId"`
}

// EventsSvc provides an interface for firing custom events.
type EventsSvc interface {
	Create(params *CreateEventRequest) (*CreateEventResponse, error)
	CreateWithContext(ctx context.Context, params *CreateEventRequest) (*CreateEventResponse, error)
}

// EventsSvcImpl implements EventsSvc.
type EventsSvcImpl struct {
	client *Client
}

// Create fires a custom event to trigger automations.
func (s *EventsSvcImpl) Create(params *CreateEventRequest) (*CreateEventResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext fires a custom event to trigger automations.
func (s *EventsSvcImpl) CreateWithContext(ctx context.Context, params *CreateEventRequest) (*CreateEventResponse, error) {
	path := "v1/events"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateEventsCreateRequest
	}

	// Build response recipient obj
	createEventResponse := new(CreateEventResponse)

	// Send Request
	_, err = s.client.Perform(req, createEventResponse)

	if err != nil {
		return nil, err
	}

	return createEventResponse, nil
}
