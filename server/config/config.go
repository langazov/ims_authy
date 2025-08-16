package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	DatabaseName   string
	JWTSecret      string
	ClientID       string
	ClientSecret   string
	RedirectURL    string
	AuthServerURL  string
	TokenServerURL string
}

func Load() (*Config, error) {
	godotenv.Load()

	config := &Config{
		Port:           getEnv("PORT", "8080"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DatabaseName:   getEnv("DATABASE_NAME", "oauth2_server"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key"),
		ClientID:       getEnv("CLIENT_ID", "oauth2-client"),
		ClientSecret:   getEnv("CLIENT_SECRET", "oauth2-secret"),
		RedirectURL:    getEnv("REDIRECT_URL", "http://localhost:8080/callback"),
		AuthServerURL:  getEnv("AUTH_SERVER_URL", "http://localhost:8080/oauth/authorize"),
		TokenServerURL: getEnv("TOKEN_SERVER_URL", "http://localhost:8080/oauth/token"),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}