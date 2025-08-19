package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Tenant struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name        string             `bson:"name" json:"name"`
	Domain      string             `bson:"domain" json:"domain"` // e.g., "acme.com" or "tenant1"
	Subdomain   string             `bson:"subdomain" json:"subdomain"` // e.g., "acme" for "acme.auth-server.com"
	Active      bool               `bson:"active" json:"active"`
	IsDefault   bool               `bson:"is_default" json:"is_default"` // Flag to mark the default tenant
	Settings    TenantSettings     `bson:"settings" json:"settings"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type TenantSettings struct {
	AllowUserRegistration bool               `bson:"allow_user_registration" json:"allow_user_registration"`
	RequireTwoFactor     bool               `bson:"require_two_factor" json:"require_two_factor"`
	SessionTimeout       int                `bson:"session_timeout" json:"session_timeout"` // in minutes
	CustomBranding       TenantBranding     `bson:"custom_branding" json:"custom_branding"`
}

type TenantBranding struct {
	LogoURL     string `bson:"logo_url" json:"logo_url"`
	CompanyName string `bson:"company_name" json:"company_name"`
	PrimaryColor string `bson:"primary_color" json:"primary_color"`
	SecondaryColor string `bson:"secondary_color" json:"secondary_color"`
}

type User struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID         string             `bson:"tenant_id" json:"tenant_id"`
	Email            string             `bson:"email" json:"email"`
	Username         string             `bson:"username" json:"username"`
	PasswordHash     string             `bson:"password_hash" json:"-"`
	FirstName        string             `bson:"first_name" json:"first_name"`
	LastName         string             `bson:"last_name" json:"last_name"`
	Groups           []string           `bson:"groups" json:"groups"`
	Scopes           []string           `bson:"scopes" json:"scopes"`
	Active           bool               `bson:"active" json:"active"`
	TwoFactorEnabled bool               `bson:"two_factor_enabled" json:"two_factor_enabled"`
	TwoFactorSecret  string             `bson:"two_factor_secret" json:"-"`
	BackupCodes      []string           `bson:"backup_codes" json:"-"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt        time.Time          `bson:"updated_at" json:"updated_at"`
}

type Group struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID    string             `bson:"tenant_id" json:"tenant_id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Scopes      []string           `bson:"scopes" json:"scopes"`
	Members     []string           `bson:"members" json:"members"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type Client struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID     string             `bson:"tenant_id" json:"tenant_id"`
	ClientID     string             `bson:"client_id" json:"client_id"`
	ClientSecret string             `bson:"client_secret" json:"-"`
	Name         string             `bson:"name" json:"name"`
	Description  string             `bson:"description" json:"description"`
	RedirectURIs []string           `bson:"redirect_uris" json:"redirect_uris"`
	Scopes       []string           `bson:"scopes" json:"scopes"`
	GrantTypes   []string           `bson:"grant_types" json:"grant_types"`
	Active       bool               `bson:"active" json:"active"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

type AuthorizationCode struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID            string             `bson:"tenant_id" json:"tenant_id"`
	Code                string             `bson:"code" json:"code"`
	ClientID            string             `bson:"client_id" json:"client_id"`
	UserID              string             `bson:"user_id" json:"user_id"`
	RedirectURI         string             `bson:"redirect_uri" json:"redirect_uri"`
	Scopes              []string           `bson:"scopes" json:"scopes"`
	CodeChallenge       string             `bson:"code_challenge" json:"code_challenge"`
	CodeChallengeMethod string             `bson:"code_challenge_method" json:"code_challenge_method"`
	ExpiresAt           time.Time          `bson:"expires_at" json:"expires_at"`
	Used                bool               `bson:"used" json:"used"`
	CreatedAt           time.Time          `bson:"created_at" json:"created_at"`
}

type AccessToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID  string             `bson:"tenant_id" json:"tenant_id"`
	Token     string             `bson:"token" json:"token"`
	ClientID  string             `bson:"client_id" json:"client_id"`
	UserID    string             `bson:"user_id" json:"user_id"`
	Scopes    []string           `bson:"scopes" json:"scopes"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	Revoked   bool               `bson:"revoked" json:"revoked"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type RefreshToken struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID    string             `bson:"tenant_id" json:"tenant_id"`
	Token       string             `bson:"token" json:"token"`
	AccessToken string             `bson:"access_token" json:"access_token"`
	ClientID    string             `bson:"client_id" json:"client_id"`
	UserID      string             `bson:"user_id" json:"user_id"`
	Scopes      []string           `bson:"scopes" json:"scopes"`
	ExpiresAt   time.Time          `bson:"expires_at" json:"expires_at"`
	Revoked     bool               `bson:"revoked" json:"revoked"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

type Scope struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID    string             `bson:"tenant_id" json:"tenant_id"`
	Name        string             `bson:"name" json:"name"`
	DisplayName string             `bson:"display_name" json:"display_name"`
	Description string             `bson:"description" json:"description"`
	Category    string             `bson:"category" json:"category"`
	Active      bool               `bson:"active" json:"active"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type TwoFactorSession struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID  string             `bson:"tenant_id" json:"tenant_id"`
	UserID    string             `bson:"user_id" json:"user_id"`
	ClientID  string             `bson:"client_id" json:"client_id"`
	SessionID string             `bson:"session_id" json:"session_id"`
	Verified  bool               `bson:"verified" json:"verified"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type SocialProvider struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TenantID     string             `bson:"tenant_id" json:"tenant_id"`
	Name         string             `bson:"name" json:"name"`                 // google, github, facebook, apple
	DisplayName  string             `bson:"display_name" json:"display_name"` // Google, GitHub, Facebook, Apple
	ClientID     string             `bson:"client_id" json:"client_id"`
	ClientSecret string             `bson:"client_secret" json:"-"` // Hidden in JSON responses
	RedirectURL  string             `bson:"redirect_url" json:"redirect_url"`
	Enabled      bool               `bson:"enabled" json:"enabled"`
	Scopes       []string           `bson:"scopes" json:"scopes"`
	AuthURL      string             `bson:"auth_url" json:"auth_url"`
	TokenURL     string             `bson:"token_url" json:"token_url"`
	UserInfoURL  string             `bson:"user_info_url" json:"user_info_url"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}