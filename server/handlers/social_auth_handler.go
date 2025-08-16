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