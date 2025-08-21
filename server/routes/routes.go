package routes

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/autodiscovery"
	"oauth2-openid-server/handlers"
	"oauth2-openid-server/middleware"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

// Dependencies holds all the services and handlers needed for route setup
type Dependencies struct {
	// Services
	TenantService     *services.TenantService
	UserService       *services.UserService
	GroupService      *services.GroupService
	ClientService     *services.ClientService
	ScopeService      *services.ScopeService
	OAuthService      *services.OAuthService
	SocialAuthService *services.SocialAuthService
	TwoFactorService  *services.TwoFactorService
	SetupService      *services.SetupService

	// Handlers
	AuthHandler         *handlers.AuthHandler
	TenantHandler       *handlers.TenantHandler
	UserHandler         *handlers.UserHandler
	GroupHandler        *handlers.GroupHandler
	ClientHandler       *handlers.ClientHandler
	ScopeHandler        *handlers.ScopeHandler
	DashboardHandler    *handlers.DashboardHandler
	SocialAuthHandler   *handlers.SocialAuthHandler
	TwoFactorHandler    *handlers.TwoFactorHandler
	SetupHandler        *handlers.SetupHandler
	AutodiscoveryHandler *autodiscovery.Handler
}

// SetupRoutes configures all the routes for the application
func SetupRoutes(deps *Dependencies) *mux.Router {
	router := mux.NewRouter()

	// Setup endpoints (no middleware, available during initial setup)
	setupSetupRoutes(router, deps)

	// API routes with tenant middleware
	setupAPIRoutes(router, deps)

	// Tenant-specific routes
	setupTenantRoutes(router, deps)

	// Legacy routes (backwards compatibility)
	setupLegacyRoutes(router, deps)

	// Health endpoint
	setupHealthRoute(router)

	return router
}

// setupSetupRoutes configures initial setup endpoints
func setupSetupRoutes(router *mux.Router, deps *Dependencies) {
	router.HandleFunc("/api/setup/status", deps.SetupHandler.GetSetupStatus).Methods("GET")
	router.HandleFunc("/api/setup/validate-token", deps.SetupHandler.ValidateSetupToken).Methods("POST")
	router.HandleFunc("/api/setup/complete", deps.SetupHandler.PerformSetup).Methods("POST")
}

// setupAPIRoutes configures API v1 routes with tenant middleware
func setupAPIRoutes(router *mux.Router, deps *Dependencies) {
	api := router.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.TenantMiddleware(deps.TenantService))

	// Tenant management endpoints
	setupTenantManagementRoutes(api, deps)

	// User management endpoints
	setupUserManagementRoutes(api, deps)

	// Group management endpoints
	setupGroupManagementRoutes(api, deps)

	// Client management endpoints
	setupClientManagementRoutes(api, deps)

	// Scope management endpoints
	setupScopeManagementRoutes(api, deps)

	// Dashboard endpoints
	api.HandleFunc("/dashboard/stats", deps.DashboardHandler.GetDashboardStats).Methods("GET")

	// Two-factor authentication endpoints
	setupTwoFactorRoutes(api, deps)

	// Social provider management endpoints
	setupSocialProviderRoutes(api, deps)
}

// setupTenantManagementRoutes configures tenant management endpoints
func setupTenantManagementRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/tenants", deps.TenantHandler.CreateTenant).Methods("POST")
	api.HandleFunc("/tenants", deps.TenantHandler.GetTenants).Methods("GET")
	api.HandleFunc("/tenants/{id}", deps.TenantHandler.GetTenant).Methods("GET")
	api.HandleFunc("/tenants/{id}", deps.TenantHandler.UpdateTenant).Methods("PUT")
	api.HandleFunc("/tenants/{id}", deps.TenantHandler.DeleteTenant).Methods("DELETE")
}

// setupUserManagementRoutes configures user management endpoints
func setupUserManagementRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/users", deps.UserHandler.CreateUser).Methods("POST")
	api.HandleFunc("/users", deps.UserHandler.GetUsers).Methods("GET")
	api.HandleFunc("/users/me", deps.UserHandler.GetCurrentUser).Methods("GET")
	api.HandleFunc("/users/{id}", deps.UserHandler.GetUser).Methods("GET")
	api.HandleFunc("/users/{id}", deps.UserHandler.UpdateUser).Methods("PUT")
	api.HandleFunc("/users/{id}", deps.UserHandler.DeleteUser).Methods("DELETE")

	// Public user registration endpoint (tenant-scoped but no auth required)
	api.HandleFunc("/register", deps.UserHandler.RegisterUser).Methods("POST")
}

// setupGroupManagementRoutes configures group management endpoints
func setupGroupManagementRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/groups", deps.GroupHandler.CreateGroup).Methods("POST")
	api.HandleFunc("/groups", deps.GroupHandler.GetGroups).Methods("GET")
	api.HandleFunc("/groups/{id}", deps.GroupHandler.GetGroup).Methods("GET")
	api.HandleFunc("/groups/{id}", deps.GroupHandler.UpdateGroup).Methods("PUT")
	api.HandleFunc("/groups/{id}", deps.GroupHandler.DeleteGroup).Methods("DELETE")
	api.HandleFunc("/groups/{id}/members", deps.GroupHandler.AddMember).Methods("POST")
	api.HandleFunc("/groups/{id}/members/{userId}", deps.GroupHandler.RemoveMember).Methods("DELETE")
	api.HandleFunc("/users/{userId}/groups", deps.GroupHandler.GetUserGroups).Methods("GET")
}

// setupClientManagementRoutes configures OAuth client management endpoints
func setupClientManagementRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/clients", deps.ClientHandler.CreateClient).Methods("POST")
	api.HandleFunc("/clients", deps.ClientHandler.GetClients).Methods("GET")
	api.HandleFunc("/clients/{id}", deps.ClientHandler.GetClient).Methods("GET")
	api.HandleFunc("/clients/{id}", deps.ClientHandler.UpdateClient).Methods("PUT")
	api.HandleFunc("/clients/{id}", deps.ClientHandler.DeleteClient).Methods("DELETE")
	api.HandleFunc("/clients/{id}/activate", deps.ClientHandler.ActivateClient).Methods("PATCH")
	api.HandleFunc("/clients/{id}/deactivate", deps.ClientHandler.DeactivateClient).Methods("PATCH")
	api.HandleFunc("/clients/{id}/regenerate-secret", deps.ClientHandler.RegenerateSecret).Methods("POST")
}

// setupScopeManagementRoutes configures scope management endpoints
func setupScopeManagementRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/scopes", deps.ScopeHandler.GetAllScopes).Methods("GET")
	api.HandleFunc("/scopes", deps.ScopeHandler.CreateScope).Methods("POST")
	api.HandleFunc("/scopes/{id}", deps.ScopeHandler.UpdateScope).Methods("PUT")
	api.HandleFunc("/scopes/{id}", deps.ScopeHandler.DeleteScope).Methods("DELETE")
	api.HandleFunc("/scopes/{id}", deps.ScopeHandler.HandleOptions).Methods("OPTIONS")
}

// setupTwoFactorRoutes configures two-factor authentication endpoints
func setupTwoFactorRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/2fa/setup", deps.TwoFactorHandler.SetupTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/enable", deps.TwoFactorHandler.EnableTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/disable", deps.TwoFactorHandler.DisableTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/verify", deps.TwoFactorHandler.VerifyTwoFactor).Methods("POST")
	api.HandleFunc("/2fa/verify-session", deps.TwoFactorHandler.VerifySession).Methods("POST")
	api.HandleFunc("/2fa/status", deps.TwoFactorHandler.GetTwoFactorStatus).Methods("GET")
}

// setupSocialProviderRoutes configures social provider management endpoints
func setupSocialProviderRoutes(api *mux.Router, deps *Dependencies) {
	api.HandleFunc("/social/providers", deps.SocialAuthHandler.GetProviderConfigs).Methods("GET")
	api.HandleFunc("/social/providers/{provider}", deps.SocialAuthHandler.UpdateProviderConfig).Methods("PUT")
	api.HandleFunc("/social/providers/{provider}/test", deps.SocialAuthHandler.TestProviderConfig).Methods("POST")
}

// setupTenantRoutes configures tenant-specific routes
func setupTenantRoutes(router *mux.Router, deps *Dependencies) {
	tenantRouter := router.PathPrefix("/tenant/{tenantId}").Subrouter()
	tenantRouter.Use(middleware.TenantMiddleware(deps.TenantService))

	// OAuth routes for specific tenant
	setupTenantOAuthRoutes(tenantRouter, deps)

	// Social authentication routes for specific tenant
	setupTenantSocialAuthRoutes(tenantRouter, deps)

	// Direct login route for specific tenant
	tenantRouter.HandleFunc("/login", deps.AuthHandler.Login).Methods("POST")

	// Registration route for specific tenant
	tenantRouter.HandleFunc("/register", deps.UserHandler.RegisterUser).Methods("POST")

	// OpenID Connect autodiscovery endpoint for specific tenant
	tenantRouter.HandleFunc("/.well-known/openid_configuration", 
		deps.AutodiscoveryHandler.TenantDiscoveryHandler(middleware.GetTenantIDFromRequest)).Methods("GET")
}

// setupTenantOAuthRoutes configures tenant-specific OAuth routes
func setupTenantOAuthRoutes(tenantRouter *mux.Router, deps *Dependencies) {
	tenantOAuth := tenantRouter.PathPrefix("/oauth").Subrouter()
	
	tenantOAuth.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"message":   "OAuth2 Authorization Server",
			"tenant_id": middleware.GetTenantIDFromRequest(r),
			"endpoints": map[string]string{
				"authorization_endpoint": r.Host + r.RequestURI + "/authorize",
				"token_endpoint":         r.Host + r.RequestURI + "/token",
			},
		}
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	tenantOAuth.HandleFunc("/authorize", deps.AuthHandler.Authorize).Methods("GET", "POST")
	tenantOAuth.HandleFunc("/token", deps.AuthHandler.Token).Methods("POST")
}

// setupTenantSocialAuthRoutes configures tenant-specific social authentication routes
func setupTenantSocialAuthRoutes(tenantRouter *mux.Router, deps *Dependencies) {
	tenantAuth := tenantRouter.PathPrefix("/auth").Subrouter()
	
	tenantAuth.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"message":   "Social Authentication Service",
			"tenant_id": middleware.GetTenantIDFromRequest(r),
			"endpoints": map[string]string{
				"providers_endpoint": r.Host + r.RequestURI + "/providers",
			},
		}
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	tenantAuth.HandleFunc("/providers", deps.SocialAuthHandler.GetProviders).Methods("GET")
	tenantAuth.HandleFunc("/providers/config", deps.SocialAuthHandler.GetProviderConfigs).Methods("GET")
	tenantAuth.HandleFunc("/providers/{provider}/config", deps.SocialAuthHandler.UpdateProviderConfig).Methods("PUT")
	tenantAuth.HandleFunc("/providers/{provider}/test", deps.SocialAuthHandler.TestProviderConfig).Methods("POST")
	tenantAuth.HandleFunc("/{provider}/login", deps.SocialAuthHandler.InitiateSocialLogin).Methods("GET")
	tenantAuth.HandleFunc("/{provider}/callback", deps.SocialAuthHandler.HandleSocialCallback).Methods("GET")
	tenantAuth.HandleFunc("/{provider}/oauth", deps.SocialAuthHandler.SocialOAuthAuthorize).Methods("GET")
}

// setupLegacyRoutes configures legacy routes for backwards compatibility
func setupLegacyRoutes(router *mux.Router, deps *Dependencies) {
	// OAuth routes with tenant middleware
	setupLegacyOAuthRoutes(router, deps)

	// Social authentication routes with tenant middleware
	setupLegacySocialAuthRoutes(router, deps)

	// Direct login route with tenant middleware
	setupLegacyLoginRoutes(router, deps)

	// Legacy OpenID Connect autodiscovery endpoint
	router.HandleFunc("/.well-known/openid_configuration", deps.AutodiscoveryHandler.LegacyDiscoveryHandler).Methods("GET")
}

// setupLegacyOAuthRoutes configures legacy OAuth routes
func setupLegacyOAuthRoutes(router *mux.Router, deps *Dependencies) {
	oauth := router.PathPrefix("/oauth").Subrouter()
	oauth.Use(middleware.TenantMiddleware(deps.TenantService))
	
	oauth.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"message":   "OAuth2 Authorization Server",
			"tenant_id": middleware.GetTenantIDFromRequest(r),
			"endpoints": map[string]string{
				"authorization_endpoint": r.Host + r.RequestURI + "/authorize",
				"token_endpoint":         r.Host + r.RequestURI + "/token",
			},
		}
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	oauth.HandleFunc("/authorize", deps.AuthHandler.Authorize).Methods("GET", "POST")
	oauth.HandleFunc("/token", deps.AuthHandler.Token).Methods("POST")
}

// setupLegacySocialAuthRoutes configures legacy social authentication routes
func setupLegacySocialAuthRoutes(router *mux.Router, deps *Dependencies) {
	auth := router.PathPrefix("/auth").Subrouter()
	auth.Use(middleware.TenantMiddleware(deps.TenantService))
	
	auth.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"message":   "Social Authentication Service",
			"tenant_id": middleware.GetTenantIDFromRequest(r),
			"endpoints": map[string]string{
				"providers_endpoint": r.Host + r.RequestURI + "/providers",
			},
		}
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	auth.HandleFunc("/providers", deps.SocialAuthHandler.GetProviders).Methods("GET")
	auth.HandleFunc("/providers/config", deps.SocialAuthHandler.GetProviderConfigs).Methods("GET")
	auth.HandleFunc("/providers/{provider}/config", deps.SocialAuthHandler.UpdateProviderConfig).Methods("PUT")
	auth.HandleFunc("/providers/{provider}/test", deps.SocialAuthHandler.TestProviderConfig).Methods("POST")
	auth.HandleFunc("/{provider}/login", deps.SocialAuthHandler.InitiateSocialLogin).Methods("GET")
	auth.HandleFunc("/{provider}/callback", deps.SocialAuthHandler.HandleSocialCallback).Methods("GET")
	auth.HandleFunc("/{provider}/oauth", deps.SocialAuthHandler.SocialOAuthAuthorize).Methods("GET")
}

// setupLegacyLoginRoutes configures legacy login routes
func setupLegacyLoginRoutes(router *mux.Router, deps *Dependencies) {
	loginRouter := router.PathPrefix("/login").Subrouter()
	loginRouter.Use(middleware.TenantMiddleware(deps.TenantService))
	loginRouter.HandleFunc("", deps.AuthHandler.Login).Methods("POST")
}

// setupHealthRoute configures the health check endpoint
func setupHealthRoute(router *mux.Router) {
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")
}