package services

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"github.com/google/uuid"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"github.com/skip2/go-qrcode"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type TwoFactorService struct {
	db                    *database.MongoDB
	userCollection        *mongo.Collection
	twoFactorCollection   *mongo.Collection
	sessionExpiry         time.Duration
}

type SetupTwoFactorResponse struct {
	Secret      string   `json:"secret"`
	QRCodeURL   string   `json:"qr_code_url"`
	QRCodeImage string   `json:"qr_code_image"` // Base64 encoded PNG image
	BackupCodes []string `json:"backup_codes"`
}

type VerifyTwoFactorRequest struct {
	UserID string `json:"user_id"`
	Code   string `json:"code"`
}

func NewTwoFactorService(db *database.MongoDB) *TwoFactorService {
	return &TwoFactorService{
		db:                  db,
		userCollection:      db.GetCollection("users"),
		twoFactorCollection: db.GetCollection("two_factor_sessions"),
		sessionExpiry:       time.Minute * 10,
	}
}

func (s *TwoFactorService) SetupTwoFactor(userID, issuer string) (*SetupTwoFactorResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	err = s.userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return nil, errors.New("user not found")
	}

	secret := s.generateSecret()
	
	key, err := otp.NewKeyFromURL(fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s",
		issuer, user.Email, secret, issuer))
	if err != nil {
		return nil, err
	}

	// Generate QR code image
	qrCode, err := qrcode.Encode(key.URL(), qrcode.Medium, 256)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %v", err)
	}

	// Encode to base64 for frontend
	qrCodeBase64 := base64.StdEncoding.EncodeToString(qrCode)

	backupCodes := s.generateBackupCodes()

	return &SetupTwoFactorResponse{
		Secret:      secret,
		QRCodeURL:   key.URL(),
		QRCodeImage: qrCodeBase64,
		BackupCodes: backupCodes,
	}, nil
}

func (s *TwoFactorService) EnableTwoFactor(userID, code, secret string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return errors.New("user not found")
	}

	if user.TwoFactorEnabled {
		return errors.New("two-factor authentication already enabled")
	}

	valid := totp.Validate(code, secret)
	if !valid {
		return errors.New("invalid verification code")
	}

	// Generate backup codes
	backupCodes := s.generateBackupCodes()

	_, err = s.userCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{
			"two_factor_enabled": true,
			"two_factor_secret":  secret,
			"backup_codes":       backupCodes,
			"updated_at":         time.Now(),
		},
	})

	return err
}

func (s *TwoFactorService) DisableTwoFactor(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	_, err = s.userCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{
			"two_factor_enabled": false,
			"two_factor_secret":  "",
			"backup_codes":       []string{},
			"updated_at":         time.Now(),
		},
	})

	return err
}

func (s *TwoFactorService) VerifyTwoFactor(userID, code string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return false, errors.New("user not found")
	}

	if !user.TwoFactorEnabled {
		return false, errors.New("two-factor authentication not enabled")
	}

	if s.isBackupCode(code, user.BackupCodes) {
		err = s.removeBackupCode(userID, code)
		if err != nil {
			return false, err
		}
		return true, nil
	}

	valid := totp.Validate(code, user.TwoFactorSecret)
	return valid, nil
}

func (s *TwoFactorService) CreateTwoFactorSession(userID, clientID string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionID := uuid.New().String()
	session := &models.TwoFactorSession{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		ClientID:  clientID,
		SessionID: sessionID,
		Verified:  false,
		ExpiresAt: time.Now().Add(s.sessionExpiry),
		CreatedAt: time.Now(),
	}

	_, err := s.twoFactorCollection.InsertOne(ctx, session)
	if err != nil {
		return "", err
	}

	return sessionID, nil
}

func (s *TwoFactorService) VerifyTwoFactorSession(sessionID, code string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var session models.TwoFactorSession
	err := s.twoFactorCollection.FindOne(ctx, bson.M{
		"session_id": sessionID,
		"verified":   false,
	}).Decode(&session)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, errors.New("invalid session")
		}
		return false, err
	}

	if time.Now().After(session.ExpiresAt) {
		return false, errors.New("session expired")
	}

	valid, err := s.VerifyTwoFactor(session.UserID, code)
	if err != nil {
		return false, err
	}

	if valid {
		_, err = s.twoFactorCollection.UpdateOne(ctx, bson.M{"_id": session.ID}, bson.M{
			"$set": bson.M{"verified": true},
		})
		if err != nil {
			return false, err
		}
	}

	return valid, nil
}

func (s *TwoFactorService) IsSessionVerified(sessionID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var session models.TwoFactorSession
	err := s.twoFactorCollection.FindOne(ctx, bson.M{
		"session_id": sessionID,
		"verified":   true,
	}).Decode(&session)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	if time.Now().After(session.ExpiresAt) {
		return false, nil
	}

	return true, nil
}

func (s *TwoFactorService) IsTwoFactorRequired(userID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return false, errors.New("user not found")
	}

	return user.TwoFactorEnabled, nil
}

func (s *TwoFactorService) HasBackupCodes(userID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return false, errors.New("user not found")
	}

	return len(user.BackupCodes) > 0, nil
}

func (s *TwoFactorService) generateSecret() string {
	secret := make([]byte, 20)
	_, err := rand.Read(secret)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret)
}

func (s *TwoFactorService) generateBackupCodes() []string {
	codes := make([]string, 10)
	for i := range codes {
		code := make([]byte, 6)
		_, err := rand.Read(code)
		if err != nil {
			panic(err)
		}
		codes[i] = fmt.Sprintf("%x", code)[:8]
	}
	return codes
}

func (s *TwoFactorService) isBackupCode(code string, backupCodes []string) bool {
	cleanCode := strings.ToLower(strings.TrimSpace(code))
	for _, backupCode := range backupCodes {
		if strings.ToLower(backupCode) == cleanCode {
			return true
		}
	}
	return false
}

func (s *TwoFactorService) removeBackupCode(userID, code string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	cleanCode := strings.ToLower(strings.TrimSpace(code))
	_, err = s.userCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$pull": bson.M{"backup_codes": bson.M{"$regex": "^" + cleanCode + "$", "$options": "i"}},
		"$set":  bson.M{"updated_at": time.Now()},
	})

	return err
}