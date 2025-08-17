package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SimpleTokenResponse represents a simple OAuth token response
type SimpleTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type SocialAuthService struct {
	userService         *UserService
	db                  *database.MongoDB
	socialProviderService *SocialProviderService
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

func NewSocialAuthService(userService *UserService, db *database.MongoDB) *SocialAuthService {
	return &SocialAuthService{
		userService:         userService,
		db:                  db,
		socialProviderService: NewSocialProviderService(db),
	}
}

// GetAuthURL generates the OAuth authorization URL for the specified provider
func (s *SocialAuthService) GetAuthURL(provider, state, tenantID string) (string, error) {
	socialProvider, err := s.socialProviderService.GetProviderByName(provider, tenantID)
	if err != nil {
		return "", fmt.Errorf("provider '%s' not found", provider)
	}

	if !socialProvider.Enabled {
		return "", fmt.Errorf("provider '%s' is not enabled", provider)
	}

	if socialProvider.ClientID == "" || socialProvider.ClientSecret == "" {
		return "", fmt.Errorf("provider '%s' is not properly configured", provider)
	}

	return s.buildAuthURL(socialProvider, state), nil
}

// buildAuthURL constructs the OAuth authorization URL
func (s *SocialAuthService) buildAuthURL(provider *models.SocialProvider, state string) string {
	params := url.Values{}
	params.Add("client_id", provider.ClientID)
	params.Add("redirect_uri", provider.RedirectURL)
	params.Add("state", state)
	params.Add("response_type", "code")

	// Add scopes
	if len(provider.Scopes) > 0 {
		params.Add("scope", strings.Join(provider.Scopes, " "))
	}

	// Provider-specific parameters
	switch provider.Name {
	case "google":
		params.Add("access_type", "offline")
		params.Add("prompt", "consent")
	case "apple":
		params.Add("response_mode", "form_post")
	}

	return fmt.Sprintf("%s?%s", provider.AuthURL, params.Encode())
}

// HandleCallback processes the OAuth callback and returns user information
func (s *SocialAuthService) HandleCallback(provider, code, state, tenantID string) (*models.User, error) {
	socialProvider, err := s.socialProviderService.GetProviderByName(provider, tenantID)
	if err != nil {
		return nil, fmt.Errorf("provider '%s' not found", provider)
	}

	if !socialProvider.Enabled {
		return nil, fmt.Errorf("provider '%s' is not enabled", provider)
	}

	return s.handleProviderCallback(socialProvider, code, state)
}

// handleProviderCallback handles OAuth callback for any provider
func (s *SocialAuthService) handleProviderCallback(provider *models.SocialProvider, code, state string) (*models.User, error) {
	// Exchange code for access token
	tokenResp, err := s.exchangeCodeForToken(provider, code)
	if err != nil {
		return nil, err
	}

	// Get user info from provider
	userInfo, err := s.getUserInfo(provider, tokenResp.AccessToken)
	if err != nil {
		return nil, err
	}

	// Create or get existing user
	return s.createOrGetSocialUser(userInfo, provider.Name)
}


// exchangeCodeForToken exchanges authorization code for access token
func (s *SocialAuthService) exchangeCodeForToken(provider *models.SocialProvider, code string) (*SimpleTokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", provider.ClientID)
	data.Set("client_secret", provider.ClientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", provider.RedirectURL)

	var req *http.Request
	var err error

	if provider.Name == "github" {
		req, err = http.NewRequest("POST", provider.TokenURL, strings.NewReader(data.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	} else {
		resp, err := http.PostForm(provider.TokenURL, data)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		var tokenResp SimpleTokenResponse
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			return nil, err
		}
		return &tokenResp, nil
	}

	// Handle GitHub-specific token exchange
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp SimpleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// getUserInfo gets user information from the provider
func (s *SocialAuthService) getUserInfo(provider *models.SocialProvider, accessToken string) (*SocialUserInfo, error) {
	req, err := http.NewRequest("GET", provider.UserInfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	// Parse user info based on provider
	return s.parseUserInfo(userInfo, provider.Name, accessToken)
}

// parseUserInfo parses user information from different providers
func (s *SocialAuthService) parseUserInfo(data map[string]interface{}, providerName, accessToken string) (*SocialUserInfo, error) {
	userInfo := &SocialUserInfo{
		Provider: providerName,
	}

	switch providerName {
	case "google":
		if id, ok := data["id"].(string); ok {
			userInfo.ID = id
		}
		if email, ok := data["email"].(string); ok {
			userInfo.Email = email
		}
		if name, ok := data["name"].(string); ok {
			userInfo.Name = name
		}
		if givenName, ok := data["given_name"].(string); ok {
			userInfo.FirstName = givenName
		}
		if familyName, ok := data["family_name"].(string); ok {
			userInfo.LastName = familyName
		}

	case "github":
		if id, ok := data["id"].(float64); ok {
			userInfo.ID = fmt.Sprintf("%.0f", id)
		}
		if _, ok := data["login"].(string); ok && userInfo.Email == "" {
			// GitHub might not return email in user info, need to fetch separately
			email := s.getGitHubUserEmail(accessToken)
			userInfo.Email = email
		}
		if email, ok := data["email"].(string); ok && email != "" {
			userInfo.Email = email
		}
		if name, ok := data["name"].(string); ok {
			userInfo.Name = name
			firstName, lastName := s.parseName(name)
			userInfo.FirstName = firstName
			userInfo.LastName = lastName
		}

	case "facebook":
		if id, ok := data["id"].(string); ok {
			userInfo.ID = id
		}
		if email, ok := data["email"].(string); ok {
			userInfo.Email = email
		}
		if name, ok := data["name"].(string); ok {
			userInfo.Name = name
		}
		if firstName, ok := data["first_name"].(string); ok {
			userInfo.FirstName = firstName
		}
		if lastName, ok := data["last_name"].(string); ok {
			userInfo.LastName = lastName
		}

	default:
		return nil, fmt.Errorf("unsupported provider: %s", providerName)
	}

	return userInfo, nil
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



// Helper function to create or get existing social user
func (s *SocialAuthService) createOrGetSocialUser(socialUser *SocialUserInfo, provider string) (*models.User, error) {
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
func (s *SocialAuthService) GetEnabledProviders(tenantID string) []string {
	providers, err := s.socialProviderService.GetEnabledProviders(tenantID)
	if err != nil {
		return []string{}
	}

	var enabledProviderNames []string
	for _, provider := range providers {
		enabledProviderNames = append(enabledProviderNames, provider.Name)
	}

	return enabledProviderNames
}

// IsProviderEnabled checks if a specific provider is enabled
func (s *SocialAuthService) IsProviderEnabled(provider, tenantID string) bool {
	enabled, err := s.socialProviderService.IsProviderEnabled(provider, tenantID)
	if err != nil {
		return false
	}
	return enabled
}

// GetProviderClientID returns the client ID for a specific provider
func (s *SocialAuthService) GetProviderClientID(provider, tenantID string) string {
	socialProvider, err := s.socialProviderService.GetProviderByName(provider, tenantID)
	if err != nil {
		return ""
	}
	return socialProvider.ClientID
}

// IsProviderConfigured checks if a provider has all required configuration
func (s *SocialAuthService) IsProviderConfigured(provider, tenantID string) bool {
	socialProvider, err := s.socialProviderService.GetProviderByName(provider, tenantID)
	if err != nil {
		return false
	}
	return socialProvider.ClientID != "" && socialProvider.ClientSecret != ""
}