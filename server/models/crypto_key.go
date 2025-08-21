package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CryptoKey represents a cryptographic key stored in the database
type CryptoKey struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	KeyID      string            `bson:"key_id" json:"key_id"`           // JWK kid
	KeyType    string            `bson:"key_type" json:"key_type"`       // "rsa", "ecdsa"
	Algorithm  string            `bson:"algorithm" json:"algorithm"`     // "RS256", "ES256"
	PrivateKey []byte            `bson:"private_key" json:"-"`           // PEM encoded, don't expose in JSON
	PublicKey  []byte            `bson:"public_key" json:"public_key"`   // PEM encoded
	Active     bool              `bson:"active" json:"active"`
	CreatedAt  time.Time         `bson:"created_at" json:"created_at"`
	ExpiresAt  *time.Time        `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
}

// KeyPurpose defines the purpose of the key
type KeyPurpose string

const (
	KeyPurposeSignature   KeyPurpose = "sig"
	KeyPurposeEncryption  KeyPurpose = "enc"
)

// KeyStatus defines the status of the key
type KeyStatus string

const (
	KeyStatusActive   KeyStatus = "active"
	KeyStatusInactive KeyStatus = "inactive"
	KeyStatusExpired  KeyStatus = "expired"
)