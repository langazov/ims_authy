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

	// Get users collection
	collection := db.GetCollection("users")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find all users
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal("Failed to query users:", err)
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		log.Fatal("Failed to decode users:", err)
	}

	if len(users) == 0 {
		log.Println("No users found in database")
		return
	}

	log.Printf("Found %d user(s):\n", len(users))
	
	// Group users by tenant
	tenantUsers := make(map[string][]models.User)
	for _, user := range users {
		tenantID := user.TenantID
		if tenantID == "" {
			tenantID = "NO_TENANT"
		}
		tenantUsers[tenantID] = append(tenantUsers[tenantID], user)
	}

	// Display users grouped by tenant
	for tenantID, tenantUserList := range tenantUsers {
		log.Printf("\n=== Tenant: %s ===", tenantID)
		for _, user := range tenantUserList {
			log.Printf("  - %s (ID: %s, Active: %t, Scopes: %v, Groups: %v)", 
				user.Email, user.ID.Hex(), user.Active, user.Scopes, user.Groups)
		}
	}

	// Check for the specific email from the test
	testEmail := "langazov@gmail.com"
	log.Printf("\n=== Checking for test email: %s ===", testEmail)
	found := false
	for _, user := range users {
		if user.Email == testEmail {
			found = true
			log.Printf("  Found in tenant %s: ID=%s, Active=%t, Scopes=%v", 
				user.TenantID, user.ID.Hex(), user.Active, user.Scopes)
		}
	}
	if !found {
		log.Printf("  Email %s not found in any tenant", testEmail)
	}
}