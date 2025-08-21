package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"oauth2-openid-server/middleware"
	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type UserHandler struct {
	userService   *services.UserService
	tenantService *services.TenantService
	groupService  *services.GroupService
}

type CreateUserRequest struct {
	Email     string   `json:"email"`
	Username  string   `json:"username"`
	Password  string   `json:"password"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	Groups    []string `json:"groups"`
	Scopes    []string `json:"scopes"`
}

type UpdateUserRequest struct {
	Email     string   `json:"email"`
	Username  string   `json:"username"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	Groups    []string `json:"groups"`
	Scopes    []string `json:"scopes"`
	Active    bool     `json:"active"`
}

type RegisterUserRequest struct {
	Email     string `json:"email"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func NewUserHandler(userService *services.UserService, tenantService *services.TenantService, groupService *services.GroupService) *UserHandler {
	return &UserHandler{
		userService:   userService,
		tenantService: tenantService,
		groupService:  groupService,
	}
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	var createReq CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if createReq.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}
	if createReq.Password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}
	if len(createReq.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Check if user already exists in this tenant
	if existingUser, _ := h.userService.GetUserByEmailAndTenant(createReq.Email, tenantID); existingUser != nil {
		http.Error(w, "User with this email already exists", http.StatusConflict)
		return
	}

	// Set default scopes if none provided
	if len(createReq.Scopes) == 0 {
		createReq.Scopes = []string{"read", "openid", "profile", "email"}
	}

	user := &models.User{
		TenantID:     tenantID,
		Email:        createReq.Email,
		Username:     createReq.Username,
		PasswordHash: createReq.Password,
		FirstName:    createReq.FirstName,
		LastName:     createReq.LastName,
		Groups:       createReq.Groups,
		Scopes:       createReq.Scopes,
	}

	if err := h.userService.CreateUser(user); err != nil {
		http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Clear password before returning
	user.PasswordHash = ""

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	users, err := h.userService.GetAllUsersByTenant(tenantID)
	if err != nil {
		http.Error(w, "Failed to get users: "+err.Error(), http.StatusInternalServerError)
		return
	}

	for _, user := range users {
		user.PasswordHash = ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	userID := vars["id"]

	user, err := h.userService.GetUserByIDAndTenant(userID, tenantID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	user.PasswordHash = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	userID := vars["id"]

	var updateReq UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user := &models.User{
		TenantID:  tenantID,
		Email:     updateReq.Email,
		Username:  updateReq.Username,
		FirstName: updateReq.FirstName,
		LastName:  updateReq.LastName,
		Groups:    updateReq.Groups,
		Active:    updateReq.Active,
		Scopes:    updateReq.Scopes,
	}

	if err := h.userService.UpdateUserInTenant(userID, tenantID, user); err != nil {
		http.Error(w, "Failed to update user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	user.PasswordHash = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	userID := vars["id"]

	if err := h.userService.DeleteUserInTenant(userID, tenantID); err != nil {
		http.Error(w, "Failed to delete user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetCurrentUser returns the current user's fresh information from the database
func (h *UserHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	// Extract user ID from JWT token in Authorization header
	userID, err := h.extractUserIDFromToken(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	// Get fresh user data from database within tenant context
	user, err := h.userService.GetUserByIDAndTenant(userID, tenantID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Return fresh user data
	response := map[string]interface{}{
		"id":         user.ID.Hex(),
		"tenant_id":  user.TenantID,
		"email":      user.Email,
		"username":   user.Username,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"groups":     user.Groups,
		"scopes":     user.Scopes,
		"active":     user.Active,
		"two_factor_enabled": user.TwoFactorEnabled,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper function to extract user ID from JWT token
func (h *UserHandler) extractUserIDFromToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("authorization header missing")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	token := parts[1]
	
	// Parse JWT token (simplified - just decode the payload)
	parts = strings.Split(token, ".")
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid JWT token format")
	}

	// Decode the payload (second part)
	payload := parts[1]
	// Add padding if needed
	for len(payload)%4 != 0 {
		payload += "="
	}
	
	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		return "", fmt.Errorf("failed to decode JWT payload")
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return "", fmt.Errorf("failed to parse JWT claims")
	}

	// Extract user ID from claims
	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", fmt.Errorf("user_id not found in token")
	}

	return userID, nil
}

// RegisterUser handles public user registration for tenants that allow it
func (h *UserHandler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
		return
	}

	// Check if this tenant allows user registration
	tenant, err := h.tenantService.GetTenantByID(tenantID)
	if err != nil {
		http.Error(w, "Invalid tenant", http.StatusBadRequest)
		return
	}

	if !tenant.Settings.AllowUserRegistration {
		http.Error(w, "User registration is not enabled for this tenant", http.StatusForbidden)
		return
	}

	var registerReq RegisterUserRequest
	if err := json.NewDecoder(r.Body).Decode(&registerReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if registerReq.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}
	if registerReq.Password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}
	if len(registerReq.Password) < 8 {
		http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	// Check if user already exists in this tenant
	if existingUser, _ := h.userService.GetUserByEmailAndTenant(registerReq.Email, tenantID); existingUser != nil {
		http.Error(w, "User with this email already exists", http.StatusConflict)
		return
	}

	// Find the "Standard Users" group to assign to new registrations
	var userGroups []string
	if standardGroup, err := h.groupService.GetGroupByName("Standard Users", tenantID); err == nil {
		userGroups = []string{standardGroup.ID.Hex()}
	}

	// Set default scopes for registered users
	defaultScopes := []string{"read", "openid", "profile", "email", "read:profile", "write:profile"}

	user := &models.User{
		TenantID:     tenantID,
		Email:        registerReq.Email,
		Username:     registerReq.Username,
		PasswordHash: registerReq.Password,
		FirstName:    registerReq.FirstName,
		LastName:     registerReq.LastName,
		Groups:       userGroups,
		Scopes:       defaultScopes,
		Active:       true, // Auto-activate registered users
	}

	if err := h.userService.CreateUser(user); err != nil {
		http.Error(w, "Failed to register user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Clear password before returning
	user.PasswordHash = ""

	response := map[string]interface{}{
		"message":    "User registered successfully",
		"user":       user,
		"login_url":  fmt.Sprintf("/auth/login"),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}