package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type OAuthService struct {
	db                  *database.MongoDB
	clientCollection    *mongo.Collection
	codeCollection      *mongo.Collection
	tokenCollection     *mongo.Collection
	refreshCollection   *mongo.Collection
	jwtSecret           string
	accessTokenExpiry   time.Duration
	refreshTokenExpiry  time.Duration
	authCodeExpiry      time.Duration
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

type Claims struct {
	UserID   string   `json:"user_id"`
	TenantID string   `json:"tenant_id"`
	ClientID string   `json:"client_id"`
	Scopes   []string `json:"scopes"`
	jwt.RegisteredClaims
}

// IDTokenClaims represents claims for OpenID Connect ID tokens
type IDTokenClaims struct {
	UserID   string   `json:"sub"`
	TenantID string   `json:"tenant_id"`
	Email    string   `json:"email"`
	Groups   []string `json:"groups"`
	Scopes   []string `json:"scopes"`
	jwt.RegisteredClaims
}

func NewOAuthService(db *database.MongoDB, jwtSecret string) *OAuthService {
	return &OAuthService{
		db:                  db,
		clientCollection:    db.GetCollection("clients"),
		codeCollection:      db.GetCollection("authorization_codes"),
		tokenCollection:     db.GetCollection("access_tokens"),
		refreshCollection:   db.GetCollection("refresh_tokens"),
		jwtSecret:           jwtSecret,
		accessTokenExpiry:   time.Hour * 1,
		refreshTokenExpiry:  time.Hour * 24 * 30,
		authCodeExpiry:      time.Minute * 10,
	}
}

func (s *OAuthService) ValidateClient(clientID, clientSecret string) (*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var client models.Client
	err := s.clientCollection.FindOne(ctx, bson.M{
		"client_id":     clientID,
		"client_secret": clientSecret,
		"active":        true,
	}).Decode(&client)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("invalid client credentials")
		}
		return nil, err
	}

	return &client, nil
}

func (s *OAuthService) CreateAuthorizationCode(clientID, userID, tenantID, redirectURI string, scopes []string, codeChallenge, codeChallengeMethod string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	code := s.generateRandomString(32)
	authCode := &models.AuthorizationCode{
		ID:                  primitive.NewObjectID(),
		TenantID:            tenantID,
		Code:                code,
		ClientID:            clientID,
		UserID:              userID,
		RedirectURI:         redirectURI,
		Scopes:              scopes,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		ExpiresAt:           time.Now().Add(s.authCodeExpiry),
		Used:                false,
		CreatedAt:           time.Now(),
	}

	_, err := s.codeCollection.InsertOne(ctx, authCode)
	if err != nil {
		return "", err
	}

	return code, nil
}

func (s *OAuthService) ExchangeCodeForTokens(code, clientID, clientSecret, redirectURI string) (*TokenResponse, error) {
	_, err := s.ValidateClient(clientID, clientSecret)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var authCode models.AuthorizationCode
	err = s.codeCollection.FindOne(ctx, bson.M{
		"code":      code,
		"client_id": clientID,
		"used":      false,
	}).Decode(&authCode)

	if err != nil {
		return nil, errors.New("invalid authorization code")
	}

	if time.Now().After(authCode.ExpiresAt) {
		return nil, errors.New("authorization code expired")
	}

	if authCode.RedirectURI != redirectURI {
		return nil, errors.New("redirect URI mismatch")
	}

	_, err = s.codeCollection.UpdateOne(ctx, bson.M{"_id": authCode.ID}, bson.M{
		"$set": bson.M{"used": true},
	})
	if err != nil {
		return nil, err
	}

	accessToken, err := s.generateAccessToken(authCode.UserID, authCode.TenantID, clientID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(accessToken, clientID, authCode.UserID, authCode.TenantID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	// Generate ID token for OpenID Connect
	idToken, err := s.generateIDToken(authCode.UserID, authCode.TenantID, clientID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.accessTokenExpiry.Seconds()),
		RefreshToken: refreshToken,
		IDToken:      idToken,
		Scope:        s.joinScopes(authCode.Scopes),
	}, nil
}

// ExchangeCodeForTokensPKCE exchanges an authorization code for tokens using PKCE
func (s *OAuthService) ExchangeCodeForTokensPKCE(code, clientID, codeVerifier, redirectURI string) (*TokenResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Validate client exists (no secret required for PKCE)
	var client models.Client
	err := s.clientCollection.FindOne(ctx, bson.M{
		"client_id": clientID,
		"active":    true,
	}).Decode(&client)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("invalid client")
		}
		return nil, err
	}

	// Find the authorization code
	var authCode models.AuthorizationCode
	err = s.codeCollection.FindOne(ctx, bson.M{
		"code":      code,
		"client_id": clientID,
		"used":      false,
	}).Decode(&authCode)
	if err != nil {
		return nil, errors.New("invalid authorization code")
	}

	if time.Now().After(authCode.ExpiresAt) {
		return nil, errors.New("authorization code expired")
	}

	if authCode.RedirectURI != redirectURI {
		return nil, errors.New("redirect URI mismatch")
	}

	// Verify PKCE code_verifier against stored code_challenge
	if authCode.CodeChallenge == "" {
		return nil, errors.New("PKCE required but no code_challenge found")
	}

	if !s.verifyPKCE(codeVerifier, authCode.CodeChallenge, authCode.CodeChallengeMethod) {
		return nil, errors.New("invalid code_verifier")
	}

	// Mark code as used
	_, err = s.codeCollection.UpdateOne(ctx, bson.M{"_id": authCode.ID}, bson.M{
		"$set": bson.M{"used": true},
	})
	if err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, err := s.generateAccessToken(authCode.UserID, authCode.TenantID, clientID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(accessToken, clientID, authCode.UserID, authCode.TenantID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	// Generate ID token for OpenID Connect
	idToken, err := s.generateIDToken(authCode.UserID, authCode.TenantID, clientID, authCode.Scopes)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.accessTokenExpiry.Seconds()),
		RefreshToken: refreshToken,
		IDToken:      idToken,
		Scope:        s.joinScopes(authCode.Scopes),
	}, nil
}

// verifyPKCE verifies the code_verifier against the stored code_challenge
func (s *OAuthService) verifyPKCE(codeVerifier, codeChallenge, method string) bool {
	if method == "" || method == "plain" {
		return codeVerifier == codeChallenge
	}
	
	if method == "S256" {
		hash := sha256.Sum256([]byte(codeVerifier))
		computed := base64.RawURLEncoding.EncodeToString(hash[:])
		return computed == codeChallenge
	}
	
	return false
}

func (s *OAuthService) generateAccessToken(userID, tenantID, clientID string, scopes []string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokenID := uuid.New().String()
	expiresAt := time.Now().Add(s.accessTokenExpiry)

	claims := &Claims{
		UserID:   userID,
		TenantID: tenantID,
		ClientID: clientID,
		Scopes:   scopes,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}

	accessToken := &models.AccessToken{
		ID:        primitive.NewObjectID(),
		TenantID:  tenantID,
		Token:     tokenString,
		ClientID:  clientID,
		UserID:    userID,
		Scopes:    scopes,
		ExpiresAt: expiresAt,
		Revoked:   false,
		CreatedAt: time.Now(),
	}

	_, err = s.tokenCollection.InsertOne(ctx, accessToken)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// generateIDToken creates an OpenID Connect ID token with user information
func (s *OAuthService) generateIDToken(userID, tenantID, clientID string, scopes []string) (string, error) {
	// Get user information for the ID token
	userService := NewUserService(s.db)
	user, err := userService.GetUserByID(userID)
	if err != nil {
		return "", err
	}

	tokenID := uuid.New().String()
	expiresAt := time.Now().Add(time.Hour) // ID tokens typically have shorter expiry

	claims := &IDTokenClaims{
		UserID:   userID,
		TenantID: tenantID,
		Email:    user.Email,
		Groups:   user.Groups,
		Scopes:   user.Scopes, // Use user's actual database scopes instead of OAuth request scopes
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Audience:  []string{clientID},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (s *OAuthService) generateRefreshToken(accessToken, clientID, userID, tenantID string, scopes []string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	refreshTokenStr := s.generateRandomString(64)
	refreshToken := &models.RefreshToken{
		ID:          primitive.NewObjectID(),
		TenantID:    tenantID,
		Token:       refreshTokenStr,
		AccessToken: accessToken,
		ClientID:    clientID,
		UserID:      userID,
		Scopes:      scopes,
		ExpiresAt:   time.Now().Add(s.refreshTokenExpiry),
		Revoked:     false,
		CreatedAt:   time.Now(),
	}

	_, err := s.refreshCollection.InsertOne(ctx, refreshToken)
	if err != nil {
		return "", err
	}

	return refreshTokenStr, nil
}

func (s *OAuthService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var accessToken models.AccessToken
		err = s.tokenCollection.FindOne(ctx, bson.M{
			"token":   tokenString,
			"revoked": false,
		}).Decode(&accessToken)

		if err != nil {
			return nil, errors.New("token not found or revoked")
		}

		if time.Now().After(accessToken.ExpiresAt) {
			return nil, errors.New("token expired")
		}

		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *OAuthService) CreateClient(client *models.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	client.ID = primitive.NewObjectID()
	client.ClientID = uuid.New().String()
	client.ClientSecret = s.generateRandomString(32)
	client.CreatedAt = time.Now()
	client.UpdatedAt = time.Now()
	client.Active = true

	_, err := s.clientCollection.InsertOne(ctx, client)
	return err
}

func (s *OAuthService) generateRandomString(length int) string {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}

// GenerateDirectLoginTokens creates OAuth tokens for direct login (bypassing authorization code flow)
func (s *OAuthService) GenerateDirectLoginTokens(userID, tenantID string, scopes []string) (*TokenResponse, error) {
	clientID := "direct-login-client" // Special client ID for direct login
	
	accessToken, err := s.generateAccessToken(userID, tenantID, clientID, scopes)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(accessToken, clientID, userID, tenantID, scopes)
	if err != nil {
		return nil, err
	}

	// Generate ID token for OpenID Connect
	idToken, err := s.generateIDToken(userID, tenantID, clientID, scopes)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.accessTokenExpiry.Seconds()),
		RefreshToken: refreshToken,
		IDToken:      idToken,
		Scope:        s.joinScopes(scopes),
	}, nil
}

func (s *OAuthService) joinScopes(scopes []string) string {
	if len(scopes) == 0 {
		return ""
	}
	result := scopes[0]
	for i := 1; i < len(scopes); i++ {
		result += " " + scopes[i]
	}
	return result
}