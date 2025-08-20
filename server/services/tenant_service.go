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

type TenantService struct {
	db               *database.MongoDB
	tenantCollection *mongo.Collection
}

func NewTenantService(db *database.MongoDB) *TenantService {
	return &TenantService{
		db:               db,
		tenantCollection: db.GetCollection("tenants"),
	}
}

func (s *TenantService) CreateTenant(tenant *models.Tenant) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if tenant with domain already exists
	existing, _ := s.GetTenantByDomain(tenant.Domain)
	if existing != nil {
		return errors.New("tenant with this domain already exists")
	}

	// Check if tenant with subdomain already exists
	existing, _ = s.GetTenantBySubdomain(tenant.Subdomain)
	if existing != nil {
		return errors.New("tenant with this subdomain already exists")
	}

	tenant.ID = primitive.NewObjectID()
	tenant.CreatedAt = time.Now()
	tenant.UpdatedAt = time.Now()
	tenant.Active = true

	// Set default settings if not provided
	if tenant.Settings.SessionTimeout == 0 {
		tenant.Settings.SessionTimeout = 60 // 1 hour default
	}

	_, err := s.tenantCollection.InsertOne(ctx, tenant)
	return err
}

func (s *TenantService) GetTenantByID(tenantID string) (*models.Tenant, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(tenantID)
	if err != nil {
		return nil, errors.New("invalid tenant ID")
	}

	var tenant models.Tenant
	err = s.tenantCollection.FindOne(ctx, bson.M{"_id": objectID, "active": true}).Decode(&tenant)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("tenant not found")
		}
		return nil, err
	}

	return &tenant, nil
}

func (s *TenantService) GetDefaultTenant() (*models.Tenant, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var tenant models.Tenant
	err := s.tenantCollection.FindOne(ctx, bson.M{"is_default": true, "active": true}).Decode(&tenant)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("default tenant not found")
		}
		return nil, err
	}

	return &tenant, nil
}

func (s *TenantService) GetTenantByDomain(domain string) (*models.Tenant, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var tenant models.Tenant
	err := s.tenantCollection.FindOne(ctx, bson.M{"domain": domain, "active": true}).Decode(&tenant)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("tenant not found")
		}
		return nil, err
	}

	return &tenant, nil
}

func (s *TenantService) GetTenantBySubdomain(subdomain string) (*models.Tenant, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var tenant models.Tenant
	err := s.tenantCollection.FindOne(ctx, bson.M{"subdomain": subdomain, "active": true}).Decode(&tenant)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("tenant not found")
		}
		return nil, err
	}

	return &tenant, nil
}

func (s *TenantService) GetAllTenants() ([]*models.Tenant, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := s.tenantCollection.Find(ctx, bson.M{"active": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tenants []*models.Tenant
	for cursor.Next(ctx) {
		var tenant models.Tenant
		if err := cursor.Decode(&tenant); err != nil {
			return nil, err
		}
		tenants = append(tenants, &tenant)
	}

	return tenants, nil
}

func (s *TenantService) UpdateTenant(tenantID string, tenant *models.Tenant) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(tenantID)
	if err != nil {
		return errors.New("invalid tenant ID")
	}

	tenant.UpdatedAt = time.Now()

	update := bson.M{
		"$set": bson.M{
			"name":       tenant.Name,
			"domain":     tenant.Domain,
			"subdomain":  tenant.Subdomain,
			"settings":   tenant.Settings,
			"updated_at": tenant.UpdatedAt,
		},
	}

	result, err := s.tenantCollection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("tenant not found")
	}

	return nil
}

func (s *TenantService) DeleteTenant(tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(tenantID)
	if err != nil {
		return errors.New("invalid tenant ID")
	}

	// Soft delete by setting active to false
	update := bson.M{
		"$set": bson.M{
			"active":     false,
			"updated_at": time.Now(),
		},
	}

	result, err := s.tenantCollection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("tenant not found")
	}

	return nil
}

// InitializeDefaultTenant creates a default tenant if none exists
func (s *TenantService) InitializeDefaultTenant() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if any tenants exist
	count, err := s.tenantCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // Tenants already exist
	}

	// Create default tenant
	defaultTenant := &models.Tenant{
		Name:      "Default",
		Domain:    "localhost",
		Subdomain: "default",
		Active:    true,
		IsDefault: true,
		Settings: models.TenantSettings{
			AllowUserRegistration: true,
			RequireTwoFactor:      false,
			SessionTimeout:        60,
			CustomBranding: models.TenantBranding{
				CompanyName:    "OAuth2 Server",
				PrimaryColor:   "#3b82f6",
				SecondaryColor: "#1e40af",
			},
		},
	}

	return s.CreateTenant(defaultTenant)
}

// SetDefaultTenant marks a tenant as default and ensures no other tenant is marked as default
func (s *TenantService) SetDefaultTenant(tenantID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Start a transaction to ensure atomicity
	session, err := s.db.Client.StartSession()
	if err != nil {
		return err
	}
	defer session.EndSession(ctx)

	callback := func(sc mongo.SessionContext) (interface{}, error) {
		// First, remove default flag from all tenants
		_, err := s.tenantCollection.UpdateMany(sc, bson.M{}, bson.M{
			"$set": bson.M{"is_default": false, "updated_at": time.Now()},
		})
		if err != nil {
			return nil, err
		}

		// Then, set the specified tenant as default
		objID, err := primitive.ObjectIDFromHex(tenantID)
		if err != nil {
			return nil, err
		}

		result, err := s.tenantCollection.UpdateOne(sc, bson.M{"_id": objID}, bson.M{
			"$set": bson.M{"is_default": true, "updated_at": time.Now()},
		})
		if err != nil {
			return nil, err
		}

		if result.MatchedCount == 0 {
			return nil, errors.New("tenant not found")
		}

		return nil, nil
	}

	_, err = session.WithTransaction(ctx, callback)
	return err
}

// ResolveTenantFromRequest resolves tenant from HTTP request headers or subdomain
func (s *TenantService) ResolveTenantFromHost(host string) (*models.Tenant, error) {
	// Try to extract subdomain from host
	// For example: "acme.auth-server.com" -> "acme"
	// or handle direct domain mapping like "acme.com" -> lookup by domain

	// Simple implementation - check if it's a direct domain match first
	tenant, err := s.GetTenantByDomain(host)
	if err == nil {
		return tenant, nil
	}

	// Extract subdomain (simple implementation)
	// This would need to be more sophisticated for production
	if len(host) > 0 {
		// Check if it contains a subdomain pattern
		parts := []string{host}
		parts := strings.Split(host, ".")
		if len(parts) >= 3 {
			subdomain := parts[0]
			tenant, err := s.GetTenantBySubdomain(subdomain)
			if err == nil {
				return tenant, nil
			}
		}
	}

	// Fall back to default tenant
	return s.GetTenantBySubdomain("default")
}
