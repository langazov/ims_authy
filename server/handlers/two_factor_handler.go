package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/services"
)

type TwoFactorHandler struct {
	twoFactorService *services.TwoFactorService
	userService      *services.UserService
}

type SetupTwoFactorRequest struct {
	UserID string `json:"user_id"`
}

type EnableTwoFactorRequest struct {
	UserID string `json:"user_id"`
	Code   string `json:"code"`
	Secret string `json:"secret"`
}

type VerifyTwoFactorRequest struct {
	UserID string `json:"user_id"`
	Code   string `json:"code"`
}

type DisableTwoFactorRequest struct {
	UserID string `json:"user_id"`
}

type VerifySessionRequest struct {
	SessionID string `json:"session_id"`
	Code      string `json:"code"`
}

func NewTwoFactorHandler(twoFactorService *services.TwoFactorService, userService *services.UserService) *TwoFactorHandler {
	return &TwoFactorHandler{
		twoFactorService: twoFactorService,
		userService:      userService,
	}
}

func (h *TwoFactorHandler) SetupTwoFactor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SetupTwoFactorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	response, err := h.twoFactorService.SetupTwoFactor(req.UserID, "OAuth2 Server")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TwoFactorHandler) EnableTwoFactor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req EnableTwoFactorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.Code == "" || req.Secret == "" {
		http.Error(w, "User ID, code, and secret are required", http.StatusBadRequest)
		return
	}

	err := h.twoFactorService.EnableTwoFactor(req.UserID, req.Code, req.Secret)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Two-factor authentication enabled successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TwoFactorHandler) DisableTwoFactor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DisableTwoFactorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	err := h.twoFactorService.DisableTwoFactor(req.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Two-factor authentication disabled successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TwoFactorHandler) VerifyTwoFactor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyTwoFactorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.Code == "" {
		http.Error(w, "User ID and code are required", http.StatusBadRequest)
		return
	}

	valid, err := h.twoFactorService.VerifyTwoFactor(req.UserID, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"valid":   valid,
		"message": func() string {
			if valid {
				return "Code verified successfully"
			}
			return "Invalid code"
		}(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TwoFactorHandler) VerifySession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifySessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SessionID == "" || req.Code == "" {
		http.Error(w, "Session ID and code are required", http.StatusBadRequest)
		return
	}

	valid, err := h.twoFactorService.VerifyTwoFactorSession(req.SessionID, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"valid":   valid,
		"message": func() string {
			if valid {
				return "Session verified successfully"
			}
			return "Invalid code or session"
		}(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TwoFactorHandler) GetTwoFactorStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	required, err := h.twoFactorService.IsTwoFactorRequired(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"enabled": required,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}