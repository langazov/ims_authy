package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/middleware"
	"oauth2-openid-server/models"
	"oauth2-openid-server/services"
)

type ScopeHandler struct {
	scopeService *services.ScopeService
}

func NewScopeHandler(scopeService *services.ScopeService) *ScopeHandler {
	return &ScopeHandler{
		scopeService: scopeService,
	}
}

type CreateScopeRequest struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Active      bool   `json:"active"`
}

type UpdateScopeRequest struct {
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Active      bool   `json:"active"`
}

func (h *ScopeHandler) GetAllScopes(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantIDFromRequest(r)

	scopes, err := h.scopeService.GetAllScopes(tenantID)
	if err != nil {
		http.Error(w, "Failed to fetch scopes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// CORS headers are handled by the global CORS middleware

	json.NewEncoder(w).Encode(scopes)
}

func (h *ScopeHandler) CreateScope(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantIDFromRequest(r)

	var req CreateScopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	scope := &models.Scope{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Category:    req.Category,
		Active:      req.Active,
		TenantID:    tenantID,
	}

	if err := h.scopeService.CreateScope(scope); err != nil {
		http.Error(w, "Failed to create scope", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// CORS headers are handled by the global CORS middleware
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(scope)
}

func (h *ScopeHandler) UpdateScope(w http.ResponseWriter, r *http.Request) {
	// Extract scope ID from URL path
	scopeID := r.URL.Path[len("/api/v1/scopes/"):]
	if scopeID == "" {
		http.Error(w, "Scope ID is required", http.StatusBadRequest)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)

	var req UpdateScopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	scope := &models.Scope{
		DisplayName: req.DisplayName,
		Description: req.Description,
		Category:    req.Category,
		Active:      req.Active,
	}

	if err := h.scopeService.UpdateScope(scopeID, tenantID, scope); err != nil {
		http.Error(w, "Failed to update scope", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// CORS headers are handled by the global CORS middleware

	json.NewEncoder(w).Encode(map[string]string{"message": "Scope updated successfully"})
}

func (h *ScopeHandler) DeleteScope(w http.ResponseWriter, r *http.Request) {
	// Extract scope ID from URL path
	scopeID := r.URL.Path[len("/api/v1/scopes/"):]
	if scopeID == "" {
		http.Error(w, "Scope ID is required", http.StatusBadRequest)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)

	if err := h.scopeService.DeleteScope(scopeID, tenantID); err != nil {
		http.Error(w, "Failed to delete scope", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// CORS headers are handled by the global CORS middleware

	json.NewEncoder(w).Encode(map[string]string{"message": "Scope deleted successfully"})
}

func (h *ScopeHandler) HandleOptions(w http.ResponseWriter, r *http.Request) {
	// CORS headers are handled by the global CORS middleware
	w.WriteHeader(http.StatusOK)
}