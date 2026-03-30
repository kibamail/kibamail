package kibamail

import (
	"context"
	"net/http"
)

// CreateMarketingEmailRequest is the request object for the Create call.
type CreateMarketingEmailRequest struct {
	Name              string `json:"name"`
	Subject           string `json:"subject,omitempty"`
	PreviewText       string `json:"previewText,omitempty"`
	Html              string `json:"html,omitempty"`
	SenderIdentityId  string `json:"senderIdentityId,omitempty"`
	ReplyToIdentityId string `json:"replyToIdentityId,omitempty"`
	TrackClicks       *bool  `json:"trackClicks,omitempty"`
	TrackOpens        *bool  `json:"trackOpens,omitempty"`
	Type              string `json:"type,omitempty"`
}

// UpdateMarketingEmailRequest is the request object for the Update call.
type UpdateMarketingEmailRequest struct {
	Name              string `json:"name,omitempty"`
	Subject           string `json:"subject,omitempty"`
	PreviewText       string `json:"previewText,omitempty"`
	Html              string `json:"html,omitempty"`
	SenderIdentityId  string `json:"senderIdentityId,omitempty"`
	ReplyToIdentityId string `json:"replyToIdentityId,omitempty"`
	TrackClicks       *bool  `json:"trackClicks,omitempty"`
	TrackOpens        *bool  `json:"trackOpens,omitempty"`
	Type              string `json:"type,omitempty"`
}

// MarketingEmail provides the structure for a marketing email object.
type MarketingEmail struct {
	Object            string   `json:"object"`
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Subject           string   `json:"subject"`
	PreviewText       string   `json:"previewText"`
	Html              string   `json:"html"`
	Variables         []string `json:"variables"`
	SenderIdentityId  string   `json:"senderIdentityId"`
	ReplyToIdentityId string   `json:"replyToIdentityId"`
	TrackClicks       bool     `json:"trackClicks"`
	TrackOpens        bool     `json:"trackOpens"`
	Type              string   `json:"type"`
	CreatedAt         string   `json:"createdAt"`
	UpdatedAt         string   `json:"updatedAt"`
}

// MarketingEmailListItem provides the structure for a marketing email in a list response.
type MarketingEmailListItem struct {
	Object            string   `json:"object"`
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Subject           string   `json:"subject"`
	PreviewText       string   `json:"previewText"`
	Html              string   `json:"html"`
	Variables         []string `json:"variables"`
	SenderIdentityId  string   `json:"senderIdentityId"`
	ReplyToIdentityId string   `json:"replyToIdentityId"`
	TrackClicks       bool     `json:"trackClicks"`
	TrackOpens        bool     `json:"trackOpens"`
	Type              string   `json:"type"`
	CreatedAt         string   `json:"createdAt"`
	UpdatedAt         string   `json:"updatedAt"`
}

// ListMarketingEmailsResponse is the response from the List call.
type ListMarketingEmailsResponse struct {
	Object      string                   `json:"object"`
	Data        []MarketingEmailListItem `json:"data"`
	HasMore     bool                     `json:"hasMore"`
	HasPrevious bool                     `json:"hasPrevious"`
}

// MarketingEmailResponse is the response from the Create/Update call.
type MarketingEmailResponse struct {
	Object string `json:"object"`
	ID     string `json:"id"`
}

// MarketingEmailPreview is the response from the Preview call.
type MarketingEmailPreview struct {
	Html       string `json:"html"`
	HasContent bool   `json:"hasContent"`
}

// MarketingEmailStatsFormRef represents a form reference in stats.
type MarketingEmailStatsFormRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// MarketingEmailStats is the response from the Stats call.
type MarketingEmailStats struct {
	Object          string                       `json:"object"`
	TotalSent       int                          `json:"totalSent"`
	TotalDelivered  int                          `json:"totalDelivered"`
	TotalOpened     int                          `json:"totalOpened"`
	TotalClicked    int                          `json:"totalClicked"`
	TotalBounced    int                          `json:"totalBounced"`
	TotalComplained int                          `json:"totalComplained"`
	OpenRate        float64                      `json:"openRate"`
	ClickRate       float64                      `json:"clickRate"`
	UsedByForms     []MarketingEmailStatsFormRef `json:"usedByForms"`
}

// MarketingEmailsSvc provides an interface for managing marketing emails.
type MarketingEmailsSvc interface {
	Create(params *CreateMarketingEmailRequest) (*MarketingEmailResponse, error)
	CreateWithContext(ctx context.Context, params *CreateMarketingEmailRequest) (*MarketingEmailResponse, error)
	List(params *ListOptions) (*ListMarketingEmailsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListMarketingEmailsResponse, error)
	Get(marketingEmailId string) (*MarketingEmail, error)
	GetWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmail, error)
	Update(marketingEmailId string, params *UpdateMarketingEmailRequest) (*MarketingEmailResponse, error)
	UpdateWithContext(ctx context.Context, marketingEmailId string, params *UpdateMarketingEmailRequest) (*MarketingEmailResponse, error)
	Delete(marketingEmailId string) error
	DeleteWithContext(ctx context.Context, marketingEmailId string) error
	Preview(marketingEmailId string) (*MarketingEmailPreview, error)
	PreviewWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmailPreview, error)
	Stats(marketingEmailId string) (*MarketingEmailStats, error)
	StatsWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmailStats, error)
}

// MarketingEmailsSvcImpl implements MarketingEmailsSvc.
type MarketingEmailsSvcImpl struct {
	client *Client
}

func (s *MarketingEmailsSvcImpl) Create(params *CreateMarketingEmailRequest) (*MarketingEmailResponse, error) {
	return s.CreateWithContext(context.Background(), params)
}

func (s *MarketingEmailsSvcImpl) CreateWithContext(ctx context.Context, params *CreateMarketingEmailRequest) (*MarketingEmailResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPost, "v1/marketing-emails", params)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsCreateRequest
	}

	resp := new(MarketingEmailResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *MarketingEmailsSvcImpl) List(params *ListOptions) (*ListMarketingEmailsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

func (s *MarketingEmailsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListMarketingEmailsResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/marketing-emails"+buildPaginationQuery(params), nil)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsListRequest
	}

	resp := new(ListMarketingEmailsResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *MarketingEmailsSvcImpl) Get(marketingEmailId string) (*MarketingEmail, error) {
	return s.GetWithContext(context.Background(), marketingEmailId)
}

func (s *MarketingEmailsSvcImpl) GetWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmail, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/marketing-emails/"+marketingEmailId, nil)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsGetRequest
	}

	marketingEmail := new(MarketingEmail)
	_, err = s.client.Perform(req, marketingEmail)
	if err != nil {
		return nil, err
	}

	return marketingEmail, nil
}

func (s *MarketingEmailsSvcImpl) Update(marketingEmailId string, params *UpdateMarketingEmailRequest) (*MarketingEmailResponse, error) {
	return s.UpdateWithContext(context.Background(), marketingEmailId, params)
}

func (s *MarketingEmailsSvcImpl) UpdateWithContext(ctx context.Context, marketingEmailId string, params *UpdateMarketingEmailRequest) (*MarketingEmailResponse, error) {
	req, err := s.client.NewRequest(ctx, http.MethodPut, "v1/marketing-emails/"+marketingEmailId, params)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsUpdateRequest
	}

	resp := new(MarketingEmailResponse)
	_, err = s.client.Perform(req, resp)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *MarketingEmailsSvcImpl) Delete(marketingEmailId string) error {
	return s.DeleteWithContext(context.Background(), marketingEmailId)
}

func (s *MarketingEmailsSvcImpl) DeleteWithContext(ctx context.Context, marketingEmailId string) error {
	req, err := s.client.NewRequest(ctx, http.MethodDelete, "v1/marketing-emails/"+marketingEmailId, nil)
	if err != nil {
		return ErrFailedToCreateMarketingEmailsDeleteRequest
	}

	_, err = s.client.Perform(req, nil)
	return err
}

func (s *MarketingEmailsSvcImpl) Preview(marketingEmailId string) (*MarketingEmailPreview, error) {
	return s.PreviewWithContext(context.Background(), marketingEmailId)
}

func (s *MarketingEmailsSvcImpl) PreviewWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmailPreview, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/marketing-emails/"+marketingEmailId+"/preview", nil)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsPreviewRequest
	}

	preview := new(MarketingEmailPreview)
	_, err = s.client.Perform(req, preview)
	if err != nil {
		return nil, err
	}

	return preview, nil
}

func (s *MarketingEmailsSvcImpl) Stats(marketingEmailId string) (*MarketingEmailStats, error) {
	return s.StatsWithContext(context.Background(), marketingEmailId)
}

func (s *MarketingEmailsSvcImpl) StatsWithContext(ctx context.Context, marketingEmailId string) (*MarketingEmailStats, error) {
	req, err := s.client.NewRequest(ctx, http.MethodGet, "v1/marketing-emails/"+marketingEmailId+"/stats", nil)
	if err != nil {
		return nil, ErrFailedToCreateMarketingEmailsStatsRequest
	}

	stats := new(MarketingEmailStats)
	_, err = s.client.Perform(req, stats)
	if err != nil {
		return nil, err
	}

	return stats, nil
}
