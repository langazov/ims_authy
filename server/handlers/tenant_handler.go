package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

// TenantResponse represents a tenant with additional metadata
type TenantResponse struct {
	*models.Tenant
	WellKnownURLs WellKnownURLs `json:"well_known_urls"`
}

// WellKnownURLs contains OpenID Connect discovery URLs for the tenant
type WellKnownURLs struct {
	OpenIDConfiguration string `json:"openid_configuration"`
}

// buildTenantResponse creates a tenant response with well-known URLs
func (h *TenantHandler) buildTenantResponse(tenant *models.Tenant, r *http.Request) *TenantResponse {
	scheme := "https"
	if r.Header.Get("X-Forwarded-Proto") != "" {
		scheme = r.Header.Get("X-Forwarded-Proto")
	} else if r.TLS == nil {
		scheme = "http"
	}
	
	baseURL := scheme + "://" + r.Host
	
	return &TenantResponse{
		Tenant: tenant,
		WellKnownURLs: WellKnownURLs{
			OpenIDConfiguration: baseURL + "/.well-known/" + tenant.ID.Hex() + "/openid_configuration",
		},
	}
}

// buildTenantsResponse creates tenant responses with well-known URLs for a slice of tenants
func (h *TenantHandler) buildTenantsResponse(tenants []*models.Tenant, r *http.Request) []*TenantResponse {
	response := make([]*TenantResponse, len(tenants))
	for i, tenant := range tenants {
		response[i] = h.buildTenantResponse(tenant, r)
	}
	return response
}

type TenantHandler struct {
	tenantService         *services.TenantService
	socialProviderService *services.SocialProviderService
	scopeService          *services.ScopeService
	groupService          *services.GroupService
}

type CreateTenantRequest struct {
	Name      string                `json:"name"`
	Domain    string                `json:"domain"`
	Subdomain string                `json:"subdomain"`
	Settings  models.TenantSettings `json:"settings"`
}

type UpdateTenantRequest struct {
	Name      string                `json:"name"`
	Domain    string                `json:"domain"`
	Subdomain string                `json:"subdomain"`
	Settings  models.TenantSettings `json:"settings"`
}

func NewTenantHandler(tenantService *services.TenantService, socialProviderService *services.SocialProviderService, scopeService *services.ScopeService, groupService *services.GroupService) *TenantHandler {
	return &TenantHandler{
		tenantService:         tenantService,
		socialProviderService: socialProviderService,
		scopeService:          scopeService,
		groupService:          groupService,
	}
}

func (h *TenantHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var createReq CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if createReq.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if createReq.Domain == "" {
		http.Error(w, "Domain is required", http.StatusBadRequest)
		return
	}
	if createReq.Subdomain == "" {
		http.Error(w, "Subdomain is required", http.StatusBadRequest)
		return
	}

	tenant := &models.Tenant{
		Name:      createReq.Name,
		Domain:    createReq.Domain,
		Subdomain: createReq.Subdomain,
		Settings:  createReq.Settings,
	}

	if err := h.tenantService.CreateTenant(tenant); err != nil {
		http.Error(w, "Failed to create tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Initialize default scopes for this tenant (best-effort)
	if h.scopeService != nil {
		if err := h.scopeService.InitializeDefaultScopes(tenant.ID.Hex()); err != nil {
			// Log but don't fail the request
			log.Printf("Warning: Failed to initialize default scopes for tenant %s: %v", tenant.ID.Hex(), err)
		}
	}

	// Initialize default groups for this tenant (best-effort)
	if h.groupService != nil {
		if err := h.groupService.InitializeDefaultGroups(tenant.ID.Hex()); err != nil {
			// Log but don't fail the request
			log.Printf("Warning: Failed to initialize default groups for tenant %s: %v", tenant.ID.Hex(), err)
		}
	}

	// Initialize default social providers for this tenant (best-effort)
	if h.socialProviderService != nil {
		if err := h.socialProviderService.InitializeDefaultProviders(tenant.ID.Hex()); err != nil {
			// Log but don't fail the request
			log.Printf("Warning: Failed to initialize default social providers for tenant %s: %v", tenant.ID.Hex(), err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(h.buildTenantResponse(tenant, r))
}

func (h *TenantHandler) GetTenants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenants, err := h.tenantService.GetAllTenants()
	if err != nil {
		http.Error(w, "Failed to get tenants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildTenantsResponse(tenants, r))
}

func (h *TenantHandler) GetTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	tenantID := vars["id"]

	tenant, err := h.tenantService.GetTenantByID(tenantID)
	if err != nil {
		http.Error(w, "Tenant not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildTenantResponse(tenant, r))
}

func (h *TenantHandler) UpdateTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	tenantID := vars["id"]

	var updateReq UpdateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tenant := &models.Tenant{
		Name:      updateReq.Name,
		Domain:    updateReq.Domain,
		Subdomain: updateReq.Subdomain,
		Settings:  updateReq.Settings,
	}

	if err := h.tenantService.UpdateTenant(tenantID, tenant); err != nil {
		http.Error(w, "Failed to update tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the updated tenant to include the ID in the response
	updatedTenant, err := h.tenantService.GetTenantByID(tenantID)
	if err != nil {
		http.Error(w, "Failed to retrieve updated tenant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildTenantResponse(updatedTenant, r))
}

func (h *TenantHandler) DeleteTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	tenantID := vars["id"]

	if err := h.tenantService.DeleteTenant(tenantID); err != nil {
		http.Error(w, "Failed to delete tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
