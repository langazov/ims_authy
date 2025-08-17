package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type UserHandler struct {
	userService *services.UserService
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

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

	// Check if user already exists
	if existingUser, _ := h.userService.GetUserByEmail(createReq.Email); existingUser != nil {
		http.Error(w, "User with this email already exists", http.StatusConflict)
		return
	}

	// Set default scopes if none provided
	if len(createReq.Scopes) == 0 {
		createReq.Scopes = []string{"read", "openid", "profile", "email"}
	}

	user := &models.User{
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

	users, err := h.userService.GetAllUsers()
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

	vars := mux.Vars(r)
	userID := vars["id"]

	user, err := h.userService.GetUserByID(userID)
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

	vars := mux.Vars(r)
	userID := vars["id"]

	var updateReq UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user := &models.User{
		Email:     updateReq.Email,
		Username:  updateReq.Username,
		FirstName: updateReq.FirstName,
		LastName:  updateReq.LastName,
		Groups:    updateReq.Groups,
		Active:    updateReq.Active,
		Scopes:    updateReq.Scopes,
	}

	if err := h.userService.UpdateUser(userID, user); err != nil {
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

	vars := mux.Vars(r)
	userID := vars["id"]

	if err := h.userService.DeleteUser(userID); err != nil {
		http.Error(w, "Failed to delete user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}