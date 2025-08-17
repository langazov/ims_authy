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

type GroupService struct {
	db         *database.MongoDB
	collection *mongo.Collection
}

func NewGroupService(db *database.MongoDB) *GroupService {
	return &GroupService{
		db:         db,
		collection: db.GetCollection("groups"),
	}
}

func (s *GroupService) CreateGroup(group *models.Group) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	group.ID = primitive.NewObjectID()
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()

	_, err := s.collection.InsertOne(ctx, group)
	return err
}

func (s *GroupService) GetGroupByID(id, tenantID string) (*models.Group, error) {
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

	var group models.Group
	err = s.collection.FindOne(ctx, filter).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("group not found")
		}
		return nil, err
	}

	return &group, nil
}

func (s *GroupService) GetGroupByName(name, tenantID string) (*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"name": name}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	var group models.Group
	err := s.collection.FindOne(ctx, filter).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("group not found")
		}
		return nil, err
	}

	return &group, nil
}

func (s *GroupService) GetAllGroups(tenantID string) ([]*models.Group, error) {
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

	var groups []*models.Group
	err = cursor.All(ctx, &groups)
	return groups, err
}

func (s *GroupService) UpdateGroup(id, tenantID string, group *models.Group) error {
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

	group.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"name":        group.Name,
		"description": group.Description,
		"scopes":      group.Scopes,
		"members":     group.Members,
		"updated_at":  group.UpdatedAt,
	}}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) DeleteGroup(id, tenantID string) error {
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
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) AddMemberToGroup(groupID, userID, tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	update := bson.M{
		"$addToSet": bson.M{"members": userID},
		"$set":      bson.M{"updated_at": time.Now()},
	}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) RemoveMemberFromGroup(groupID, userID, tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": objID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	update := bson.M{
		"$pull": bson.M{"members": userID},
		"$set":  bson.M{"updated_at": time.Now()},
	}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) GetGroupsByUser(userID, tenantID string) ([]*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"members": userID}
	if tenantID != "" {
		filter["tenant_id"] = tenantID
	}

	cursor, err := s.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []*models.Group
	err = cursor.All(ctx, &groups)
	return groups, err
}