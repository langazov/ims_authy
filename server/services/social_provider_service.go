package services

import (
	"context"
	"errors"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type SocialProviderService struct {
	db                 *database.MongoDB
	providerCollection *mongo.Collection
}

func NewSocialProviderService(db *database.MongoDB) *SocialProviderService {
	return &SocialProviderService{
		db:                 db,
		providerCollection: db.GetCollection("social_providers"),
	}
}

// InitializeDefaultProviders creates default social provider configurations
func (s *SocialProviderService) InitializeDefaultProviders(tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	defaultProviders := []models.SocialProvider{
		{
			ID:           primitive.NewObjectID(),
			Name:         "google",
			DisplayName:  "Google",
			ClientID:     "",
			ClientSecret: "",
			RedirectURL:  "https://oauth2.imsc.eu/auth/google/callback",
			Enabled:      false,
			Scopes:       []string{"openid", "email", "profile"},
			AuthURL:      "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL:     "https://oauth2.googleapis.com/token",
			UserInfoURL:  "https://www.googleapis.com/oauth2/v2/userinfo",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Name:         "github",
			DisplayName:  "GitHub",
			ClientID:     "",
			ClientSecret: "",
			RedirectURL:  "https://oauth2.imsc.eu/auth/github/callback",
			Enabled:      false,
			Scopes:       []string{"user:email"},
			AuthURL:      "https://github.com/login/oauth/authorize",
			TokenURL:     "https://github.com/login/oauth/access_token",
			UserInfoURL:  "https://api.github.com/user",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Name:         "facebook",
			DisplayName:  "Facebook",
			ClientID:     "",
			ClientSecret: "",
			RedirectURL:  "https://oauth2.imsc.eu/auth/facebook/callback",
			Enabled:      false,
			Scopes:       []string{"email"},
			AuthURL:      "https://www.facebook.com/v18.0/dialog/oauth",
			TokenURL:     "https://graph.facebook.com/v18.0/oauth/access_token",
			UserInfoURL:  "https://graph.facebook.com/me?fields=id,name,email,first_name,last_name",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Name:         "apple",
			DisplayName:  "Apple",
			ClientID:     "",
			ClientSecret: "",
			RedirectURL:  "https://oauth2.imsc.eu/auth/apple/callback",
			Enabled:      false,
			Scopes:       []string{"name", "email"},
			AuthURL:      "https://appleid.apple.com/auth/authorize",
			TokenURL:     "https://appleid.apple.com/auth/token",
			UserInfoURL:  "",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	for _, provider := range defaultProviders {
		// Check if provider already exists for this tenant
		filter := bson.M{"name": provider.Name}
		if tenantID != "" {
			filter["tenant_id"] = tenantID
		}

		count, err := s.providerCollection.CountDocuments(ctx, filter)
		if err != nil {
			return err
		}

		// Only insert if it doesn't exist for this tenant
		if count == 0 {
			provider.TenantID = tenantID
			_, err = s.providerCollection.InsertOne(ctx, provider)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// GetAllProviders returns all social providers
func (s *SocialProviderService) GetAllProviders(tenantID string) ([]models.SocialProvider, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	cursor, err := s.providerCollection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var providers []models.SocialProvider
	if err = cursor.All(ctx, &providers); err != nil {
		return nil, err
	}

	return providers, nil
}

// GetEnabledProviders returns only enabled social providers
func (s *SocialProviderService) GetEnabledProviders(tenantID string) ([]models.SocialProvider, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"enabled": true}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	cursor, err := s.providerCollection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var providers []models.SocialProvider
	if err = cursor.All(ctx, &providers); err != nil {
		return nil, err
	}

	return providers, nil
}

// GetProviderByName returns a social provider by name
func (s *SocialProviderService) GetProviderByName(name, tenantID string) (*models.SocialProvider, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"name": name}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	var provider models.SocialProvider
	err := s.providerCollection.FindOne(ctx, filter).Decode(&provider)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("provider not found")
		}
		return nil, err
	}

	return &provider, nil
}

// UpdateProvider updates a social provider
func (s *SocialProviderService) UpdateProvider(id, tenantID string, provider *models.SocialProvider) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid provider ID")
	}

	filter := bson.M{"_id": objectID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	provider.UpdatedAt = time.Now()

	_, err = s.providerCollection.UpdateOne(ctx, filter, bson.M{
		"$set": provider,
	})

	return err
}

// CreateProvider creates a new social provider
func (s *SocialProviderService) CreateProvider(provider *models.SocialProvider) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	provider.ID = primitive.NewObjectID()
	provider.CreatedAt = time.Now()
	provider.UpdatedAt = time.Now()

	_, err := s.providerCollection.InsertOne(ctx, provider)
	return err
}

// DeleteProvider deletes a social provider
func (s *SocialProviderService) DeleteProvider(id, tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid provider ID")
	}

	filter := bson.M{"_id": objectID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	_, err = s.providerCollection.DeleteOne(ctx, filter)
	return err
}

// IsProviderEnabled checks if a provider is enabled
func (s *SocialProviderService) IsProviderEnabled(name, tenantID string) (bool, error) {
	provider, err := s.GetProviderByName(name, tenantID)
	if err != nil {
		return false, err
	}
	return provider.Enabled, nil
}
