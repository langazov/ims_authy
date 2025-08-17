package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Use the same MongoDB URI format as docker-compose
	mongoURI := "mongodb://admin:password123@localhost:27017/oauth2_server?authSource=admin"
	db, err := database.NewMongoDB(mongoURI, "oauth2_server")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	userService := services.NewUserService(db)
	twoFactorService := services.NewTwoFactorService(db)

	// Create a test user if not exists
	testEmail := "test@example.com"
	testPassword := "password123"

	existingUser, err := userService.GetUserByEmail(testEmail)
	if err != nil {
		// User doesn't exist, create one
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}

		user := &models.User{
			ID:           primitive.NewObjectID(),
			Email:        testEmail,
			Username:     testEmail,
			PasswordHash: string(hashedPassword),
			FirstName:    "Test",
			LastName:     "User",
			Groups:       []string{"test-users"},
			Scopes:       []string{"read", "write", "admin", "openid", "profile", "email"},
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		collection := db.GetCollection("users")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		_, err = collection.InsertOne(ctx, user)
		if err != nil {
			log.Fatal("Failed to create test user:", err)
		}

		fmt.Printf("Created test user: %s (password: %s)\n", testEmail, testPassword)
		fmt.Printf("User ID: %s\n", user.ID.Hex())

		// Setup 2FA for the test user
		fmt.Println("\nSetting up 2FA for test user...")
		setupResp, err := twoFactorService.SetupTwoFactor(user.ID.Hex(), "OAuth2 Test Server")
		if err != nil {
			log.Fatal("Failed to setup 2FA:", err)
		}

		fmt.Printf("2FA Secret: %s\n", setupResp.Secret)
		fmt.Printf("QR Code URL: %s\n", setupResp.QRCodeURL)
		fmt.Printf("Backup Codes: %v\n", setupResp.BackupCodes)

		fmt.Println("\nTo enable 2FA:")
		fmt.Println("1. Scan the QR code with your authenticator app")
		fmt.Println("2. Use the API endpoint POST /api/v1/2fa/enable with the generated code")
		fmt.Printf("   curl -X POST http://localhost:8080/api/v1/2fa/enable -H \"Content-Type: application/json\" -d '{\"user_id\":\"%s\",\"code\":\"YOUR_6_DIGIT_CODE\"}'\n", user.ID.Hex())

	} else {
		fmt.Printf("Test user already exists: %s\n", testEmail)
		fmt.Printf("User ID: %s\n", existingUser.ID.Hex())
		
		// Check 2FA status
		required, err := twoFactorService.IsTwoFactorRequired(existingUser.ID.Hex())
		if err != nil {
			log.Fatal("Failed to check 2FA status:", err)
		}

		fmt.Printf("2FA Enabled: %t\n", required)

		if !required {
			fmt.Println("\nTo setup 2FA for this user, use:")
			fmt.Printf("curl -X POST http://localhost:8080/api/v1/2fa/setup -H \"Content-Type: application/json\" -d '{\"user_id\":\"%s\"}'\n", existingUser.ID.Hex())
		}
	}

	fmt.Println("\nTest the login flow:")
	fmt.Printf("1. Login with email: %s, password: %s\n", testEmail, testPassword)
	fmt.Println("2. If 2FA is enabled, you'll be prompted for a 6-digit code")
	fmt.Println("3. You can also test with backup codes if needed")
}