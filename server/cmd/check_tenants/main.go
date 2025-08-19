package main

import (
	"context"
	"log"
	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
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

	// Get tenants collection
	collection := db.GetCollection("tenants")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find all tenants
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal("Failed to query tenants:", err)
	}
	defer cursor.Close(ctx)

	var tenants []models.Tenant
	if err = cursor.All(ctx, &tenants); err != nil {
		log.Fatal("Failed to decode tenants:", err)
	}

	if len(tenants) == 0 {
		log.Println("No tenants found in database")
		return
	}

	log.Printf("Found %d tenant(s):", len(tenants))
	for _, tenant := range tenants {
		log.Printf("- %s (ID: %s, Domain: %s, Subdomain: %s, Active: %t, IsDefault: %t)", 
			tenant.Name, tenant.ID.Hex(), tenant.Domain, tenant.Subdomain, tenant.Active, tenant.IsDefault)
	}
}