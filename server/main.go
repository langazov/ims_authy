package main

import (
	"log"
	"net/http"

	"oauth2-openid-server/config"
	"oauth2-openid-server/database"
	"oauth2-openid-server/handlers"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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

	userService := services.NewUserService(db)
	groupService := services.NewGroupService(db)
	clientService := services.NewClientService(db)
	oauthService := services.NewOAuthService(db, cfg.JWTSecret)
	socialAuthService := services.NewSocialAuthService(cfg, userService, db)

	authHandler := handlers.NewAuthHandler(userService, oauthService, socialAuthService)
	userHandler := handlers.NewUserHandler(userService)
	groupHandler := handlers.NewGroupHandler(groupService)
	clientHandler := handlers.NewClientHandler(clientService)
	dashboardHandler := handlers.NewDashboardHandler(userService, groupService, clientService, db)
	socialAuthHandler := handlers.NewSocialAuthHandler(socialAuthService, oauthService)

	router := mux.NewRouter()

	api := router.PathPrefix("/api/v1").Subrouter()
	
	api.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	api.HandleFunc("/users", userHandler.GetUsers).Methods("GET")
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

	api.HandleFunc("/dashboard/stats", dashboardHandler.GetDashboardStats).Methods("GET")

	// Social provider management endpoints
	api.HandleFunc("/social/providers", socialAuthHandler.GetProviderConfigs).Methods("GET")
	api.HandleFunc("/social/providers/{provider}", socialAuthHandler.UpdateProviderConfig).Methods("PUT")
	api.HandleFunc("/social/providers/{provider}/test", socialAuthHandler.TestProviderConfig).Methods("POST")

	oauth := router.PathPrefix("/oauth").Subrouter()
	oauth.HandleFunc("/authorize", authHandler.Authorize).Methods("GET", "POST")
	oauth.HandleFunc("/token", authHandler.Token).Methods("POST")

	// Social authentication routes
	auth := router.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/providers", socialAuthHandler.GetProviders).Methods("GET")
	auth.HandleFunc("/{provider}/login", socialAuthHandler.InitiateSocialLogin).Methods("GET")
	auth.HandleFunc("/{provider}/callback", socialAuthHandler.HandleSocialCallback).Methods("GET")
	auth.HandleFunc("/{provider}/oauth", socialAuthHandler.SocialOAuthAuthorize).Methods("GET")

	router.HandleFunc("/login", authHandler.Login).Methods("POST")

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMiddleware(router)))
}