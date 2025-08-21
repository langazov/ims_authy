package services

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CryptoKeyService struct {
	db             *database.MongoDB
	keyCollection  *mongo.Collection
}

func NewCryptoKeyService(db *database.MongoDB) *CryptoKeyService {
	return &CryptoKeyService{
		db:            db,
		keyCollection: db.GetCollection("crypto_keys"),
	}
}

// GetActiveKeys retrieves all active cryptographic keys
func (s *CryptoKeyService) GetActiveKeys(ctx context.Context) ([]models.CryptoKey, error) {
	filter := bson.M{
		"active": true,
		"$or": []bson.M{
			{"expires_at": nil},
			{"expires_at": bson.M{"$gt": time.Now()}},
		},
	}

	cursor, err := s.keyCollection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var keys []models.CryptoKey
	if err := cursor.All(ctx, &keys); err != nil {
		return nil, err
	}

	return keys, nil
}

// GetKeyByID retrieves a specific key by its key ID
func (s *CryptoKeyService) GetKeyByID(ctx context.Context, keyID string) (*models.CryptoKey, error) {
	filter := bson.M{"key_id": keyID, "active": true}
	
	var key models.CryptoKey
	err := s.keyCollection.FindOne(ctx, filter).Decode(&key)
	if err != nil {
		return nil, err
	}

	return &key, nil
}

// CreateRSAKey generates and stores a new RSA key pair
func (s *CryptoKeyService) CreateRSAKey(ctx context.Context, keySize int) (*models.CryptoKey, error) {
	if keySize < 2048 {
		keySize = 2048 // Minimum secure key size
	}

	// Generate RSA key pair
	privateKey, err := rsa.GenerateKey(rand.Reader, keySize)
	if err != nil {
		return nil, fmt.Errorf("failed to generate RSA key: %v", err)
	}

	// Encode private key to PEM
	privateKeyBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal private key: %v", err)
	}
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	// Encode public key to PEM
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal public key: %v", err)
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	// Generate key ID
	keyID := s.generateRSAKeyID(&privateKey.PublicKey)

	// Create key model
	key := &models.CryptoKey{
		ID:         primitive.NewObjectID(),
		KeyID:      keyID,
		KeyType:    "rsa",
		Algorithm:  "RS256",
		PrivateKey: privateKeyPEM,
		PublicKey:  publicKeyPEM,
		Active:     true,
		CreatedAt:  time.Now(),
	}

	// Store in database
	_, err = s.keyCollection.InsertOne(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to store RSA key: %v", err)
	}

	return key, nil
}

// CreateECDSAKey generates and stores a new ECDSA key pair
func (s *CryptoKeyService) CreateECDSAKey(ctx context.Context) (*models.CryptoKey, error) {
	// Generate ECDSA key pair using P-256 curve
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ECDSA key: %v", err)
	}

	// Encode private key to PEM
	privateKeyBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal private key: %v", err)
	}
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	// Encode public key to PEM
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal public key: %v", err)
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	// Generate key ID
	keyID := s.generateECDSAKeyID(&privateKey.PublicKey)

	// Create key model
	key := &models.CryptoKey{
		ID:         primitive.NewObjectID(),
		KeyID:      keyID,
		KeyType:    "ecdsa",
		Algorithm:  "ES256",
		PrivateKey: privateKeyPEM,
		PublicKey:  publicKeyPEM,
		Active:     true,
		CreatedAt:  time.Now(),
	}

	// Store in database
	_, err = s.keyCollection.InsertOne(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to store ECDSA key: %v", err)
	}

	return key, nil
}

// DeactivateKey marks a key as inactive
func (s *CryptoKeyService) DeactivateKey(ctx context.Context, keyID string) error {
	filter := bson.M{"key_id": keyID}
	update := bson.M{"$set": bson.M{"active": false}}

	result, err := s.keyCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("key not found")
	}

	return nil
}

// InitializeDefaultKeys creates default RSA and ECDSA keys if none exist
func (s *CryptoKeyService) InitializeDefaultKeys(ctx context.Context) error {
	// Check if any active keys exist
	activeKeys, err := s.GetActiveKeys(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing keys: %v", err)
	}

	var hasRSA, hasECDSA bool
	for _, key := range activeKeys {
		switch key.KeyType {
		case "rsa":
			hasRSA = true
		case "ecdsa":
			hasECDSA = true
		}
	}

	// Create RSA key if none exists
	if !hasRSA {
		_, err := s.CreateRSAKey(ctx, 2048)
		if err != nil {
			return fmt.Errorf("failed to create default RSA key: %v", err)
		}
	}

	// Create ECDSA key if none exists
	if !hasECDSA {
		_, err := s.CreateECDSAKey(ctx)
		if err != nil {
			return fmt.Errorf("failed to create default ECDSA key: %v", err)
		}
	}

	return nil
}

// ParsePrivateKey parses a PEM-encoded private key
func (s *CryptoKeyService) ParsePrivateKey(pemData []byte) (interface{}, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %v", err)
	}

	return key, nil
}

// ParsePublicKey parses a PEM-encoded public key
func (s *CryptoKeyService) ParsePublicKey(pemData []byte) (interface{}, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %v", err)
	}

	return key, nil
}

// generateRSAKeyID creates a key ID for RSA key
func (s *CryptoKeyService) generateRSAKeyID(pubKey *rsa.PublicKey) string {
	hash := sha256.New()
	hash.Write(pubKey.N.Bytes())
	keyHash := hash.Sum(nil)
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(keyHash[:8])
}

// generateECDSAKeyID creates a key ID for ECDSA key
func (s *CryptoKeyService) generateECDSAKeyID(pubKey *ecdsa.PublicKey) string {
	hash := sha256.New()
	hash.Write(pubKey.X.Bytes())
	hash.Write(pubKey.Y.Bytes())
	keyHash := hash.Sum(nil)
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(keyHash[:8])
}

// RotateKeys creates new keys and deactivates old ones
func (s *CryptoKeyService) RotateKeys(ctx context.Context) error {
	// Get current active keys
	activeKeys, err := s.GetActiveKeys(ctx)
	if err != nil {
		return fmt.Errorf("failed to get active keys: %v", err)
	}

	// Create new keys
	_, err = s.CreateRSAKey(ctx, 2048)
	if err != nil {
		return fmt.Errorf("failed to create new RSA key: %v", err)
	}

	_, err = s.CreateECDSAKey(ctx)
	if err != nil {
		return fmt.Errorf("failed to create new ECDSA key: %v", err)
	}

	// Deactivate old keys (with grace period - don't deactivate immediately)
	// In production, you might want to set an expiry date instead
	for _, key := range activeKeys {
		if key.KeyType == "rsa" || key.KeyType == "ecdsa" {
			// Set expiry to 24 hours from now to allow existing tokens to validate
			expiresAt := time.Now().Add(24 * time.Hour)
			filter := bson.M{"key_id": key.KeyID}
			update := bson.M{"$set": bson.M{"expires_at": expiresAt}}
			
			_, err := s.keyCollection.UpdateOne(ctx, filter, update)
			if err != nil {
				return fmt.Errorf("failed to set expiry for key %s: %v", key.KeyID, err)
			}
		}
	}

	return nil
}

// CleanupExpiredKeys removes expired keys from the database
func (s *CryptoKeyService) CleanupExpiredKeys(ctx context.Context) error {
	filter := bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
		"active":     false,
	}

	result, err := s.keyCollection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to cleanup expired keys: %v", err)
	}

	if result.DeletedCount > 0 {
		fmt.Printf("Cleaned up %d expired keys\n", result.DeletedCount)
	}

	return nil
}