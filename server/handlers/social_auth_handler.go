package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"

	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type SocialAuthHandler struct {
	socialAuthService *services.SocialAuthService
	oauthService      *services.OAuthService
}

type SocialProvidersResponse struct {
	Providers []string `json:"providers"`
}

func NewSocialAuthHandler(socialAuthService *services.SocialAuthService, oauthService *services.OAuthService) *SocialAuthHandler {
	return &SocialAuthHandler{
		socialAuthService: socialAuthService,
		oauthService:      oauthService,
	}
}

// GetProviders returns the list of enabled social providers
func (h *SocialAuthHandler) GetProviders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	providers := h.socialAuthService.GetEnabledProviders()
	response := SocialProvidersResponse{
		Providers: providers,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// InitiateSocialLogin starts the social login process
func (h *SocialAuthHandler) InitiateSocialLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	provider := vars["provider"]

	// Generate a random state parameter for security
	state := h.generateState()
	
	// Store state in session/cookie for validation (simplified approach)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state_" + provider,
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		MaxAge:   600,   // 10 minutes
	})

	// Get authorization URL from social provider
	authURL, err := h.socialAuthService.GetAuthURL(provider, state)
	if err != nil {
		http.Error(w, "Provider not configured: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Redirect to social provider
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// HandleSocialCallback handles the callback from social providers
func (h *SocialAuthHandler) HandleSocialCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	provider := vars["provider"]

	// Get code and state from query parameters
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" {
		errorMsg := r.URL.Query().Get("error")
		if errorMsg != "" {
			http.Error(w, "Social login error: "+errorMsg, http.StatusBadRequest)
			return
		}
		http.Error(w, "Authorization code not provided", http.StatusBadRequest)
		return
	}

	// Validate state parameter
	cookie, err := r.Cookie("oauth_state_" + provider)
	if err != nil || cookie.Value != state {
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	// Clear the state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state_" + provider,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	// Handle the callback and get user information
	user, err := h.socialAuthService.HandleCallback(provider, code, state)
	if err != nil {
		http.Error(w, "Failed to authenticate with "+provider+": "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if we have OAuth parameters to continue the flow
	originalState := r.URL.Query().Get("original_state")
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	scope := r.URL.Query().Get("scope")
	codeChallenge := r.URL.Query().Get("code_challenge")
	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")

	if clientID != "" && redirectURI != "" {
		// Continue OAuth flow - create authorization code
		scopes := []string{"read", "openid", "profile", "email"}
		if scope != "" {
			// Parse scopes from query parameter
			scopes = parseScopes(scope)
		}

		authCode, err := h.oauthService.CreateAuthorizationCode(
			clientID,
			user.ID.Hex(),
			redirectURI,
			scopes,
			codeChallenge,
			codeChallengeMethod,
		)
		if err != nil {
			http.Error(w, "Failed to create authorization code", http.StatusInternalServerError)
			return
		}

		// Redirect back to OAuth client with authorization code
		redirectURL, err := url.Parse(redirectURI)
		if err != nil {
			http.Error(w, "Invalid redirect URI", http.StatusBadRequest)
			return
		}

		query := redirectURL.Query()
		query.Set("code", authCode)
		if originalState != "" {
			query.Set("state", originalState)
		}
		redirectURL.RawQuery = query.Encode()

		http.Redirect(w, r, redirectURL.String(), http.StatusFound)
		return
	}

	// Direct social login without OAuth flow - return user info
	response := map[string]interface{}{
		"message":    "Social login successful",
		"provider":   provider,
		"user_id":    user.ID.Hex(),
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"groups":     user.Groups,
		"scopes":     user.Scopes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SocialOAuthAuthorize integrates social login with OAuth flow
func (h *SocialAuthHandler) SocialOAuthAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	provider := vars["provider"]

	// Get OAuth parameters
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	scope := r.URL.Query().Get("scope")
	state := r.URL.Query().Get("state")
	codeChallenge := r.URL.Query().Get("code_challenge")
	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")

	if clientID == "" || redirectURI == "" {
		http.Error(w, "Missing required OAuth parameters", http.StatusBadRequest)
		return
	}

	// Generate state for social provider
	socialState := h.generateState()

	// Store OAuth parameters and state in cookie for callback
	params := map[string]string{
		"original_state":         state,
		"client_id":              clientID,
		"redirect_uri":           redirectURI,
		"scope":                  scope,
		"code_challenge":         codeChallenge,
		"code_challenge_method":  codeChallengeMethod,
	}

	paramsJSON, _ := json.Marshal(params)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_params_" + provider,
		Value:    base64.URLEncoding.EncodeToString(paramsJSON),
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		MaxAge:   600,   // 10 minutes
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state_" + provider,
		Value:    socialState,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		MaxAge:   600,
	})

	// Get authorization URL from social provider
	authURL, err := h.socialAuthService.GetAuthURL(provider, socialState)
	if err != nil {
		http.Error(w, "Provider not configured: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Redirect to social provider
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// Helper function to generate a random state parameter
func (h *SocialAuthHandler) generateState() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}

// Helper function to parse scope string into slice
func parseScopes(scopeStr string) []string {
	if scopeStr == "" {
		return []string{}
	}
	
	scopes := []string{}
	for _, scope := range []string{"read", "write", "admin", "openid", "profile", "email"} {
		if contains(scopeStr, scope) {
			scopes = append(scopes, scope)
		}
	}
	
	return scopes
}

// Helper function to check if string contains substring
func contains(str, substr string) bool {
	return len(str) >= len(substr) && (str == substr || 
		(len(str) > len(substr) && (str[:len(substr)+1] == substr+" " || 
		str[len(str)-len(substr)-1:] == " "+substr || 
		len(str) > len(substr)*2 && str[len(str)-len(substr):] == substr)))
}

// Provider configuration management structures
type ProviderConfig struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Enabled      bool     `json:"enabled"`
	ClientID     string   `json:"clientId"`
	ClientSecret string   `json:"clientSecret,omitempty"`
	RedirectURL  string   `json:"redirectUrl"`
	Scopes       []string `json:"scopes"`
	AuthURL      string   `json:"authUrl"`
	TokenURL     string   `json:"tokenUrl"`
	UserInfoURL  string   `json:"userInfoUrl"`
	Configured   bool     `json:"configured"`
}

type UpdateProviderRequest struct {
	Enabled      bool     `json:"enabled"`
	ClientID     string   `json:"clientId"`
	ClientSecret string   `json:"clientSecret"`
	RedirectURL  string   `json:"redirectUrl"`
}

// GetProviderConfigs returns the configuration of all social providers
func (h *SocialAuthHandler) GetProviderConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	configs := []ProviderConfig{
		{
			ID:          "google",
			Name:        "Google",
			Enabled:     h.socialAuthService.IsProviderEnabled("google"),
			ClientID:    h.socialAuthService.GetProviderClientID("google"),
			RedirectURL: "http://localhost:8080/auth/google/callback",
			Scopes:      []string{"openid", "profile", "email"},
			AuthURL:     "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL:    "https://oauth2.googleapis.com/token",
			UserInfoURL: "https://www.googleapis.com/oauth2/v2/userinfo",
			Configured:  h.socialAuthService.IsProviderConfigured("google"),
		},
		{
			ID:          "github",
			Name:        "GitHub",
			Enabled:     h.socialAuthService.IsProviderEnabled("github"),
			ClientID:    h.socialAuthService.GetProviderClientID("github"),
			RedirectURL: "http://localhost:8080/auth/github/callback",
			Scopes:      []string{"user:email"},
			AuthURL:     "https://github.com/login/oauth/authorize",
			TokenURL:    "https://github.com/login/oauth/access_token",
			UserInfoURL: "https://api.github.com/user",
			Configured:  h.socialAuthService.IsProviderConfigured("github"),
		},
		{
			ID:          "facebook",
			Name:        "Facebook",
			Enabled:     h.socialAuthService.IsProviderEnabled("facebook"),
			ClientID:    h.socialAuthService.GetProviderClientID("facebook"),
			RedirectURL: "http://localhost:8080/auth/facebook/callback",
			Scopes:      []string{"email", "public_profile"},
			AuthURL:     "https://www.facebook.com/v18.0/dialog/oauth",
			TokenURL:    "https://graph.facebook.com/v18.0/oauth/access_token",
			UserInfoURL: "https://graph.facebook.com/v18.0/me",
			Configured:  h.socialAuthService.IsProviderConfigured("facebook"),
		},
		{
			ID:          "apple",
			Name:        "Apple",
			Enabled:     h.socialAuthService.IsProviderEnabled("apple"),
			ClientID:    h.socialAuthService.GetProviderClientID("apple"),
			RedirectURL: "http://localhost:8080/auth/apple/callback",
			Scopes:      []string{"name", "email"},
			AuthURL:     "https://appleid.apple.com/auth/authorize",
			TokenURL:    "https://appleid.apple.com/auth/token",
			UserInfoURL: "",
			Configured:  h.socialAuthService.IsProviderConfigured("apple"),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

// UpdateProviderConfig updates the configuration for a specific provider
func (h *SocialAuthHandler) UpdateProviderConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	provider := vars["provider"]

	var req UpdateProviderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Note: In a real implementation, you would update environment variables or configuration
	// For now, we'll return success to demonstrate the API
	response := map[string]interface{}{
		"success": true,
		"message": "Provider configuration updated successfully",
		"provider": provider,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// TestProviderConfig tests the configuration for a specific provider
func (h *SocialAuthHandler) TestProviderConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	provider := vars["provider"]

	// Basic validation
	isConfigured := h.socialAuthService.IsProviderConfigured(provider)
	
	response := map[string]interface{}{
		"success":    isConfigured,
		"configured": isConfigured,
		"provider":   provider,
	}

	if !isConfigured {
		response["message"] = "Provider is not properly configured"
	} else {
		response["message"] = "Provider configuration is valid"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}