package handlers

import (
	"context"
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"math/big"
	"net/http"
	"time"

	"oauth2-openid-server/models"
	"oauth2-openid-server/services"
)

// JWKSHandler handles JSON Web Key Set endpoints
type JWKSHandler struct {
	jwtSecret       string
	cryptoKeyService *services.CryptoKeyService
}

// NewJWKSHandler creates a new JWKS handler
func NewJWKSHandler(jwtSecret string, cryptoKeyService *services.CryptoKeyService) *JWKSHandler {
	return &JWKSHandler{
		jwtSecret:       jwtSecret,
		cryptoKeyService: cryptoKeyService,
	}
}

// JWK represents a JSON Web Key
type JWK struct {
	Kty string `json:"kty"`           // Key Type
	Use string `json:"use"`           // Public Key Use
	Alg string `json:"alg"`           // Algorithm
	Kid string `json:"kid"`           // Key ID
	K   string `json:"k,omitempty"`   // Key Value (for symmetric keys)
	N   string `json:"n,omitempty"`   // Modulus (for RSA keys)
	E   string `json:"e,omitempty"`   // Exponent (for RSA keys)
	X   string `json:"x,omitempty"`   // X coordinate (for EC keys)
	Y   string `json:"y,omitempty"`   // Y coordinate (for EC keys)
	Crv string `json:"crv,omitempty"` // Curve (for EC keys)
}

// JWKSet represents a JSON Web Key Set
type JWKSet struct {
	Keys []JWK `json:"keys"`
}

// GetJWKS handles the JWKS endpoint
func (h *JWKSHandler) GetJWKS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var keys []JWK

	// HMAC-SHA256 key (symmetric) - keep for backward compatibility
	hmacKeyID := h.generateKeyID()
	hmacJWK := JWK{
		Kty: "oct",   // Octet sequence (symmetric key)
		Use: "sig",   // Signature
		Alg: "HS256", // HMAC SHA-256
		Kid: hmacKeyID,
		K:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(h.jwtSecret)),
	}
	keys = append(keys, hmacJWK)

	// Load RSA and ECDSA keys from database
	dbKeys, err := h.cryptoKeyService.GetActiveKeys(ctx)
	if err != nil {
		http.Error(w, "Failed to load cryptographic keys", http.StatusInternalServerError)
		return
	}

	// Convert database keys to JWKs
	for _, dbKey := range dbKeys {
		jwk, err := h.convertToJWK(&dbKey)
		if err != nil {
			// Log error but continue with other keys
			continue
		}
		keys = append(keys, jwk)
	}

	jwkSet := JWKSet{
		Keys: keys,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=3600") // Cache for 1 hour
	
	if err := json.NewEncoder(w).Encode(jwkSet); err != nil {
		http.Error(w, "Failed to encode JWKS", http.StatusInternalServerError)
		return
	}
}

// generateKeyID creates a unique key identifier based on the secret
func (h *JWKSHandler) generateKeyID() string {
	hash := sha256.Sum256([]byte(h.jwtSecret))
	// Use first 8 bytes of hash as key ID
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(hash[:8])
}

// convertToJWK converts a database CryptoKey to a JWK
func (h *JWKSHandler) convertToJWK(dbKey *models.CryptoKey) (JWK, error) {
	// Parse the public key from PEM
	block, _ := pem.Decode(dbKey.PublicKey)
	if block == nil {
		return JWK{}, errors.New("failed to decode public key PEM")
	}

	pubKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return JWK{}, err
	}

	switch dbKey.KeyType {
	case "rsa":
		rsaPubKey, ok := pubKey.(*rsa.PublicKey)
		if !ok {
			return JWK{}, errors.New("invalid RSA public key")
		}
		return h.createRSAJWK(rsaPubKey, dbKey.KeyID), nil

	case "ecdsa":
		ecdsaPubKey, ok := pubKey.(*ecdsa.PublicKey)
		if !ok {
			return JWK{}, errors.New("invalid ECDSA public key")
		}
		return h.createECDSAJWK(ecdsaPubKey, dbKey.KeyID), nil

	default:
		return JWK{}, errors.New("unsupported key type: " + dbKey.KeyType)
	}
}

// createRSAJWK creates a JWK for RSA public key
func (h *JWKSHandler) createRSAJWK(pubKey *rsa.PublicKey, keyID string) JWK {
	return JWK{
		Kty: "RSA",
		Use: "sig",
		Alg: "RS256",
		Kid: keyID,
		N:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(pubKey.N.Bytes()),
		E:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(big.NewInt(int64(pubKey.E)).Bytes()),
	}
}

// createECDSAJWK creates a JWK for ECDSA public key
func (h *JWKSHandler) createECDSAJWK(pubKey *ecdsa.PublicKey, keyID string) JWK {
	return JWK{
		Kty: "EC",
		Use: "sig",
		Alg: "ES256",
		Kid: keyID,
		Crv: "P-256",
		X:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(pubKey.X.Bytes()),
		Y:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(pubKey.Y.Bytes()),
	}
}