package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"oauth2-openid-server/services"
)

type AuthHandler struct {
	userService       *services.UserService
	oauthService      *services.OAuthService
	socialAuthService *services.SocialAuthService
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthorizeRequest struct {
	ResponseType string `json:"response_type"`
	ClientID     string `json:"client_id"`
	RedirectURI  string `json:"redirect_uri"`
	Scope        string `json:"scope"`
	State        string `json:"state"`
}

func NewAuthHandler(userService *services.UserService, oauthService *services.OAuthService, socialAuthService *services.SocialAuthService) *AuthHandler {
	return &AuthHandler{
		userService:       userService,
		oauthService:      oauthService,
		socialAuthService: socialAuthService,
	}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginReq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.userService.GetUserByEmail(loginReq.Email)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !h.userService.ValidatePassword(user, loginReq.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !user.Active {
		http.Error(w, "Account disabled", http.StatusForbidden)
		return
	}

	response := map[string]interface{}{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"scopes":  user.Scopes,
		"groups":  user.Groups,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		h.showAuthorizePage(w, r)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientID := r.FormValue("client_id")
	redirectURI := r.FormValue("redirect_uri")
	responseType := r.FormValue("response_type")
	scope := r.FormValue("scope")
	state := r.FormValue("state")
	userID := r.FormValue("user_id")
	codeChallenge := r.FormValue("code_challenge")
	codeChallengeMethod := r.FormValue("code_challenge_method")

	if responseType != "code" {
		http.Error(w, "Unsupported response type", http.StatusBadRequest)
		return
	}

	requestedScopes := strings.Fields(scope)

	// Get user's actual permissions from database
	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// Only grant scopes that the user actually has permission for
	var grantedScopes []string
	for _, requestedScope := range requestedScopes {
		for _, userScope := range user.Scopes {
			if requestedScope == userScope {
				grantedScopes = append(grantedScopes, requestedScope)
				break
			}
		}
	}

	// If no valid scopes, grant minimal read access
	if len(grantedScopes) == 0 {
		grantedScopes = []string{"read"}
	}

	code, err := h.oauthService.CreateAuthorizationCode(clientID, userID, redirectURI, grantedScopes, codeChallenge, codeChallengeMethod)
	if err != nil {
		http.Error(w, "Failed to create authorization code", http.StatusInternalServerError)
		return
	}

	redirectURL, err := url.Parse(redirectURI)
	if err != nil {
		http.Error(w, "Invalid redirect URI", http.StatusBadRequest)
		return
	}

	query := redirectURL.Query()
	query.Set("code", code)
	if state != "" {
		query.Set("state", state)
	}
	redirectURL.RawQuery = query.Encode()

	http.Redirect(w, r, redirectURL.String(), http.StatusFound)
}

func (h *AuthHandler) showAuthorizePage(w http.ResponseWriter, r *http.Request) {
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	scope := r.URL.Query().Get("scope")
	state := r.URL.Query().Get("state")
	codeChallenge := r.URL.Query().Get("code_challenge")
	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")

	// Get enabled social providers
	enabledProviders := h.socialAuthService.GetEnabledProviders()
	socialButtons := ""
	
	for _, provider := range enabledProviders {
		providerURL := fmt.Sprintf("/auth/%s/oauth?client_id=%s&redirect_uri=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=%s",
			provider, clientID, redirectURI, scope, state, codeChallenge, codeChallengeMethod)
		
		var buttonClass, buttonText string
		switch provider {
		case "google":
			buttonClass = "google-btn"
			buttonText = "Continue with Google"
		case "github":
			buttonClass = "github-btn"
			buttonText = "Continue with GitHub"
		case "facebook":
			buttonClass = "facebook-btn"
			buttonText = "Continue with Facebook"
		case "apple":
			buttonClass = "apple-btn"
			buttonText = "Continue with Apple"
		default:
			buttonClass = "social-btn"
			buttonText = "Continue with " + provider
		}
		
		socialButtons += fmt.Sprintf(`
			<a href="%s" class="social-button %s">%s</a>
		`, providerURL, buttonClass, buttonText)
	}

	socialSection := ""
	if socialButtons != "" {
		socialSection = fmt.Sprintf(`
		<div class="social-section">
			%s
		</div>
		<div class="divider">or sign in with email</div>`, socialButtons)
	}

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>OAuth2 Authorization</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input[type="text"], input[type="email"], input[type="password"] { width: 100%%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
        button:hover { background: #005a87; }
        .scopes { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007cba; }
        .social-section { margin: 20px 0; }
        .social-button { display: block; width: 100%%; padding: 12px; margin: 8px 0; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 500; border: 1px solid #ddd; }
        .google-btn { background: #4285f4; color: white; border-color: #4285f4; }
        .github-btn { background: #333; color: white; border-color: #333; }
        .facebook-btn { background: #1877f2; color: white; border-color: #1877f2; }
        .apple-btn { background: #000; color: white; border-color: #000; }
        .social-button:hover { opacity: 0.9; text-decoration: none; color: inherit; }
        .divider { text-align: center; margin: 20px 0; color: #666; }
        .button-group { display: flex; gap: 10px; margin-top: 20px; }
        .button-group button { flex: 1; }
        .deny-btn { background: #dc3545; }
        .deny-btn:hover { background: #c82333; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Authorization Required</h2>
        <p>Application is requesting access to your account.</p>
        
        <div class="scopes">
            <strong>Requested permissions:</strong><br>
            %s
        </div>

        %s

        <form method="post">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <input type="hidden" name="client_id" value="%s">
            <input type="hidden" name="redirect_uri" value="%s">
            <input type="hidden" name="response_type" value="code">
            <input type="hidden" name="scope" value="%s">
            <input type="hidden" name="state" value="%s">
            <input type="hidden" name="code_challenge" value="%s">
            <input type="hidden" name="code_challenge_method" value="%s">
            <input type="hidden" name="user_id" id="user_id">
            
            <div class="button-group">
                <button type="button" onclick="authorize()">Authorize</button>
                <button type="button" onclick="deny()" class="deny-btn">Deny</button>
            </div>
        </form>

    <script>
        async function authorize() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const userData = await response.json();
                    document.getElementById('user_id').value = userData.user_id;
                    document.querySelector('form').submit();
                } else {
                    alert('Invalid credentials');
                }
            } catch (error) {
                alert('Login failed');
            }
        }

        function deny() {
            const redirectUri = '%s';
            const state = '%s';
            let url = redirectUri + '?error=access_denied';
            if (state) url += '&state=' + encodeURIComponent(state);
            window.location.href = url;
        }
    </script>
    </div>
</body>
</html>`,
        scope,
        socialSection,
        clientID, redirectURI, scope, state, codeChallenge, codeChallengeMethod,
        redirectURI, state)

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (h *AuthHandler) Token(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	grantType := r.FormValue("grant_type")
	if grantType != "authorization_code" {
		http.Error(w, "Unsupported grant type", http.StatusBadRequest)
		return
	}

	code := r.FormValue("code")
	clientID := r.FormValue("client_id")
	clientSecret := r.FormValue("client_secret")
	codeVerifier := r.FormValue("code_verifier")
	redirectURI := r.FormValue("redirect_uri")

	var tokenResponse *services.TokenResponse
	var err error

	// Support both PKCE (code_verifier) and traditional (client_secret) flows
	if codeVerifier != "" {
		tokenResponse, err = h.oauthService.ExchangeCodeForTokensPKCE(code, clientID, codeVerifier, redirectURI)
	} else {
		tokenResponse, err = h.oauthService.ExchangeCodeForTokens(code, clientID, clientSecret, redirectURI)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResponse)
}