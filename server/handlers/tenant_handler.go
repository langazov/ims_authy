package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type TenantHandler struct {
	tenantService         *services.TenantService
	socialProviderService *services.SocialProviderService
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

func NewTenantHandler(tenantService *services.TenantService, socialProviderService *services.SocialProviderService) *TenantHandler {
	return &TenantHandler{
		tenantService:         tenantService,
		socialProviderService: socialProviderService,
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

	// Initialize default social providers for this tenant (best-effort)
	if h.socialProviderService != nil {
		if err := h.socialProviderService.InitializeDefaultProviders(tenant.ID.Hex()); err != nil {
			// Log but don't fail the request
			log.Printf("Warning: Failed to initialize default social providers for tenant %s: %v", tenant.ID.Hex(), err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tenant)
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
	json.NewEncoder(w).Encode(tenants)
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
	json.NewEncoder(w).Encode(tenant)
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tenant)
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
