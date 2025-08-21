package middleware

import (
	"net/http"
	"slices"
	"strings"
)

func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		
		// Debug CORS requests
		if r.Method == "OPTIONS" || origin != "" {
			println("CORS request:", r.Method, "from origin:", origin, "to:", r.URL.Path)
		}
		
		// When credentials are allowed, we cannot use wildcard
		// Always use the specific origin when available, or allow common development origins
		if origin != "" {
			// Validate against allowed origins for security
			allowedOrigins := []string{
				"https://authy.imsc.eu",
				"https://oauth2.imsc.eu", 
				"http://localhost:5173",
				"http://localhost:3000",
				"http://localhost:8080",
			}
			
			if slices.Contains(allowedOrigins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				println("CORS: Setting allowed origin:", origin)
			} else {
				// For development, allow any localhost origin
				if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					println("CORS: Setting localhost origin:", origin)
				} else {
					// Default to the main frontend URL for unknown origins
					w.Header().Set("Access-Control-Allow-Origin", "https://authy.imsc.eu")
					println("CORS: Setting default origin for unrecognized origin:", origin)
				}
			}
		} else {
			// No origin header - default to main frontend URL (never use wildcard with credentials)
			w.Header().Set("Access-Control-Allow-Origin", "https://authy.imsc.eu")
			println("CORS: No origin header, setting default:", "https://authy.imsc.eu")
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID, X-Requested-With, Accept, Origin, Cache-Control")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Authorization, X-Tenant-ID")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}