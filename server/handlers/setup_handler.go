package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/services"
)

type SetupHandler struct {
	setupService *services.SetupService
}

func NewSetupHandler(setupService *services.SetupService) *SetupHandler {
	return &SetupHandler{
		setupService: setupService,
	}
}

// GetSetupStatus checks if initial setup is required
func (h *SetupHandler) GetSetupStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	status := h.setupService.GetSetupStatus()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// ValidateSetupToken validates the setup token provided by user
func (h *SetupHandler) ValidateSetupToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Token string `json:"token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	isValid := h.setupService.ValidateSetupToken(req.Token)
	
	response := map[string]interface{}{
		"valid": isValid,
	}

	if !isValid {
		response["message"] = "Invalid or expired setup token"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PerformSetup handles the complete initial setup
func (h *SetupHandler) PerformSetup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var setupReq services.SetupRequest
	if err := json.NewDecoder(r.Body).Decode(&setupReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if setupReq.SetupToken == "" {
		http.Error(w, "Setup token is required", http.StatusBadRequest)
		return
	}
	if setupReq.TenantName == "" {
		http.Error(w, "Tenant name is required", http.StatusBadRequest)
		return
	}
	if setupReq.TenantDomain == "" {
		http.Error(w, "Tenant domain is required", http.StatusBadRequest)
		return
	}
	if setupReq.TenantSubdomain == "" {
		http.Error(w, "Tenant subdomain is required", http.StatusBadRequest)
		return
	}
	if setupReq.AdminEmail == "" {
		http.Error(w, "Admin email is required", http.StatusBadRequest)
		return
	}
	if setupReq.AdminPassword == "" {
		http.Error(w, "Admin password is required", http.StatusBadRequest)
		return
	}
	if len(setupReq.AdminPassword) < 8 {
		http.Error(w, "Admin password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	// Set default tenant settings if not provided
	if setupReq.Settings.SessionTimeout == 0 {
		setupReq.Settings.SessionTimeout = 60 // 1 hour default
	}
	// Default to allow user registration
	setupReq.Settings.AllowUserRegistration = true
	// Default branding
	if setupReq.Settings.CustomBranding.CompanyName == "" {
		setupReq.Settings.CustomBranding.CompanyName = setupReq.TenantName
	}
	if setupReq.Settings.CustomBranding.PrimaryColor == "" {
		setupReq.Settings.CustomBranding.PrimaryColor = "#3b82f6"
	}
	if setupReq.Settings.CustomBranding.SecondaryColor == "" {
		setupReq.Settings.CustomBranding.SecondaryColor = "#1e40af"
	}

	if err := h.setupService.PerformInitialSetup(&setupReq); err != nil {
		http.Error(w, "Setup failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message":    "Initial setup completed successfully",
		"tenant":     setupReq.TenantName,
		"admin_user": setupReq.AdminEmail,
		"login_url":  "/auth/login",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}