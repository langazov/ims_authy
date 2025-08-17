package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SocialAuthService struct {
	config      *config.Config
	userService *UserService
	db          *database.MongoDB
}

type SocialUserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
}

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

type GitHubUserInfo struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type FacebookUserInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func NewSocialAuthService(config *config.Config, userService *UserService, db *database.MongoDB) *SocialAuthService {
	return &SocialAuthService{
		config:      config,
		userService: userService,
		db:          db,
	}
}

// GetAuthURL generates the OAuth authorization URL for the specified provider
func (s *SocialAuthService) GetAuthURL(provider, state string) (string, error) {
	switch provider {
	case "google":
		if !s.config.Google.Enabled {
			return "", errors.New("Google OAuth is not configured")
		}
		return s.getGoogleAuthURL(state), nil
	case "github":
		if !s.config.GitHub.Enabled {
			return "", errors.New("GitHub OAuth is not configured")
		}
		return s.getGitHubAuthURL(state), nil
	case "facebook":
		if !s.config.Facebook.Enabled {
			return "", errors.New("Facebook OAuth is not configured")
		}
		return s.getFacebookAuthURL(state), nil
	case "apple":
		if !s.config.Apple.Enabled {
			return "", errors.New("Apple OAuth is not configured")
		}
		return s.getAppleAuthURL(state), nil
	default:
		return "", errors.New("unsupported OAuth provider")
	}
}

// HandleCallback processes the OAuth callback and returns user information
func (s *SocialAuthService) HandleCallback(provider, code, state string) (*models.User, error) {
	switch provider {
	case "google":
		return s.handleGoogleCallback(code, state)
	case "github":
		return s.handleGitHubCallback(code, state)
	case "facebook":
		return s.handleFacebookCallback(code, state)
	case "apple":
		return s.handleAppleCallback(code, state)
	default:
		return nil, errors.New("unsupported OAuth provider")
	}
}

// Google OAuth implementation
func (s *SocialAuthService) getGoogleAuthURL(state string) string {
	baseURL := "https://accounts.google.com/o/oauth2/v2/auth"
	params := url.Values{}
	params.Add("client_id", s.config.Google.ClientID)
	params.Add("redirect_uri", s.config.Google.RedirectURL)
	params.Add("scope", "openid email profile")
	params.Add("response_type", "code")
	params.Add("state", state)
	params.Add("access_type", "offline")
	params.Add("prompt", "consent")

	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (s *SocialAuthService) handleGoogleCallback(code, state string) (*models.User, error) {
	// Exchange code for access token
	tokenURL := "https://oauth2.googleapis.com/token"
	data := url.Values{}
	data.Set("client_id", s.config.Google.ClientID)
	data.Set("client_secret", s.config.Google.ClientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", s.config.Google.RedirectURL)

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	// Get user info from Google
	userInfoURL := "https://www.googleapis.com/oauth2/v2/userinfo"
	req, _ := http.NewRequest("GET", userInfoURL, nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var googleUser GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		return nil, err
	}

	// Create or get existing user
	return s.createOrGetSocialUser(SocialUserInfo{
		ID:        googleUser.ID,
		Email:     googleUser.Email,
		FirstName: googleUser.GivenName,
		LastName:  googleUser.FamilyName,
		Name:      googleUser.Name,
		Provider:  "google",
	})
}

// GitHub OAuth implementation
func (s *SocialAuthService) getGitHubAuthURL(state string) string {
	baseURL := "https://github.com/login/oauth/authorize"
	params := url.Values{}
	params.Add("client_id", s.config.GitHub.ClientID)
	params.Add("redirect_uri", s.config.GitHub.RedirectURL)
	params.Add("scope", "user:email")
	params.Add("state", state)

	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (s *SocialAuthService) handleGitHubCallback(code, state string) (*models.User, error) {
	// Exchange code for access token
	tokenURL := "https://github.com/login/oauth/access_token"
	data := url.Values{}
	data.Set("client_id", s.config.GitHub.ClientID)
	data.Set("client_secret", s.config.GitHub.ClientSecret)
	data.Set("code", code)

	req, _ := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	// Get user info from GitHub
	userInfoURL := "https://api.github.com/user"
	req, _ = http.NewRequest("GET", userInfoURL, nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	resp, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var githubUser GitHubUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&githubUser); err != nil {
		return nil, err
	}

	// Get email separately (GitHub might not include it in user info)
	if githubUser.Email == "" {
		githubUser.Email = s.getGitHubUserEmail(tokenResp.AccessToken)
	}

	// Parse name
	firstName, lastName := s.parseName(githubUser.Name)

	return s.createOrGetSocialUser(SocialUserInfo{
		ID:        fmt.Sprintf("%d", githubUser.ID),
		Email:     githubUser.Email,
		FirstName: firstName,
		LastName:  lastName,
		Name:      githubUser.Name,
		Provider:  "github",
	})
}

func (s *SocialAuthService) getGitHubUserEmail(accessToken string) string {
	emailURL := "https://api.github.com/user/emails"
	req, _ := http.NewRequest("GET", emailURL, nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return ""
	}

	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email
		}
	}

	if len(emails) > 0 {
		return emails[0].Email
	}

	return ""
}

// Facebook OAuth implementation
func (s *SocialAuthService) getFacebookAuthURL(state string) string {
	baseURL := "https://www.facebook.com/v18.0/dialog/oauth"
	params := url.Values{}
	params.Add("client_id", s.config.Facebook.ClientID)
	params.Add("redirect_uri", s.config.Facebook.RedirectURL)
	params.Add("scope", "email")
	params.Add("response_type", "code")
	params.Add("state", state)

	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (s *SocialAuthService) handleFacebookCallback(code, state string) (*models.User, error) {
	// Exchange code for access token
	tokenURL := "https://graph.facebook.com/v18.0/oauth/access_token"
	params := url.Values{}
	params.Add("client_id", s.config.Facebook.ClientID)
	params.Add("client_secret", s.config.Facebook.ClientSecret)
	params.Add("code", code)
	params.Add("redirect_uri", s.config.Facebook.RedirectURL)

	resp, err := http.Get(fmt.Sprintf("%s?%s", tokenURL, params.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	// Get user info from Facebook
	userInfoURL := "https://graph.facebook.com/me?fields=id,name,email,first_name,last_name"
	req, _ := http.NewRequest("GET", userInfoURL, nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var facebookUser FacebookUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&facebookUser); err != nil {
		return nil, err
	}

	return s.createOrGetSocialUser(SocialUserInfo{
		ID:        facebookUser.ID,
		Email:     facebookUser.Email,
		FirstName: facebookUser.FirstName,
		LastName:  facebookUser.LastName,
		Name:      facebookUser.Name,
		Provider:  "facebook",
	})
}

// Apple OAuth implementation (simplified - Apple requires more complex JWT handling)
func (s *SocialAuthService) getAppleAuthURL(state string) string {
	baseURL := "https://appleid.apple.com/auth/authorize"
	params := url.Values{}
	params.Add("client_id", s.config.Apple.ClientID)
	params.Add("redirect_uri", s.config.Apple.RedirectURL)
	params.Add("scope", "name email")
	params.Add("response_type", "code")
	params.Add("state", state)
	params.Add("response_mode", "form_post")

	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (s *SocialAuthService) handleAppleCallback(code, state string) (*models.User, error) {
	// Apple OAuth requires more complex implementation with JWT validation
	// For now, return an error indicating it needs additional setup
	return nil, errors.New("Apple OAuth requires additional JWT configuration")
}

// Helper function to create or get existing social user
func (s *SocialAuthService) createOrGetSocialUser(socialUser SocialUserInfo) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if user already exists by email
	if existingUser, err := s.userService.GetUserByEmail(socialUser.Email); err == nil {
		// User exists, update provider info if needed
		return existingUser, nil
	}

	// Create new user from social login
	user := &models.User{
		ID:           primitive.NewObjectID(),
		Email:        socialUser.Email,
		Username:     socialUser.Email, // Use email as username for social users
		FirstName:    socialUser.FirstName,
		LastName:     socialUser.LastName,
		Groups:       []string{"social-users", socialUser.Provider + "-users"},
		Scopes:       []string{"read", "openid", "profile", "email"},
		Active:       true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		PasswordHash: "", // No password for social users
	}

	collection := s.db.GetCollection("users")
	_, err := collection.InsertOne(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Helper function to parse full name into first and last name
func (s *SocialAuthService) parseName(fullName string) (string, string) {
	if fullName == "" {
		return "", ""
	}

	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}

	firstName := parts[0]
	lastName := strings.Join(parts[1:], " ")
	return firstName, lastName
}

// GetEnabledProviders returns a list of enabled social providers
func (s *SocialAuthService) GetEnabledProviders() []string {
	var providers []string

	if s.config.Google.Enabled {
		providers = append(providers, "google")
	}
	if s.config.GitHub.Enabled {
		providers = append(providers, "github")
	}
	if s.config.Facebook.Enabled {
		providers = append(providers, "facebook")
	}
	if s.config.Apple.Enabled {
		providers = append(providers, "apple")
	}

	return providers
}

// IsProviderEnabled checks if a specific provider is enabled
func (s *SocialAuthService) IsProviderEnabled(provider string) bool {
	switch provider {
	case "google":
		return s.config.Google.Enabled
	case "github":
		return s.config.GitHub.Enabled
	case "facebook":
		return s.config.Facebook.Enabled
	case "apple":
		return s.config.Apple.Enabled
	default:
		return false
	}
}

// GetProviderClientID returns the client ID for a specific provider
func (s *SocialAuthService) GetProviderClientID(provider string) string {
	switch provider {
	case "google":
		return s.config.Google.ClientID
	case "github":
		return s.config.GitHub.ClientID
	case "facebook":
		return s.config.Facebook.ClientID
	case "apple":
		return s.config.Apple.ClientID
	default:
		return ""
	}
}

// IsProviderConfigured checks if a provider has all required configuration
func (s *SocialAuthService) IsProviderConfigured(provider string) bool {
	switch provider {
	case "google":
		return s.config.Google.ClientID != "" && s.config.Google.ClientSecret != ""
	case "github":
		return s.config.GitHub.ClientID != "" && s.config.GitHub.ClientSecret != ""
	case "facebook":
		return s.config.Facebook.ClientID != "" && s.config.Facebook.ClientSecret != ""
	case "apple":
		return s.config.Apple.ClientID != "" && s.config.Apple.ClientSecret != ""
	default:
		return false
	}
}