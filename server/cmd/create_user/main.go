package main

import (
	"flag"
	"fmt"
	"log"
	"strings"

	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/models"
	"oauth2-openid-server/services"
)

func main() {
	email := flag.String("email", "", "Email address for the new user")
	password := flag.String("password", "", "Password for the new user")
	username := flag.String("username", "", "Username for the new user (optional)")
	first := flag.String("first", "", "First name (optional)")
	last := flag.String("last", "", "Last name (optional)")
	groups := flag.String("groups", "users", "Comma-separated groups (default: users)")
	scopes := flag.String("scopes", "read,write", "Comma-separated scopes (default: read,write)")

	flag.Parse()

	if *email == "" || *password == "" {
		log.Fatal("email and password are required")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.NewMongoDB(cfg.MongoURI, cfg.DatabaseName)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	userService := services.NewUserService(db)

	user := &models.User{
		Email:        *email,
		Username:     *username,
		PasswordHash: *password, // CreateUser will hash this
		FirstName:    *first,
		LastName:     *last,
		Groups:       nonEmptySplit(*groups),
		Scopes:       nonEmptySplit(*scopes),
	}

	if err := userService.CreateUser(user); err != nil {
		log.Fatalf("failed to create user: %v", err)
	}

	fmt.Printf("User created: %s (username: %s)\n", user.Email, user.Username)
}

func nonEmptySplit(s string) []string {
	if strings.TrimSpace(s) == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}
