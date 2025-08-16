package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"oauth2-openid-server/services"
)

type AuthHandler struct {
	userService  *services.UserService
	oauthService *services.OAuthService
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

func NewAuthHandler(userService *services.UserService, oauthService *services.OAuthService) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		oauthService: oauthService,
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

	if responseType != "code" {
		http.Error(w, "Unsupported response type", http.StatusBadRequest)
		return
	}

	scopes := strings.Fields(scope)

	code, err := h.oauthService.CreateAuthorizationCode(clientID, userID, redirectURI, scopes)
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

	html := `
<!DOCTYPE html>
<html>
<head>
    <title>OAuth2 Authorization</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="email"], input[type="password"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .scopes { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <h2>Authorization Required</h2>
    <p>Application is requesting access to your account.</p>
    
    <div class="scopes">
        <strong>Requested permissions:</strong><br>
        ` + scope + `
    </div>

    <form method="post">
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
        </div>
        
        <input type="hidden" name="client_id" value="` + clientID + `">
        <input type="hidden" name="redirect_uri" value="` + redirectURI + `">
        <input type="hidden" name="response_type" value="code">
        <input type="hidden" name="scope" value="` + scope + `">
        <input type="hidden" name="state" value="` + state + `">
        <input type="hidden" name="user_id" id="user_id">
        
        <button type="button" onclick="authorize()">Authorize</button>
        <button type="button" onclick="deny()">Deny</button>
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
            const redirectUri = '` + redirectURI + `';
            const state = '` + state + `';
            let url = redirectUri + '?error=access_denied';
            if (state) url += '&state=' + encodeURIComponent(state);
            window.location.href = url;
        }
    </script>
</body>
</html>`

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
	redirectURI := r.FormValue("redirect_uri")

	tokenResponse, err := h.oauthService.ExchangeCodeForTokens(code, clientID, clientSecret, redirectURI)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResponse)
}