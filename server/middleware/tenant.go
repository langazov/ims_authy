package middleware

import (
	"context"
	"net/http"
	"strings"

	"oauth2-openid-server/services"
)

type contextKey string

const TenantIDKey contextKey = "tenant_id"

// TenantMiddleware extracts tenant information from the request and adds it to context
func TenantMiddleware(tenantService *services.TenantService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try to resolve tenant from various sources
			var tenantID string

			// 1. Check for X-Tenant-ID header (for API clients)
			if header := r.Header.Get("X-Tenant-ID"); header != "" {
				tenantID = header
			} else {
				// 2. Check subdomain/domain from Host header
				host := r.Host
				// Remove port if present
				if colonIndex := strings.Index(host, ":"); colonIndex != -1 {
					host = host[:colonIndex]
				}

				tenant, err := tenantService.ResolveTenantFromHost(host)
				if err == nil && tenant != nil {
					tenantID = tenant.ID.Hex()
				}
			}

			// If no tenant found, try to get default tenant
			if tenantID == "" {
				defaultTenant, err := tenantService.GetTenantBySubdomain("default")
				if err == nil && defaultTenant != nil {
					tenantID = defaultTenant.ID.Hex()
				}
			}

			// Add tenant ID to request context
			if tenantID != "" {
				ctx := context.WithValue(r.Context(), TenantIDKey, tenantID)
				r = r.WithContext(ctx)
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetTenantIDFromContext extracts tenant ID from request context
func GetTenantIDFromContext(ctx context.Context) string {
	if tenantID, ok := ctx.Value(TenantIDKey).(string); ok {
		return tenantID
	}
	return ""
}

// GetTenantIDFromRequest extracts tenant ID from request context
func GetTenantIDFromRequest(r *http.Request) string {
	return GetTenantIDFromContext(r.Context())
}