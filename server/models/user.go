package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
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
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Scopes      []string           `bson:"scopes" json:"scopes"`
	Members     []string           `bson:"members" json:"members"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type Client struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
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
	UserID    string             `bson:"user_id" json:"user_id"`
	ClientID  string             `bson:"client_id" json:"client_id"`
	SessionID string             `bson:"session_id" json:"session_id"`
	Verified  bool               `bson:"verified" json:"verified"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}