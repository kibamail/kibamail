package kibamail

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

// AutomationTriggerConfig represents the configuration for an automation trigger.
type AutomationTriggerConfig struct {
	SegmentId           string `json:"segmentId,omitempty"`
	EventName           string `json:"eventName,omitempty"`
	PropertyName        string `json:"propertyName,omitempty"`
	FormId              string `json:"formId,omitempty"`
	EmailEngagementType string `json:"emailEngagementType,omitempty"`
}

// AutomationTrigger represents the trigger configuration for an automation.
type AutomationTrigger struct {
	Type   string                   `json:"type"`
	Config *AutomationTriggerConfig `json:"config,omitempty"`
}

// AutomationTriggerResponse represents the trigger in a response.
type AutomationTriggerResponse struct {
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}

// AutomationNodePosition represents the position of a node in the workflow editor.
type AutomationNodePosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// AutomationNode represents a node in the automation workflow.
type AutomationNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Position AutomationNodePosition `json:"position"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

// AutomationEdge represents a connection between nodes in the automation workflow.
type AutomationEdge struct {
	ID           string                 `json:"id"`
	Source       string                 `json:"source"`
	Target       string                 `json:"target"`
	SourceHandle string                 `json:"sourceHandle,omitempty"`
	TargetHandle string                 `json:"targetHandle,omitempty"`
	Type         string                 `json:"type,omitempty"`
	Animated     bool                   `json:"animated,omitempty"`
	Data         map[string]interface{} `json:"data,omitempty"`
}

// CreateAutomationRequest is the request object for the Create call.
type CreateAutomationRequest struct {
	Name        string             `json:"name"`
	Description string             `json:"description,omitempty"`
	Trigger     *AutomationTrigger `json:"trigger,omitempty"`
	Nodes       []AutomationNode   `json:"nodes,omitempty"`
	Edges       []AutomationEdge   `json:"edges,omitempty"`
}

// UpdateAutomationRequest is the request object for the Update call.
type UpdateAutomationRequest struct {
	Name        string             `json:"name,omitempty"`
	Description string             `json:"description,omitempty"`
	Trigger     *AutomationTrigger `json:"trigger,omitempty"`
	Nodes       []AutomationNode   `json:"nodes,omitempty"`
	Edges       []AutomationEdge   `json:"edges,omitempty"`
}

// TriggerAutomationRequest is the request object for the Trigger call.
type TriggerAutomationRequest struct {
	ContactId string                 `json:"contactId"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Automation provides the structure for an automation object.
type Automation struct {
	Object      string                    `json:"object"`
	ID          string                    `json:"id"`
	Name        string                    `json:"name"`
	Description string                    `json:"description"`
	Status      string                    `json:"status"`
	Version     float64                   `json:"version"`
	ParentId    string                    `json:"parentId"`
	Trigger     AutomationTriggerResponse `json:"trigger"`
	Nodes       []interface{}             `json:"nodes"`
	Edges       []interface{}             `json:"edges"`
	Stats       map[string]interface{}    `json:"stats"`
	PublishedAt string                    `json:"publishedAt"`
	CreatedAt   string                    `json:"createdAt"`
	UpdatedAt   string                    `json:"updatedAt"`
}

// SimulateAutomationRequest is the request for the Simulate call.
// Provide either ContactId (real contact) or Contact (virtual), not both.
type SimulateAutomationRequest struct {
	ContactId string                  `json:"contactId,omitempty"`
	Contact   *VirtualContact         `json:"contact,omitempty"`
	Seed      *int                    `json:"seed,omitempty"`
}

// VirtualContact is an inline contact definition for simulation without a real contact record.
type VirtualContact struct {
	Email      string                 `json:"email"`
	FirstName  string                 `json:"firstName,omitempty"`
	LastName   string                 `json:"lastName,omitempty"`
	Phone      string                 `json:"phone,omitempty"`
	Country    string                 `json:"country,omitempty"`
	Timezone   string                 `json:"timezone,omitempty"`
	City       string                 `json:"city,omitempty"`
	Status     string                 `json:"status,omitempty"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	Topics     []string               `json:"topics,omitempty"`
}

// SimulationStep represents a single step in the simulation trace.
type SimulationStep struct {
	Step     int    `json:"step"`
	NodeId   string `json:"nodeId"`
	NodeType string `json:"nodeType"`
	NodeName string `json:"nodeName"`
	Action   string `json:"action"`
	Detail   string `json:"detail"`
	Branch   string `json:"branch,omitempty"`
}

// AutomationSimulationResponse is the response from the Simulate call.
type AutomationSimulationResponse struct {
	Object         string           `json:"object"`
	AutomationId   string           `json:"automationId"`
	AutomationName string           `json:"automationName"`
	ContactId      string           `json:"contactId"`
	ContactEmail   string           `json:"contactEmail"`
	Status         string           `json:"status"`
	ErrorMessage   string           `json:"errorMessage,omitempty"`
	TotalSteps     int              `json:"totalSteps"`
	Steps          []SimulationStep `json:"steps"`
}

// ListAutomationsOptions contains query parameters for the List automations call.
type ListAutomationsOptions struct {
	Limit  *int    `json:"limit,omitempty"`
	After  *string `json:"after,omitempty"`
	Before *string `json:"before,omitempty"`
	Status *string `json:"status,omitempty"`
}

// ListAutomationsResponse is the response from the List call.
type ListAutomationsResponse struct {
	Object      string       `json:"object"`
	HasMore     bool         `json:"hasMore"`
	HasPrevious bool         `json:"hasPrevious"`
	Data        []Automation `json:"data"`
}

// AutomationsSvc provides an interface for managing automations.
type AutomationsSvc interface {
	Create(params *CreateAutomationRequest) (*Automation, error)
	CreateWithContext(ctx context.Context, params *CreateAutomationRequest) (*Automation, error)
	List(params *ListAutomationsOptions) (*ListAutomationsResponse, error)
	ListWithContext(ctx context.Context, params *ListAutomationsOptions) (*ListAutomationsResponse, error)
	Get(automationId string) (*Automation, error)
	GetWithContext(ctx context.Context, automationId string) (*Automation, error)
	Update(automationId string, params *UpdateAutomationRequest) (*Automation, error)
	UpdateWithContext(ctx context.Context, automationId string, params *UpdateAutomationRequest) (*Automation, error)
	Delete(automationId string) error
	DeleteWithContext(ctx context.Context, automationId string) error
	Publish(automationId string) (*Automation, error)
	PublishWithContext(ctx context.Context, automationId string) (*Automation, error)
	Archive(automationId string) (*Automation, error)
	ArchiveWithContext(ctx context.Context, automationId string) (*Automation, error)
	Trigger(automationId string, params *TriggerAutomationRequest) (*Automation, error)
	TriggerWithContext(ctx context.Context, automationId string, params *TriggerAutomationRequest) (*Automation, error)
	Simulate(automationId string, params *SimulateAutomationRequest) (*AutomationSimulationResponse, error)
	SimulateWithContext(ctx context.Context, automationId string, params *SimulateAutomationRequest) (*AutomationSimulationResponse, error)
}

// AutomationsSvcImpl implements AutomationsSvc.
type AutomationsSvcImpl struct {
	client *Client
}

// buildAutomationsListQuery constructs query parameters for the automations list endpoint.
func buildAutomationsListQuery(options *ListAutomationsOptions) string {
	if options == nil {
		return ""
	}

	query := make(url.Values)
	if options.Limit != nil {
		query.Set("limit", fmt.Sprintf("%d", *options.Limit))
	}
	if options.After != nil {
		query.Set("after", *options.After)
	}
	if options.Before != nil {
		query.Set("before", *options.Before)
	}
	if options.Status != nil {
		query.Set("status", *options.Status)
	}

	if len(query) > 0 {
		return "?" + query.Encode()
	}
	return ""
}

// Create creates a new automation in your workspace.
func (s *AutomationsSvcImpl) Create(params *CreateAutomationRequest) (*Automation, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext creates a new automation in your workspace.
func (s *AutomationsSvcImpl) CreateWithContext(ctx context.Context, params *CreateAutomationRequest) (*Automation, error) {
	path := "v1/automations"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsCreateRequest
	}

	// Build response recipient obj
	automation := new(Automation)

	// Send Request
	_, err = s.client.Perform(req, automation)

	if err != nil {
		return nil, err
	}

	return automation, nil
}

// List retrieves a paginated list of all automations in your workspace.
func (s *AutomationsSvcImpl) List(params *ListAutomationsOptions) (*ListAutomationsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all automations in your workspace.
func (s *AutomationsSvcImpl) ListWithContext(ctx context.Context, params *ListAutomationsOptions) (*ListAutomationsResponse, error) {
	path := "v1/automations" + buildAutomationsListQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsListRequest
	}

	// Build response recipient obj
	listAutomationsResponse := new(ListAutomationsResponse)

	// Send Request
	_, err = s.client.Perform(req, listAutomationsResponse)

	if err != nil {
		return nil, err
	}

	return listAutomationsResponse, nil
}

// Get retrieves a specific automation by ID.
func (s *AutomationsSvcImpl) Get(automationId string) (*Automation, error) {
	return s.GetWithContext(context.Background(), automationId)
}

// GetWithContext retrieves a specific automation by ID.
func (s *AutomationsSvcImpl) GetWithContext(ctx context.Context, automationId string) (*Automation, error) {
	path := "v1/automations/" + automationId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsGetRequest
	}

	// Build response recipient obj
	automation := new(Automation)

	// Send Request
	_, err = s.client.Perform(req, automation)

	if err != nil {
		return nil, err
	}

	return automation, nil
}

// Update updates an existing automation by ID.
func (s *AutomationsSvcImpl) Update(automationId string, params *UpdateAutomationRequest) (*Automation, error) {
	return s.UpdateWithContext(context.Background(), automationId, params)
}

// UpdateWithContext updates an existing automation by ID.
func (s *AutomationsSvcImpl) UpdateWithContext(ctx context.Context, automationId string, params *UpdateAutomationRequest) (*Automation, error) {
	path := "v1/automations/" + automationId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsUpdateRequest
	}

	// Build response recipient obj
	automation := new(Automation)

	// Send Request
	_, err = s.client.Perform(req, automation)

	if err != nil {
		return nil, err
	}

	return automation, nil
}

// Delete deletes an automation by ID.
func (s *AutomationsSvcImpl) Delete(automationId string) error {
	return s.DeleteWithContext(context.Background(), automationId)
}

// DeleteWithContext deletes an automation by ID.
func (s *AutomationsSvcImpl) DeleteWithContext(ctx context.Context, automationId string) error {
	path := "v1/automations/" + automationId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateAutomationsDeleteRequest
	}

	// Send Request
	_, err = s.client.Perform(req, nil)

	if err != nil {
		return err
	}

	return nil
}

// Publish publishes an automation to make it active.
func (s *AutomationsSvcImpl) Publish(automationId string) (*Automation, error) {
	return s.PublishWithContext(context.Background(), automationId)
}

// PublishWithContext publishes an automation to make it active.
func (s *AutomationsSvcImpl) PublishWithContext(ctx context.Context, automationId string) (*Automation, error) {
	path := "v1/automations/" + automationId + "/publish"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsPublishRequest
	}

	// Build response recipient obj
	automation := new(Automation)

	// Send Request
	_, err = s.client.Perform(req, automation)

	if err != nil {
		return nil, err
	}

	return automation, nil
}

// Archive archives a published automation.
func (s *AutomationsSvcImpl) Archive(automationId string) (*Automation, error) {
	return s.ArchiveWithContext(context.Background(), automationId)
}

// ArchiveWithContext archives a published automation.
func (s *AutomationsSvcImpl) ArchiveWithContext(ctx context.Context, automationId string) (*Automation, error) {
	path := "v1/automations/" + automationId + "/archive"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsArchiveRequest
	}

	// Build response recipient obj
	automation := new(Automation)

	// Send Request
	_, err = s.client.Perform(req, automation)

	if err != nil {
		return nil, err
	}

	return automation, nil
}

// Trigger manually triggers an automation for a contact.
func (s *AutomationsSvcImpl) Trigger(automationId string, params *TriggerAutomationRequest) (*Automation, error) {
	return s.TriggerWithContext(context.Background(), automationId, params)
}

// TriggerWithContext manually triggers an automation for a contact.
func (s *AutomationsSvcImpl) TriggerWithContext(ctx context.Context, automationId string, params *TriggerAutomationRequest) (*Automation, error) {
	path := "v1/automations/" + automationId + "/trigger"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsTriggerRequest
	}

	automation := new(Automation)
	_, err = s.client.Perform(req, automation)
	if err != nil {
		return nil, err
	}

	return automation, nil
}

// Simulate performs a dry-run of an automation for a contact without executing side effects.
func (s *AutomationsSvcImpl) Simulate(automationId string, params *SimulateAutomationRequest) (*AutomationSimulationResponse, error) {
	return s.SimulateWithContext(context.Background(), automationId, params)
}

// SimulateWithContext performs a dry-run of an automation for a contact.
func (s *AutomationsSvcImpl) SimulateWithContext(ctx context.Context, automationId string, params *SimulateAutomationRequest) (*AutomationSimulationResponse, error) {
	path := "v1/automations/" + automationId + "/simulate"

	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateAutomationsSimulateRequest
	}

	result := new(AutomationSimulationResponse)
	_, err = s.client.Perform(req, result)
	if err != nil {
		return nil, err
	}

	return result, nil
}
