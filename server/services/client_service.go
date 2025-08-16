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

func (s *ClientService) GetClientByID(id string) (*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var client models.Client
	err = s.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&client)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

func (s *ClientService) GetClientByClientID(clientID string) (*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var client models.Client
	err := s.collection.FindOne(ctx, bson.M{"client_id": clientID}).Decode(&client)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

func (s *ClientService) GetAllClients() ([]*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var clients []*models.Client
	err = cursor.All(ctx, &clients)
	return clients, err
}

func (s *ClientService) GetActiveClients() ([]*models.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(ctx, bson.M{"active": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var clients []*models.Client
	err = cursor.All(ctx, &clients)
	return clients, err
}

func (s *ClientService) UpdateClient(id string, client *models.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
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

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) DeleteClient(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	result, err := s.collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) ActivateClient(id string) error {
	return s.updateClientStatus(id, true)
}

func (s *ClientService) DeactivateClient(id string) error {
	return s.updateClientStatus(id, false)
}

func (s *ClientService) updateClientStatus(id string, active bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	update := bson.M{"$set": bson.M{
		"active":     active,
		"updated_at": time.Now(),
	}}

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("client not found")
	}

	return nil
}

func (s *ClientService) RegenerateClientSecret(id string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return "", err
	}

	newSecret := s.generateClientSecret()
	update := bson.M{"$set": bson.M{
		"client_secret": newSecret,
		"updated_at":    time.Now(),
	}}

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return "", err
	}

	if result.MatchedCount == 0 {
		return "", errors.New("client not found")
	}

	return newSecret, nil
}

func (s *ClientService) ValidateRedirectURI(clientID, redirectURI string) error {
	client, err := s.GetClientByClientID(clientID)
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

func (s *ClientService) ValidateScope(clientID string, requestedScopes []string) error {
	client, err := s.GetClientByClientID(clientID)
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