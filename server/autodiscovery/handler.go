package autodiscovery

import (
	"net/http"
)

// Handler provides HTTP handlers for OpenID Connect Discovery endpoints
type Handler struct{}

// NewHandler creates a new autodiscovery handler
func NewHandler() *Handler {
	return &Handler{}
}

// getBaseURL extracts the base URL from the HTTP request
func (h *Handler) getBaseURL(r *http.Request) string {
	scheme := "https"
	if r.Header.Get("X-Forwarded-Proto") != "" {
		scheme = r.Header.Get("X-Forwarded-Proto")
	} else if r.TLS == nil {
		scheme = "http"
	}
	
	return scheme + "://" + r.Host
}

// LegacyDiscoveryHandler handles the legacy /.well-known/openid_configuration endpoint
func (h *Handler) LegacyDiscoveryHandler(w http.ResponseWriter, r *http.Request) {
	baseURL := h.getBaseURL(r)
	
	config := NewConfigBuilder(baseURL).Build()
	
	if err := config.WriteJSON(w); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// TenantDiscoveryHandler handles tenant-specific /.well-known/openid_configuration endpoint
func (h *Handler) TenantDiscoveryHandler(tenantIDGetter func(*http.Request) string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		baseURL := h.getBaseURL(r)
		tenantID := tenantIDGetter(r)
		
		config := NewConfigBuilder(baseURL).WithTenant(tenantID).Build()
		
		if err := config.WriteJSON(w); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}