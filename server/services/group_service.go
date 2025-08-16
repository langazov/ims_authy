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

func (s *GroupService) GetGroupByID(id string) (*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var group models.Group
	err = s.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("group not found")
		}
		return nil, err
	}

	return &group, nil
}

func (s *GroupService) GetGroupByName(name string) (*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var group models.Group
	err := s.collection.FindOne(ctx, bson.M{"name": name}).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("group not found")
		}
		return nil, err
	}

	return &group, nil
}

func (s *GroupService) GetAllGroups() ([]*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []*models.Group
	err = cursor.All(ctx, &groups)
	return groups, err
}

func (s *GroupService) UpdateGroup(id string, group *models.Group) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	group.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"name":        group.Name,
		"description": group.Description,
		"scopes":      group.Scopes,
		"members":     group.Members,
		"updated_at":  group.UpdatedAt,
	}}

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) DeleteGroup(id string) error {
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
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) AddMemberToGroup(groupID, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$addToSet": bson.M{"members": userID},
		"$set":      bson.M{"updated_at": time.Now()},
	}

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) RemoveMemberFromGroup(groupID, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$pull": bson.M{"members": userID},
		"$set":  bson.M{"updated_at": time.Now()},
	}

	result, err := s.collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("group not found")
	}

	return nil
}

func (s *GroupService) GetGroupsByUser(userID string) ([]*models.Group, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.collection.Find(ctx, bson.M{"members": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []*models.Group
	err = cursor.All(ctx, &groups)
	return groups, err
}