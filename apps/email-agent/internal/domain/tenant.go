// Package domain contains domain types for the email agent
package domain

// Tenant represents a tenant/workspace with DKIM configuration
type Tenant struct {
	ID          string       `json:"id"`
	DKIMConfigs []DKIMConfig `json:"dkim_configs"`
}

// DKIMConfig represents DKIM configuration for a sending domain
type DKIMConfig struct {
	Domain       string `json:"domain"`
	Selector     string `json:"selector"`       // e.g., "kibamail"
	PrivateKey   string `json:"private_key"`    // Decrypted PEM format
	PublicKey    string `json:"public_key"`     // Public key for verification
	HeaderFields string `json:"header_fields"`  // Headers to sign, e.g., "from:to:subject:date"
}

// TenantResponse is the API response for tenant info
type TenantResponse struct {
	TenantID    string       `json:"tenant_id"`
	DKIMConfigs []DKIMConfig `json:"dkim_configs"`
}

// ControlPlaneTenant represents tenant data from control plane API
type ControlPlaneTenant struct {
	ID             string                  `json:"id"`
	SendingDomains []ControlPlaneDomain    `json:"sending_domains"`
}

// ControlPlaneDomain represents a sending domain from control plane API
type ControlPlaneDomain struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	DkimSubDomain       string `json:"dkim_sub_domain"`       // e.g., "kibamail._domainkey"
	DkimPublicKey       string `json:"dkim_public_key"`       // Public key
	DkimPrivateKey      string `json:"dkim_private_key"`      // Encrypted private key
	DkimVerifiedAt      string `json:"dkim_verified_at"`      // Verification timestamp
	ReturnPathDomain    string `json:"return_path_domain"`
}
