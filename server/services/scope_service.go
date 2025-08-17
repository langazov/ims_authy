package services

import (
	"context"
	"time"

	"oauth2-openid-server/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ScopeService struct {
	collection *mongo.Collection
}

func NewScopeService(db *mongo.Database) *ScopeService {
	return &ScopeService{
		collection: db.Collection("scopes"),
	}
}

func (s *ScopeService) GetAllScopes() ([]models.Scope, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(ctx, bson.M{"active": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var scopes []models.Scope
	if err := cursor.All(ctx, &scopes); err != nil {
		return nil, err
	}

	return scopes, nil
}

func (s *ScopeService) CreateScope(scope *models.Scope) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	scope.ID = primitive.NewObjectID()
	scope.CreatedAt = time.Now()
	scope.UpdatedAt = time.Now()

	_, err := s.collection.InsertOne(ctx, scope)
	return err
}

func (s *ScopeService) UpdateScope(id string, scope *models.Scope) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	scope.UpdatedAt = time.Now()

	_, err = s.collection.UpdateOne(
		ctx,
		bson.M{"_id": objectID},
		bson.M{"$set": scope},
	)

	return err
}

func (s *ScopeService) DeleteScope(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.collection.UpdateOne(
		ctx,
		bson.M{"_id": objectID},
		bson.M{"$set": bson.M{"active": false, "updated_at": time.Now()}},
	)

	return err
}

func (s *ScopeService) GetScopeByName(name string) (*models.Scope, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var scope models.Scope
	err := s.collection.FindOne(ctx, bson.M{"name": name, "active": true}).Decode(&scope)
	if err != nil {
		return nil, err
	}

	return &scope, nil
}

func (s *ScopeService) InitializeDefaultScopes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if any scopes already exist
	count, err := s.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}

	// Only initialize if no scopes exist
	if count > 0 {
		return nil
	}

	defaultScopes := []models.Scope{
		{
			Name:        "read",
			DisplayName: "Read",
			Description: "Basic read access to user data",
			Category:    "basic",
			Active:      true,
		},
		{
			Name:        "write",
			DisplayName: "Write",
			Description: "Create and modify user data",
			Category:    "basic",
			Active:      true,
		},
		{
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Full system administration access",
			Category:    "administrative",
			Active:      true,
		},
		{
			Name:        "user_management",
			DisplayName: "User Management",
			Description: "Manage user accounts and groups",
			Category:    "management",
			Active:      true,
		},
		{
			Name:        "client_management",
			DisplayName: "Client Management",
			Description: "Manage OAuth clients",
			Category:    "management",
			Active:      true,
		},
		{
			Name:        "openid",
			DisplayName: "OpenID",
			Description: "OpenID Connect identity access",
			Category:    "oauth",
			Active:      true,
		},
		{
			Name:        "profile",
			DisplayName: "Profile",
			Description: "Access to user profile information",
			Category:    "oauth",
			Active:      true,
		},
		{
			Name:        "email",
			DisplayName: "Email",
			Description: "Access to user email address",
			Category:    "oauth",
			Active:      true,
		},
		{
			Name:        "read:profile",
			DisplayName: "Read Profile",
			Description: "View user profile information",
			Category:    "profile",
			Active:      true,
		},
		{
			Name:        "write:profile",
			DisplayName: "Write Profile",
			Description: "Modify user profile information",
			Category:    "profile",
			Active:      true,
		},
		{
			Name:        "read:users",
			DisplayName: "Read Users",
			Description: "View other users in the system",
			Category:    "users",
			Active:      true,
		},
		{
			Name:        "write:users",
			DisplayName: "Write Users",
			Description: "Create and modify user accounts",
			Category:    "users",
			Active:      true,
		},
		{
			Name:        "delete:users",
			DisplayName: "Delete Users",
			Description: "Remove user accounts",
			Category:    "users",
			Active:      true,
		},
		{
			Name:        "read:groups",
			DisplayName: "Read Groups",
			Description: "View group information",
			Category:    "groups",
			Active:      true,
		},
		{
			Name:        "write:groups",
			DisplayName: "Write Groups",
			Description: "Create and modify groups",
			Category:    "groups",
			Active:      true,
		},
		{
			Name:        "delete:groups",
			DisplayName: "Delete Groups",
			Description: "Remove groups",
			Category:    "groups",
			Active:      true,
		},
		{
			Name:        "read:clients",
			DisplayName: "Read OAuth Clients",
			Description: "View OAuth client applications",
			Category:    "clients",
			Active:      true,
		},
		{
			Name:        "write:clients",
			DisplayName: "Write OAuth Clients",
			Description: "Create and modify OAuth clients",
			Category:    "clients",
			Active:      true,
		},
		{
			Name:        "delete:clients",
			DisplayName: "Delete OAuth Clients",
			Description: "Remove OAuth clients",
			Category:    "clients",
			Active:      true,
		},
		{
			Name:        "admin:system",
			DisplayName: "System Admin",
			Description: "Full system administration access",
			Category:    "administrative",
			Active:      true,
		},
	}

	now := time.Now()
	var docs []any
	for _, scope := range defaultScopes {
		scope.ID = primitive.NewObjectID()
		scope.CreatedAt = now
		scope.UpdatedAt = now
		docs = append(docs, scope)
	}

	_, err = s.collection.InsertMany(ctx, docs)
	return err
}