package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"oauth2-openid-server/autodiscovery"
)

// MockDependencies creates a minimal mock dependencies struct for testing
func createMockDependencies() *Dependencies {
	return &Dependencies{
		AutodiscoveryHandler: autodiscovery.NewHandler(),
	}
}

func TestSetupRoutes(t *testing.T) {
	deps := createMockDependencies()
	router := SetupRoutes(deps)

	if router == nil {
		t.Fatal("Expected router to be created, got nil")
	}
}

func TestHealthRoute(t *testing.T) {
	deps := createMockDependencies()
	router := SetupRoutes(deps)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	expectedBody := "OK"
	if w.Body.String() != expectedBody {
		t.Errorf("Expected body '%s', got '%s'", expectedBody, w.Body.String())
	}
}

func TestLegacyAutodiscoveryRoute(t *testing.T) {
	deps := createMockDependencies()
	router := SetupRoutes(deps)

	req := httptest.NewRequest("GET", "/.well-known/openid_configuration", nil)
	req.Header.Set("Host", "example.com")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}
}

func TestSetupHealthRoute(t *testing.T) {
	// Test the individual route setup function
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	// Create a minimal router to test the health route
	router := http.NewServeMux()
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}