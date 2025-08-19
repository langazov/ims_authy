package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson"
)

type SetupService struct {
	db                    *database.MongoDB
	tenantService         *TenantService
	userService           *UserService
	scopeService          *ScopeService
	groupService          *GroupService
	socialProviderService *SocialProviderService
	setupToken            string
	setupTokenExpiry      time.Time
}

type SetupRequest struct {
	SetupToken      string                `json:"setup_token"`
	TenantName      string                `json:"tenant_name"`
	TenantDomain    string                `json:"tenant_domain"`
	TenantSubdomain string                `json:"tenant_subdomain"`
	AdminEmail      string                `json:"admin_email"`
	AdminPassword   string                `json:"admin_password"`
	AdminFirstName  string                `json:"admin_first_name"`
	AdminLastName   string                `json:"admin_last_name"`
	Settings        models.TenantSettings `json:"settings"`
}

func NewSetupService(
	db *database.MongoDB,
	tenantService *TenantService,
	userService *UserService,
	scopeService *ScopeService,
	groupService *GroupService,
	socialProviderService *SocialProviderService,
) *SetupService {
	return &SetupService{
		db:                    db,
		tenantService:         tenantService,
		userService:           userService,
		scopeService:          scopeService,
		groupService:          groupService,
		socialProviderService: socialProviderService,
	}
}

func (s *SetupService) IsSetupRequired() (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	log.Printf("Checking if initial setup is required...")

	// Check for forced setup mode via environment variable
	if os.Getenv("FORCE_SETUP") == "true" {
		log.Printf("FORCE_SETUP=true detected - forcing setup wizard")
		return true, nil
	}

	// Check if any tenants exist
	tenantsCount, err := s.db.GetCollection("tenants").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("Error checking tenants count: %v", err)
		return false, err
	}

	// Check if any users exist
	usersCount, err := s.db.GetCollection("users").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("Error checking users count: %v", err)
		return false, err
	}

	// Also check scopes and groups for completeness
	scopesCount, err := s.db.GetCollection("scopes").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("Error checking scopes count: %v", err)
		scopesCount = 0 // Continue anyway
	}

	groupsCount, err := s.db.GetCollection("groups").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("Error checking groups count: %v", err)
		groupsCount = 0 // Continue anyway
	}

	log.Printf("Database status check - Tenants: %d, Users: %d, Scopes: %d, Groups: %d",
		tenantsCount, usersCount, scopesCount, groupsCount)

	// Setup is required if both tenants and users collections are empty
	// This indicates a fresh installation
	setupRequired := tenantsCount == 0 && usersCount == 0
	log.Printf("Setup required: %v", setupRequired)

	return setupRequired, nil
}

func (s *SetupService) GenerateSetupToken() (string, error) {
	// Generate a secure random token
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	token := hex.EncodeToString(bytes)
	s.setupToken = token
	s.setupTokenExpiry = time.Now().Add(1 * time.Hour) // Token expires in 1 hour

	log.Printf("\n" + strings.Repeat("=", 80))
	log.Printf("SETUP WIZARD TOKEN GENERATED")
	log.Printf(strings.Repeat("=", 80))
	log.Printf("Your setup token (valid for 1 hour):")
	log.Printf("%s", token)
	log.Printf(strings.Repeat("=", 80))
	log.Printf("Please navigate to the setup wizard and enter this token.")
	log.Printf("Setup URL: https://authy.imsc.eu/setup")
	log.Printf(strings.Repeat("=", 80) + "\n")

	return token, nil
}

func (s *SetupService) ValidateSetupToken(token string) bool {
	if s.setupToken == "" {
		return false
	}

	if time.Now().After(s.setupTokenExpiry) {
		log.Printf("Setup token has expired. Please restart the server to generate a new token.")
		return false
	}

	return s.setupToken == token
}

func (s *SetupService) PerformInitialSetup(req *SetupRequest) error {
	if !s.ValidateSetupToken(req.SetupToken) {
		return errors.New("invalid or expired setup token")
	}

	// Step 1: Create the tenant
	tenant := &models.Tenant{
		Name:      req.TenantName,
		Domain:    req.TenantDomain,
		Subdomain: req.TenantSubdomain,
		Active:    true,
		Settings:  req.Settings,
	}

	if err := s.tenantService.CreateTenant(tenant); err != nil {
		return fmt.Errorf("failed to create tenant: %w", err)
	}

	tenantID := tenant.ID.Hex()
	log.Printf("Created tenant: %s (ID: %s)", tenant.Name, tenantID)

	// Step 2: Initialize default scopes
	if err := s.scopeService.InitializeDefaultScopes(tenantID); err != nil {
		log.Printf("Warning: Failed to initialize default scopes: %v", err)
	} else {
		log.Printf("Initialized default scopes for tenant: %s", tenantID)
	}

	// Step 3: Initialize default groups
	if err := s.groupService.InitializeDefaultGroups(tenantID); err != nil {
		log.Printf("Warning: Failed to initialize default groups: %v", err)
	} else {
		log.Printf("Initialized default groups for tenant: %s", tenantID)
	}

	// Step 4: Initialize default social providers
	if err := s.socialProviderService.InitializeDefaultProviders(tenantID); err != nil {
		log.Printf("Warning: Failed to initialize default social providers: %v", err)
	} else {
		log.Printf("Initialized default social providers for tenant: %s", tenantID)
	}

	// Step 5: Create default admin user
	if err := s.createDefaultAdminUser(tenantID, req); err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	// Step 6: Clear the setup token so it can't be used again
	s.setupToken = ""
	s.setupTokenExpiry = time.Time{}

	log.Printf("Setup completed successfully! Admin user created: %s", req.AdminEmail)
	return nil
}

func (s *SetupService) createDefaultAdminUser(tenantID string, req *SetupRequest) error {
	// Find the Administrators group
	adminGroup, err := s.groupService.GetGroupByName("Administrators", tenantID)
	if err != nil {
		return fmt.Errorf("administrators group not found: %w", err)
	}

	// Create admin user
	adminUser := &models.User{
		TenantID:     tenantID,
		Email:        req.AdminEmail,
		Username:     req.AdminEmail,    // Use email as username
		PasswordHash: req.AdminPassword, // Will be hashed by CreateUser
		FirstName:    req.AdminFirstName,
		LastName:     req.AdminLastName,
		// Store group names instead of internal IDs to match API expectations
		Groups: []string{adminGroup.Name},
		Scopes: adminGroup.Scopes, // Inherit all admin scopes
		Active: true,
	}

	if err := s.userService.CreateUser(adminUser); err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	log.Printf("Created admin user: %s in tenant: %s", adminUser.Email, tenantID)
	return nil
}

func (s *SetupService) GetSetupStatus() map[string]interface{} {
	required, _ := s.IsSetupRequired()
	hasValidToken := s.setupToken != "" && time.Now().Before(s.setupTokenExpiry)

	status := map[string]interface{}{
		"setup_required":  required,
		"has_valid_token": hasValidToken,
	}

	if hasValidToken {
		status["token_expires_at"] = s.setupTokenExpiry.Format(time.RFC3339)
	}

	return status
}
