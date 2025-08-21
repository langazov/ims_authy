package main

import (
	"log"
	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/services"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Connect to database
	db, err := database.NewMongoDB(cfg.MongoURI, cfg.DatabaseName)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Create tenant service
	tenantService := services.NewTenantService(db)

	// Check if default tenant already exists
	defaultTenant, err := tenantService.GetDefaultTenant()
	if err == nil && defaultTenant != nil {
		log.Printf("Default tenant already exists: %s (ID: %s)", defaultTenant.Name, defaultTenant.ID.Hex())
		return
	}

	// Initialize default tenant
	log.Println("Creating default tenant...")
	err = tenantService.InitializeDefaultTenant()
	if err != nil {
		log.Fatal("Failed to create default tenant:", err)
	}

	log.Println("Default tenant created successfully!")
	
	// Verify it was created
	defaultTenant, err = tenantService.GetDefaultTenant()
	if err == nil && defaultTenant != nil {
		log.Printf("Verified default tenant: %s (ID: %s)", defaultTenant.Name, defaultTenant.ID.Hex())
	}
}