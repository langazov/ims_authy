package main

import (
	"log"
	"net/http"

	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/handlers"
	"oauth2-openid-server/middleware"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

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

	// Initialize default tenant if none exist
	if err := tenantService.InitializeDefaultTenant(); err != nil {
		log.Printf("Warning: Failed to initialize default tenant: %v", err)
	}

	// Initialize default scopes if none exist
	if err := scopeService.InitializeDefaultScopes(); err != nil {
		log.Printf("Warning: Failed to initialize default scopes: %v", err)
	}

	// Initialize default social providers if none exist
	socialProviderService := services.NewSocialProviderService(db)
	if err := socialProviderService.InitializeDefaultProviders(); err != nil {
		log.Printf("Warning: Failed to initialize default social providers: %v", err)
	}

	authHandler := handlers.NewAuthHandler(userService, oauthService, socialAuthService, twoFactorService)
	tenantHandler := handlers.NewTenantHandler(tenantService)
	userHandler := handlers.NewUserHandler(userService)
	groupHandler := handlers.NewGroupHandler(groupService)
	clientHandler := handlers.NewClientHandler(clientService)
	scopeHandler := handlers.NewScopeHandler(scopeService)
	dashboardHandler := handlers.NewDashboardHandler(userService, groupService, clientService, db)
	socialAuthHandler := handlers.NewSocialAuthHandler(socialAuthService, socialProviderService, oauthService)
	twoFactorHandler := handlers.NewTwoFactorHandler(twoFactorService, userService)

	router := mux.NewRouter()

	// Apply tenant middleware to all API routes
	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.TenantMiddleware(tenantService))
	
	// Tenant management endpoints (super admin only in production)
	api.HandleFunc("/tenants", tenantHandler.CreateTenant).Methods("POST")
	api.HandleFunc("/tenants", tenantHandler.GetTenants).Methods("GET")
	api.HandleFunc("/tenants/{id}", tenantHandler.GetTenant).Methods("GET")
	api.HandleFunc("/tenants/{id}", tenantHandler.UpdateTenant).Methods("PUT")
	api.HandleFunc("/tenants/{id}", tenantHandler.DeleteTenant).Methods("DELETE")

	// User management endpoints (tenant-scoped)
	api.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	api.HandleFunc("/users", userHandler.GetUsers).Methods("GET")
	api.HandleFunc("/users/me", userHandler.GetCurrentUser).Methods("GET")
	api.HandleFunc("/users/{id}", userHandler.GetUser).Methods("GET")
	api.HandleFunc("/users/{id}", userHandler.UpdateUser).Methods("PUT")
	api.HandleFunc("/users/{id}", userHandler.DeleteUser).Methods("DELETE")

	api.HandleFunc("/groups", groupHandler.CreateGroup).Methods("POST")
	api.HandleFunc("/groups", groupHandler.GetGroups).Methods("GET")
	api.HandleFunc("/groups/{id}", groupHandler.GetGroup).Methods("GET")
	api.HandleFunc("/groups/{id}", groupHandler.UpdateGroup).Methods("PUT")
	api.HandleFunc("/groups/{id}", groupHandler.DeleteGroup).Methods("DELETE")
	api.HandleFunc("/groups/{id}/members", groupHandler.AddMember).Methods("POST")
	api.HandleFunc("/groups/{id}/members/{userId}", groupHandler.RemoveMember).Methods("DELETE")
	api.HandleFunc("/users/{userId}/groups", groupHandler.GetUserGroups).Methods("GET")

	api.HandleFunc("/clients", clientHandler.CreateClient).Methods("POST")
	api.HandleFunc("/clients", clientHandler.GetClients).Methods("GET")
	api.HandleFunc("/clients/{id}", clientHandler.GetClient).Methods("GET")
	api.HandleFunc("/clients/{id}", clientHandler.UpdateClient).Methods("PUT")
	api.HandleFunc("/clients/{id}", clientHandler.DeleteClient).Methods("DELETE")
	api.HandleFunc("/clients/{id}/activate", clientHandler.ActivateClient).Methods("PATCH")
	api.HandleFunc("/clients/{id}/deactivate", clientHandler.DeactivateClient).Methods("PATCH")
	api.HandleFunc("/clients/{id}/regenerate-secret", clientHandler.RegenerateSecret).Methods("POST")

	api.HandleFunc("/scopes", scopeHandler.GetAllScopes).Methods("GET")
	api.HandleFunc("/scopes", scopeHandler.CreateScope).Methods("POST")
	api.HandleFunc("/scopes/{id}", scopeHandler.UpdateScope).Methods("PUT")
	api.HandleFunc("/scopes/{id}", scopeHandler.DeleteScope).Methods("DELETE")
	api.HandleFunc("/scopes/{id}", scopeHandler.HandleOptions).Methods("OPTIONS")

	api.HandleFunc("/dashboard/stats", dashboardHandler.GetDashboardStats).Methods("GET")

	// Two-factor authentication endpoints
	api.HandleFunc("/2fa/setup", twoFactorHandler.SetupTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/enable", twoFactorHandler.EnableTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/disable", twoFactorHandler.DisableTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/verify", twoFactorHandler.VerifyTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/verify-session", twoFactorHandler.VerifySession).Methods("POST")
	api.HandleFunc("/2fa/status", twoFactorHandler.GetTwoFactorStatus).Methods("GET")

	// Social provider management endpoints
	api.HandleFunc("/social/providers", socialAuthHandler.GetProviderConfigs).Methods("GET")
	api.HandleFunc("/social/providers/{provider}", socialAuthHandler.UpdateProviderConfig).Methods("PUT")
	api.HandleFunc("/social/providers/{provider}/test", socialAuthHandler.TestProviderConfig).Methods("POST")

	// OAuth routes with tenant middleware
	oauth := router.PathPrefix("/oauth").Subrouter()
	oauth.Use(middleware.TenantMiddleware(tenantService))
	oauth.HandleFunc("/authorize", authHandler.Authorize).Methods("GET", "POST")
	oauth.HandleFunc("/token", authHandler.Token).Methods("POST")

	// Social authentication routes with tenant middleware
	auth := router.PathPrefix("/auth").Subrouter()
	auth.Use(middleware.TenantMiddleware(tenantService))
	auth.HandleFunc("/providers", socialAuthHandler.GetProviders).Methods("GET")
	auth.HandleFunc("/providers/config", socialAuthHandler.GetProviderConfigs).Methods("GET")
	auth.HandleFunc("/providers/{provider}/config", socialAuthHandler.UpdateProviderConfig).Methods("PUT")
	auth.HandleFunc("/providers/{provider}/test", socialAuthHandler.TestProviderConfig).Methods("POST")
	auth.HandleFunc("/{provider}/login", socialAuthHandler.InitiateSocialLogin).Methods("GET")
	auth.HandleFunc("/{provider}/callback", socialAuthHandler.HandleSocialCallback).Methods("GET")
	auth.HandleFunc("/{provider}/oauth", socialAuthHandler.SocialOAuthAuthorize).Methods("GET")

	// Direct login route with tenant middleware
	loginRouter := router.PathPrefix("/login").Subrouter()
	loginRouter.Use(middleware.TenantMiddleware(tenantService))
	loginRouter.HandleFunc("", authHandler.Login).Methods("POST")

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMiddleware(router)))
}