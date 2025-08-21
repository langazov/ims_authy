package autodiscovery

import (
	"encoding/json"
	"net/http"
)

// OpenIDConfiguration represents the OpenID Connect Discovery metadata
type OpenIDConfiguration struct {
	Issuer                                    string   `json:"issuer"`
	AuthorizationEndpoint                     string   `json:"authorization_endpoint"`
	TokenEndpoint                            string   `json:"token_endpoint"`
	UserinfoEndpoint                         string   `json:"userinfo_endpoint"`
	JWKSUri                                  string   `json:"jwks_uri"`
	ScopesSupported                          []string `json:"scopes_supported"`
	ResponseTypesSupported                   []string `json:"response_types_supported"`
	ResponseModesSupported                   []string `json:"response_modes_supported"`
	GrantTypesSupported                      []string `json:"grant_types_supported"`
	TokenEndpointAuthMethodsSupported        []string `json:"token_endpoint_auth_methods_supported"`
	CodeChallengeMethodsSupported            []string `json:"code_challenge_methods_supported"`
	SubjectTypesSupported                    []string `json:"subject_types_supported"`
	IDTokenSigningAlgValuesSupported         []string `json:"id_token_signing_alg_values_supported"`
	ClaimsSupported                          []string `json:"claims_supported"`
}

// ConfigBuilder builds OpenID Connect Discovery configuration
type ConfigBuilder struct {
	baseURL  string
	tenantID string
}

// NewConfigBuilder creates a new configuration builder
func NewConfigBuilder(baseURL string) *ConfigBuilder {
	return &ConfigBuilder{
		baseURL: baseURL,
	}
}

// WithTenant sets the tenant ID for tenant-specific configuration
func (cb *ConfigBuilder) WithTenant(tenantID string) *ConfigBuilder {
	cb.tenantID = tenantID
	return cb
}

// Build creates the OpenID Connect Discovery configuration
func (cb *ConfigBuilder) Build() *OpenIDConfiguration {
	var issuer, authEndpoint, tokenEndpoint, userinfoEndpoint string
	
	if cb.tenantID != "" {
		// Tenant-specific endpoints
		tenantBase := cb.baseURL + "/tenant/" + cb.tenantID
		issuer = tenantBase
		authEndpoint = tenantBase + "/oauth/authorize"
		tokenEndpoint = tenantBase + "/oauth/token"
		userinfoEndpoint = tenantBase + "/api/v1/users/me"
	} else {
		// Legacy endpoints
		issuer = cb.baseURL
		authEndpoint = cb.baseURL + "/oauth/authorize"
		tokenEndpoint = cb.baseURL + "/oauth/token"
		userinfoEndpoint = cb.baseURL + "/api/v1/users/me"
	}
	
	return &OpenIDConfiguration{
		Issuer:                issuer,
		AuthorizationEndpoint: authEndpoint,
		TokenEndpoint:         tokenEndpoint,
		UserinfoEndpoint:      userinfoEndpoint,
		JWKSUri:              issuer + "/.well-known/jwks.json",
		ScopesSupported: []string{
			"openid", "profile", "email", "read", "write", "admin",
		},
		ResponseTypesSupported: []string{
			"code", "token", "id_token", "code token", "code id_token", 
			"token id_token", "code token id_token",
		},
		ResponseModesSupported: []string{
			"query", "fragment", "form_post",
		},
		GrantTypesSupported: []string{
			"authorization_code", "implicit", "refresh_token",
		},
		TokenEndpointAuthMethodsSupported: []string{
			"client_secret_basic", "client_secret_post", "none",
		},
		CodeChallengeMethodsSupported: []string{
			"S256", "plain",
		},
		SubjectTypesSupported: []string{
			"public",
		},
		IDTokenSigningAlgValuesSupported: []string{
			"HS256", "RS256",
		},
		ClaimsSupported: []string{
			"sub", "iss", "aud", "exp", "iat", "auth_time", "nonce", 
			"email", "email_verified", "name", "groups", "scopes", "tenant_id",
		},
	}
}

// WriteJSON writes the configuration as JSON to the response writer
func (config *OpenIDConfiguration) WriteJSON(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(config)
}