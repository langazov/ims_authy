package handlers

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
)

// JWKSHandler handles JSON Web Key Set endpoints
type JWKSHandler struct {
	jwtSecret string
}

// NewJWKSHandler creates a new JWKS handler
func NewJWKSHandler(jwtSecret string) *JWKSHandler {
	return &JWKSHandler{
		jwtSecret: jwtSecret,
	}
}

// JWK represents a JSON Web Key
type JWK struct {
	Kty string `json:"kty"` // Key Type
	Use string `json:"use"` // Public Key Use
	Alg string `json:"alg"` // Algorithm
	Kid string `json:"kid"` // Key ID
	K   string `json:"k"`   // Key Value (for symmetric keys)
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

	// For HMAC-SHA256, we create a symmetric key representation
	// Note: In production, consider using RSA/EC keys for better security
	keyID := h.generateKeyID()
	
	jwk := JWK{
		Kty: "oct",   // Octet sequence (symmetric key)
		Use: "sig",   // Signature
		Alg: "HS256", // HMAC SHA-256
		Kid: keyID,
		K:   base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(h.jwtSecret)),
	}

	jwkSet := JWKSet{
		Keys: []JWK{jwk},
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