package main

import (
	"log"
	"net/http"

	"oauth2-openid-server/autodiscovery"
	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/handlers"
	"oauth2-openid-server/middleware"
	"oauth2-openid-server/routes"
	"oauth2-openid-server/services"
)


func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	db, err := database.NewMongoDB(cfg.MongoURI, cfg.DatabaseName)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	tenantService := services.NewTenantService(db)
	userService := services.NewUserService(db)
	groupService := services.NewGroupService(db)
	clientService := services.NewClientService(db)
	scopeService := services.NewScopeService(db.Database)
	oauthService := services.NewOAuthService(db, cfg.JWTSecret)
	socialAuthService := services.NewSocialAuthService(userService, db)
	twoFactorService := services.NewTwoFactorService(db)

	// Initialize default social providers service
	socialProviderService := services.NewSocialProviderService(db)

	// Create setup service
	setupService := services.NewSetupService(db, tenantService, userService, scopeService, groupService, socialProviderService, clientService)

	// Check if initial setup is required
	setupRequired, err := setupService.IsSetupRequired()
	if err != nil {
		log.Fatal("Failed to check setup status:", err)
	}

	if setupRequired {
		log.Printf("Database is empty - Initial setup required")
		if _, err := setupService.GenerateSetupToken(); err != nil {
			log.Fatal("Failed to generate setup token:", err)
		}
	} else {
		// Initialize default tenant if none exist (backwards compatibility)
		if err := tenantService.InitializeDefaultTenant(); err != nil {
			log.Printf("Warning: Failed to initialize default tenant: %v", err)
		}
	}

	if !setupRequired {
		// Initialize default scopes if none exist for default tenant
		if err := scopeService.InitializeDefaultScopes(""); err != nil {
			log.Printf("Warning: Failed to initialize default scopes: %v", err)
		}

		// Initialize default groups if none exist for default tenant
		if err := groupService.InitializeDefaultGroups(""); err != nil {
			log.Printf("Warning: Failed to initialize default groups: %v", err)
		}

		// Initialize default social providers if none exist for default tenant
		if err := socialProviderService.InitializeDefaultProviders(""); err != nil {
			log.Printf("Warning: Failed to initialize default social providers: %v", err)
		}
	}

	authHandler := handlers.NewAuthHandler(userService, oauthService, socialAuthService, twoFactorService)
	tenantHandler := handlers.NewTenantHandler(tenantService, socialProviderService, scopeService, groupService)
	userHandler := handlers.NewUserHandler(userService, tenantService, groupService)
	groupHandler := handlers.NewGroupHandler(groupService)
	clientHandler := handlers.NewClientHandler(clientService)
	scopeHandler := handlers.NewScopeHandler(scopeService)
	dashboardHandler := handlers.NewDashboardHandler(userService, groupService, clientService, db)
	socialAuthHandler := handlers.NewSocialAuthHandler(socialAuthService, socialProviderService, oauthService, cfg)
	twoFactorHandler := handlers.NewTwoFactorHandler(twoFactorService, userService, oauthService)
	setupHandler := handlers.NewSetupHandler(setupService)
	autodiscoveryHandler := autodiscovery.NewHandler()
	jwksHandler := handlers.NewJWKSHandler(cfg.JWTSecret)

	// Setup all dependencies for routes
	deps := &routes.Dependencies{
		// Services
		TenantService:     tenantService,
		UserService:       userService,
		GroupService:      groupService,
		ClientService:     clientService,
		ScopeService:      scopeService,
		OAuthService:      oauthService,
		SocialAuthService: socialAuthService,
		TwoFactorService:  twoFactorService,
		SetupService:      setupService,

		// Handlers
		AuthHandler:          authHandler,
		TenantHandler:        tenantHandler,
		UserHandler:          userHandler,
		GroupHandler:         groupHandler,
		ClientHandler:        clientHandler,
		ScopeHandler:         scopeHandler,
		DashboardHandler:     dashboardHandler,
		SocialAuthHandler:    socialAuthHandler,
		TwoFactorHandler:     twoFactorHandler,
		SetupHandler:         setupHandler,
		AutodiscoveryHandler: autodiscoveryHandler,
		JWKSHandler:          jwksHandler,
	}

	router := routes.SetupRoutes(deps)

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, middleware.CorsMiddleware(router)))
}
