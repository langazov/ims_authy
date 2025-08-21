package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ClientService struct {
	db         *database.MongoDB
	collection *mongo.Collection
}

func NewClientService(db *database.MongoDB) *ClientService {
	return &ClientService{
		db:         db,
		collection: db.GetCollection("clients"),
	}
}

func (s *ClientService) CreateClient(client *models.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	client.ID = primitive.NewObjectID()
	client.ClientID = uuid.New().String()
	client.ClientSecret = s.generateClientSecret()
	client.CreatedAt = time.Now()
	client.UpdatedAt = time.Now()
	client.Active = true

	if len(client.GrantTypes) == 0 {
		client.GrantTypes = []string{"authorization_code", "refresh_token"}
	}

	_, err := s.collection.InsertOne(ctx, client)
	return err
}

func (s *ClientService) GetClientByID(id, tenantID string) (*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	var client models.Client
	err = s.collection.FindOne(ctx, filter).Decode(&client)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

func (s *ClientService) GetClientByClientID(clientID, tenantID string) (*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"client_id": clientID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	var client models.Client
	err := s.collection.FindOne(ctx, filter).Decode(&client)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

func (s *ClientService) GetAllClients(tenantID string) ([]*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	cursor, err := s.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var clients []*models.Client
	err = cursor.All(ctx, &clients)
	return clients, err
}

func (s *ClientService) GetActiveClients(tenantID string) ([]*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"active": true}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	cursor, err := s.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var clients []*models.Client
	err = cursor.All(ctx, &clients)
	return clients, err
}

func (s *ClientService) UpdateClient(id, tenantID string, client *models.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	client.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"name":          client.Name,
		"description":   client.Description,
		"redirect_uris": client.RedirectURIs,
		"scopes":        client.Scopes,
		"grant_types":   client.GrantTypes,
		"active":        client.Active,
		"updated_at":    client.UpdatedAt,
	}}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) DeleteClient(id, tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	result, err := s.collection.DeleteOne(ctx, filter)
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) ActivateClient(id, tenantID string) error {
	return s.updateClientStatus(id, tenantID, true)
}

func (s *ClientService) DeactivateClient(id, tenantID string) error {
	return s.updateClientStatus(id, tenantID, false)
}

func (s *ClientService) updateClientStatus(id, tenantID string, active bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	update := bson.M{"$set": bson.M{
		"active":     active,
		"updated_at": time.Now(),
	}}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) RegenerateClientSecret(id, tenantID string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return "", err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	newSecret := s.generateClientSecret()
	update := bson.M{"$set": bson.M{
		"client_secret": newSecret,
		"updated_at":    time.Now(),
	}}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return "", err
	}

	if result.MatchedCount == 0 {
		return "", errors.New("client not found")
	}

	return newSecret, nil
}

func (s *ClientService) ValidateRedirectURI(clientID, redirectURI, tenantID string) error {
	client, err := s.GetClientByClientID(clientID, tenantID)
	if err != nil {
		return err
	}

	if !client.Active {
		return errors.New("client is inactive")
	}

	for _, uri := range client.RedirectURIs {
		if uri == redirectURI {
			return nil
		}
	}

	return errors.New("invalid redirect URI")
}

func (s *ClientService) ValidateScope(clientID, tenantID string, requestedScopes []string) error {
	client, err := s.GetClientByClientID(clientID, tenantID)
	if err != nil {
		return err
	}

	if !client.Active {
		return errors.New("client is inactive")
	}

	clientScopeMap := make(map[string]bool)
	for _, scope := range client.Scopes {
		clientScopeMap[scope] = true
	}

	for _, scope := range requestedScopes {
		if !clientScopeMap[scope] {
			return errors.New("requested scope not allowed for client: " + scope)
		}
	}

	return nil
}

func (s *ClientService) generateClientSecret() string {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}