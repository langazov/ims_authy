package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"oauth2-openid-server/config"
	"oauth2-openid-server/middleware"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type SocialAuthHandler struct {
	socialAuthService     *services.SocialAuthService
	socialProviderService *services.SocialProviderService
	oauthService          *services.OAuthService
	config                *config.Config
}

type SocialProvidersResponse struct {
	Providers []string `json:"providers"`
}

func NewSocialAuthHandler(socialAuthService *services.SocialAuthService, socialProviderService *services.SocialProviderService, oauthService *services.OAuthService, cfg *config.Config) *SocialAuthHandler {
	return &SocialAuthHandler{
		socialAuthService:     socialAuthService,
		socialProviderService: socialProviderService,
		oauthService:          oauthService,
		config:                cfg,
	}
}

// GetProviders returns the list of enabled social providers
func (h *SocialAuthHandler) GetProviders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)
	providers := h.socialAuthService.GetEnabledProviders(tenantID)
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
	tenantID := middleware.GetTenantIDFromRequest(r)

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
	authURL, err := h.socialAuthService.GetAuthURL(provider, state, tenantID)
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

	// Get tenant ID from request context
	tenantID := middleware.GetTenantIDFromRequest(r)
	if tenantID == "" {
		http.Error(w, "Tenant context required", http.StatusBadRequest)
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
	user, err := h.socialAuthService.HandleCallback(provider, code, state, tenantID)
	if err != nil {
		http.Error(w, "Failed to authenticate with "+provider+": "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get OAuth parameters from cookie (stored during OAuth initiation)
	var originalState, clientID, redirectURI, scope, codeChallenge, codeChallengeMethod string

	if paramsCookie, err := r.Cookie("oauth_params_" + provider); err == nil {
		// Decode the OAuth parameters from cookie
		paramsJSON, err := base64.URLEncoding.DecodeString(paramsCookie.Value)
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				originalState = params["original_state"]
				clientID = params["client_id"]
				redirectURI = params["redirect_uri"]
				scope = params["scope"]
				codeChallenge = params["code_challenge"]
				codeChallengeMethod = params["code_challenge_method"]
			}
		}

		// Clear the OAuth params cookie
		http.SetCookie(w, &http.Cookie{
			Name:   "oauth_params_" + provider,
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})
	}

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
			tenantID,
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

	// Direct social login without OAuth flow - create temporary auth code for frontend
	// Generate a temporary authorization code that the frontend can exchange for tokens
	tempClientID := "direct-social-login"
	tempRedirectURI := h.config.WebBaseURL + "/callback" // Frontend callback page
	tempScopes := []string{"read", "openid", "profile", "email"}

	authCode, err := h.oauthService.CreateAuthorizationCode(
		tempClientID,
		user.ID.Hex(),
		tenantID,
		tempRedirectURI,
		tempScopes,
		"", // no code challenge for direct login
		"",
	)
	if err != nil {
		http.Error(w, "Failed to create authorization code", http.StatusInternalServerError)
		return
	}

	// Redirect to frontend with the authorization code
	redirectURL := fmt.Sprintf("%s/callback?code=%s&state=direct-social-login&provider=%s&tenant_id=%s",
		h.config.WebBaseURL, authCode, provider, tenantID)

	http.Redirect(w, r, redirectURL, http.StatusFound)
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
		"original_state":        state,
		"client_id":             clientID,
		"redirect_uri":          redirectURI,
		"scope":                 scope,
		"code_challenge":        codeChallenge,
		"code_challenge_method": codeChallengeMethod,
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
	tenantID := middleware.GetTenantIDFromRequest(r)
	authURL, err := h.socialAuthService.GetAuthURL(provider, socialState, tenantID)
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
	Enabled      bool   `json:"enabled"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RedirectURL  string `json:"redirectUrl"`
}

// GetProviderConfigs returns the configuration of all social providers
func (h *SocialAuthHandler) GetProviderConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)

	// Get providers from database for this tenant
	providers, err := h.socialProviderService.GetAllProviders(tenantID)
	if err != nil {
		http.Error(w, "Failed to get providers", http.StatusInternalServerError)
		return
	}

	configs := []ProviderConfig{}
	for _, provider := range providers {
		config := ProviderConfig{
			ID:          provider.Name,
			Name:        provider.DisplayName,
			Enabled:     provider.Enabled,
			ClientID:    provider.ClientID,
			RedirectURL: provider.RedirectURL,
			Scopes:      provider.Scopes,
			AuthURL:     provider.AuthURL,
			TokenURL:    provider.TokenURL,
			UserInfoURL: provider.UserInfoURL,
			Configured:  provider.ClientID != "" && provider.ClientSecret != "",
		}
		configs = append(configs, config)
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
	tenantID := middleware.GetTenantIDFromRequest(r)

	var req UpdateProviderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get the existing provider from database for this tenant
	existingProvider, err := h.socialProviderService.GetProviderByName(provider, tenantID)
	if err != nil {
		http.Error(w, "Provider not found", http.StatusNotFound)
		return
	}

	// Update the provider with new values
	existingProvider.Enabled = req.Enabled
	existingProvider.ClientID = req.ClientID
	if req.ClientSecret != "" {
		existingProvider.ClientSecret = req.ClientSecret
	}
	if req.RedirectURL != "" {
		existingProvider.RedirectURL = req.RedirectURL
	}

	// Save to database
	err = h.socialProviderService.UpdateProvider(existingProvider.ID.Hex(), tenantID, existingProvider)
	if err != nil {
		http.Error(w, "Failed to update provider configuration: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success":  true,
		"message":  "Provider configuration updated successfully",
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
	tenantID := middleware.GetTenantIDFromRequest(r)

	// Basic validation
	isConfigured := h.socialAuthService.IsProviderConfigured(provider, tenantID)

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
