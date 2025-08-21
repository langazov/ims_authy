package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type SocialProvider struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Enabled      bool
}

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
	WebBaseURL     string // Frontend/web application base URL

	// Social login providers
	Google   SocialProvider
	GitHub   SocialProvider
	Facebook SocialProvider
	Apple    SocialProvider
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
		RedirectURL:    getEnv("REDIRECT_URL", "https://oauth2.imsc.eu/callback"),
		AuthServerURL:  getEnv("AUTH_SERVER_URL", "https://oauth2.imsc.eu/oauth/authorize"),
		TokenServerURL: getEnv("TOKEN_SERVER_URL", "https://oauth2.imsc.eu/oauth/token"),
		WebBaseURL:     getEnv("WEB_BASE_URL", "https://authy.imsc.eu"),

		// Social login providers configuration
		Google: SocialProvider{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "https://oauth2.imsc.eu/auth/google/callback"),
			Enabled:      getEnv("GOOGLE_CLIENT_ID", "") != "",
		},
		GitHub: SocialProvider{
			ClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			ClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GITHUB_REDIRECT_URL", "https://oauth2.imsc.eu/auth/github/callback"),
			Enabled:      getEnv("GITHUB_CLIENT_ID", "") != "",
		},
		Facebook: SocialProvider{
			ClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
			ClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", "https://oauth2.imsc.eu/auth/facebook/callback"),
			Enabled:      getEnv("FACEBOOK_CLIENT_ID", "") != "",
		},
		Apple: SocialProvider{
			ClientID:     getEnv("APPLE_CLIENT_ID", ""),
			ClientSecret: getEnv("APPLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("APPLE_REDIRECT_URL", "https://oauth2.imsc.eu/auth/apple/callback"),
			Enabled:      getEnv("APPLE_CLIENT_ID", "") != "",
		},
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
