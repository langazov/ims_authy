package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type contextKey string

const TenantIDKey contextKey = "tenant_id"

// TenantMiddleware extracts tenant information from the request and adds it to context
func TenantMiddleware(tenantService *services.TenantService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try to resolve tenant from various sources in priority order:
			// 1. URL path parameters (/tenant/{tenantId}/...)
			// 2. URL query parameters (?tenant_id=xxx, ?tenantId=xxx, ?tenant=xxx)
			// 3. HTTP headers (X-Tenant-ID)
			// 4. Host/subdomain resolution
			// 5. Default tenant fallback
			var tenantID string

			// 1. Check for tenant ID in URL path (e.g., /tenant/{tenantId}/...)
			if vars := mux.Vars(r); vars != nil {
				if urlTenantID := vars["tenantId"]; urlTenantID != "" {
					// Validate that the tenant exists
					tenant, err := tenantService.GetTenantByID(urlTenantID)
					if err == nil && tenant != nil {
						tenantID = tenant.ID.Hex()
						log.Printf("Tenant resolved from URL path: %s ID: %s", tenant.Name, tenantID)
					}
				}
			}

			// 2. Check for tenant in URL query parameters (try multiple parameter names)
			if tenantID == "" {
				queryParams := []string{"tenant_id", "tenantId", "tenant"}
				for _, param := range queryParams {
					if queryTenantID := r.URL.Query().Get(param); queryTenantID != "" {
						// Validate that the tenant exists
						tenant, err := tenantService.GetTenantByID(queryTenantID)
						if err == nil && tenant != nil {
							tenantID = tenant.ID.Hex()
							println("Tenant resolved from URL query parameter", param+":", tenant.Name, "ID:", tenantID)
							break
						}
					}
				}
			}

			// 3. Check for X-Tenant-ID header (for API clients)
			if tenantID == "" {
				if header := r.Header.Get("X-Tenant-ID"); header != "" {
					// This could be either an ObjectID or a tenant identifier
					// First try as ObjectID
					tenant, err := tenantService.GetTenantByID(header)
					if err == nil && tenant != nil {
						tenantID = tenant.ID.Hex()
						println("Tenant resolved from X-Tenant-ID header:", tenant.Name, "ID:", tenantID)
					} else {
						// If not found as ObjectID, treat as direct tenant ID
						tenantID = header
						println("Using X-Tenant-ID header directly as tenant ID:", tenantID)
					}
				}
			}

			// 4. Check subdomain/domain from Host header
			if tenantID == "" {
				host := r.Host
				// Remove port if present
				if colonIndex := strings.Index(host, ":"); colonIndex != -1 {
					host = host[:colonIndex]
				}

				tenant, err := tenantService.ResolveTenantFromHost(host)
				if err == nil && tenant != nil {
					tenantID = tenant.ID.Hex()
					println("Tenant resolved from host", host+":", tenant.Name, "ID:", tenantID)
				}
			}

			// If no tenant found, try to get default tenant using isDefault flag
			if tenantID == "" {
				defaultTenant, err := tenantService.GetDefaultTenant()
				if err != nil {
					// Log the error but continue - this helps with debugging
					println("Warning: Failed to get default tenant:", err.Error())
				}
				if err == nil && defaultTenant != nil {
					tenantID = defaultTenant.ID.Hex()
					println("Using default tenant:", defaultTenant.Name, "ID:", tenantID)
				} else {
					println("No default tenant found, request will fail")
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
