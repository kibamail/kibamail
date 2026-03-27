package kibamail

import (
	"context"
	"net/http"
)

// CreateDomainRequest is the request object for the Create call.
type CreateDomainRequest struct {
	Name         string `json:"name"`
	DmarcEnabled bool   `json:"dmarcEnabled,omitempty"`
}

// UpdateDomainRequest is the request object for the Update call.
type UpdateDomainRequest struct {
	OpenTrackingEnabled  *bool `json:"openTrackingEnabled,omitempty"`
	ClickTrackingEnabled *bool `json:"clickTrackingEnabled,omitempty"`
	DmarcEnabled         *bool `json:"dmarcEnabled,omitempty"`
}

// DnsRecord represents a single DNS record for domain verification.
type DnsRecord struct {
	Type     string `json:"type"`
	Hostname string `json:"hostname"`
	Value    string `json:"value"`
}

// DomainDnsRecords contains the DNS records required for domain setup.
type DomainDnsRecords struct {
	Dkim       DnsRecord `json:"dkim"`
	ReturnPath DnsRecord `json:"returnPath"`
	Tracking   DnsRecord `json:"tracking"`
}

// Domain provides the structure for a sending domain object.
type Domain struct {
	Object               string           `json:"object"`
	ID                   string           `json:"id"`
	Name                 string           `json:"name"`
	DkimVerified         bool             `json:"dkimVerified"`
	ReturnPathVerified   bool             `json:"returnPathVerified"`
	TrackingVerified     bool             `json:"trackingVerified"`
	OpenTrackingEnabled  bool             `json:"openTrackingEnabled"`
	ClickTrackingEnabled bool             `json:"clickTrackingEnabled"`
	DnsRecords           DomainDnsRecords `json:"dnsRecords"`
	CreatedAt            string           `json:"createdAt"`
	SslStatus            string           `json:"sslStatus"`
	SslError             string           `json:"sslError"`
}

// ListDomainsResponse is the response from the List call.
type ListDomainsResponse struct {
	Object      string   `json:"object"`
	HasMore     bool     `json:"hasMore"`
	HasPrevious bool     `json:"hasPrevious"`
	Data        []Domain `json:"data"`
}

// VerificationResult represents the verification result for a single DNS record.
type VerificationResult struct {
	Configured bool     `json:"configured"`
	Expected   string   `json:"expected"`
	Found      []string `json:"found"`
}

// DomainVerification contains the per-record verification results.
type DomainVerification struct {
	Dkim        VerificationResult `json:"dkim"`
	ReturnPath  VerificationResult `json:"returnPath"`
	Tracking    VerificationResult `json:"tracking"`
	Dmarc       VerificationResult `json:"dmarc"`
	Mx          *VerificationResult `json:"mx,omitempty"`
	AllVerified bool               `json:"allVerified"`
}

// DomainVerifyResponse is the response from the Verify call.
type DomainVerifyResponse struct {
	Object               string             `json:"object"`
	ID                   string             `json:"id"`
	Name                 string             `json:"name"`
	DkimVerified         bool               `json:"dkimVerified"`
	ReturnPathVerified   bool               `json:"returnPathVerified"`
	TrackingVerified     bool               `json:"trackingVerified"`
	OpenTrackingEnabled  bool               `json:"openTrackingEnabled"`
	ClickTrackingEnabled bool               `json:"clickTrackingEnabled"`
	DnsRecords           DomainDnsRecords   `json:"dnsRecords"`
	CreatedAt            string             `json:"createdAt"`
	SslStatus            string             `json:"sslStatus"`
	SslError             string             `json:"sslError"`
	Verification         DomainVerification `json:"verification"`
}

// DomainsSvc provides an interface for managing sending domains.
type DomainsSvc interface {
	Create(params *CreateDomainRequest) (*Domain, error)
	CreateWithContext(ctx context.Context, params *CreateDomainRequest) (*Domain, error)
	List(params *ListOptions) (*ListDomainsResponse, error)
	ListWithContext(ctx context.Context, params *ListOptions) (*ListDomainsResponse, error)
	Get(domainId string) (*Domain, error)
	GetWithContext(ctx context.Context, domainId string) (*Domain, error)
	Update(domainId string, params *UpdateDomainRequest) (*Domain, error)
	UpdateWithContext(ctx context.Context, domainId string, params *UpdateDomainRequest) (*Domain, error)
	Delete(domainId string) error
	DeleteWithContext(ctx context.Context, domainId string) error
	Verify(domainId string) (*DomainVerifyResponse, error)
	VerifyWithContext(ctx context.Context, domainId string) (*DomainVerifyResponse, error)
}

// DomainsSvcImpl implements DomainsSvc.
type DomainsSvcImpl struct {
	client *Client
}

// Create adds a new sending domain to your workspace.
func (s *DomainsSvcImpl) Create(params *CreateDomainRequest) (*Domain, error) {
	return s.CreateWithContext(context.Background(), params)
}

// CreateWithContext adds a new sending domain to your workspace.
func (s *DomainsSvcImpl) CreateWithContext(ctx context.Context, params *CreateDomainRequest) (*Domain, error) {
	path := "v1/domains"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, params)
	if err != nil {
		return nil, ErrFailedToCreateDomainsCreateRequest
	}

	// Build response recipient obj
	domain := new(Domain)

	// Send Request
	_, err = s.client.Perform(req, domain)

	if err != nil {
		return nil, err
	}

	return domain, nil
}

// List retrieves a paginated list of all sending domains in your workspace.
func (s *DomainsSvcImpl) List(params *ListOptions) (*ListDomainsResponse, error) {
	return s.ListWithContext(context.Background(), params)
}

// ListWithContext retrieves a paginated list of all sending domains in your workspace.
func (s *DomainsSvcImpl) ListWithContext(ctx context.Context, params *ListOptions) (*ListDomainsResponse, error) {
	path := "v1/domains" + buildPaginationQuery(params)

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateDomainsListRequest
	}

	// Build response recipient obj
	listDomainsResponse := new(ListDomainsResponse)

	// Send Request
	_, err = s.client.Perform(req, listDomainsResponse)

	if err != nil {
		return nil, err
	}

	return listDomainsResponse, nil
}

// Get retrieves a specific sending domain by ID.
func (s *DomainsSvcImpl) Get(domainId string) (*Domain, error) {
	return s.GetWithContext(context.Background(), domainId)
}

// GetWithContext retrieves a specific sending domain by ID.
func (s *DomainsSvcImpl) GetWithContext(ctx context.Context, domainId string) (*Domain, error) {
	path := "v1/domains/" + domainId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateDomainsGetRequest
	}

	// Build response recipient obj
	domain := new(Domain)

	// Send Request
	_, err = s.client.Perform(req, domain)

	if err != nil {
		return nil, err
	}

	return domain, nil
}

// Update updates settings for an existing sending domain.
func (s *DomainsSvcImpl) Update(domainId string, params *UpdateDomainRequest) (*Domain, error) {
	return s.UpdateWithContext(context.Background(), domainId, params)
}

// UpdateWithContext updates settings for an existing sending domain.
func (s *DomainsSvcImpl) UpdateWithContext(ctx context.Context, domainId string, params *UpdateDomainRequest) (*Domain, error) {
	path := "v1/domains/" + domainId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPut, path, params)
	if err != nil {
		return nil, ErrFailedToCreateDomainsUpdateRequest
	}

	// Build response recipient obj
	domain := new(Domain)

	// Send Request
	_, err = s.client.Perform(req, domain)

	if err != nil {
		return nil, err
	}

	return domain, nil
}

// Delete deletes a sending domain by ID.
func (s *DomainsSvcImpl) Delete(domainId string) error {
	return s.DeleteWithContext(context.Background(), domainId)
}

// DeleteWithContext deletes a sending domain by ID.
func (s *DomainsSvcImpl) DeleteWithContext(ctx context.Context, domainId string) error {
	path := "v1/domains/" + domainId

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return ErrFailedToCreateDomainsDeleteRequest
	}

	// Send Request
	_, err = s.client.Perform(req, nil)

	if err != nil {
		return err
	}

	return nil
}

// Verify verifies DNS configuration for a sending domain.
func (s *DomainsSvcImpl) Verify(domainId string) (*DomainVerifyResponse, error) {
	return s.VerifyWithContext(context.Background(), domainId)
}

// VerifyWithContext verifies DNS configuration for a sending domain.
func (s *DomainsSvcImpl) VerifyWithContext(ctx context.Context, domainId string) (*DomainVerifyResponse, error) {
	path := "v1/domains/" + domainId + "/verify"

	// Prepare request
	req, err := s.client.NewRequest(ctx, http.MethodPost, path, nil)
	if err != nil {
		return nil, ErrFailedToCreateDomainsVerifyRequest
	}

	// Build response recipient obj
	domainVerifyResponse := new(DomainVerifyResponse)

	// Send Request
	_, err = s.client.Perform(req, domainVerifyResponse)

	if err != nil {
		return nil, err
	}

	return domainVerifyResponse, nil
}
