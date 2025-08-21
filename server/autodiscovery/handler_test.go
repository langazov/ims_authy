package autodiscovery

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLegacyDiscoveryHandler(t *testing.T) {
	handler := NewHandler()
	
	req := httptest.NewRequest("GET", "https://example.com/.well-known/openid_configuration", nil)
	w := httptest.NewRecorder()
	
	handler.LegacyDiscoveryHandler(w, req)
	
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
	
	if w.Header().Get("Content-Type") != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %s", w.Header().Get("Content-Type"))
	}
	
	var config OpenIDConfiguration
	err := json.Unmarshal(w.Body.Bytes(), &config)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	expectedIssuer := "https://example.com"
	if config.Issuer != expectedIssuer {
		t.Errorf("Expected issuer %s, got %s", expectedIssuer, config.Issuer)
	}
	
	expectedAuthEndpoint := "https://example.com/oauth/authorize"
	if config.AuthorizationEndpoint != expectedAuthEndpoint {
		t.Errorf("Expected authorization endpoint %s, got %s", expectedAuthEndpoint, config.AuthorizationEndpoint)
	}
	
	if len(config.ScopesSupported) == 0 {
		t.Error("Expected scopes_supported to be populated")
	}
	
	if len(config.ResponseTypesSupported) == 0 {
		t.Error("Expected response_types_supported to be populated")
	}
}

func TestTenantDiscoveryHandler(t *testing.T) {
	handler := NewHandler()
	
	// Mock tenant ID getter
	tenantIDGetter := func(r *http.Request) string {
		return "test-tenant-123"
	}
	
	req := httptest.NewRequest("GET", "https://example.com/tenant/test-tenant-123/.well-known/openid_configuration", nil)
	w := httptest.NewRecorder()
	
	tenantHandler := handler.TenantDiscoveryHandler(tenantIDGetter)
	tenantHandler(w, req)
	
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
	
	var config OpenIDConfiguration
	err := json.Unmarshal(w.Body.Bytes(), &config)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	expectedIssuer := "https://example.com/tenant/test-tenant-123"
	if config.Issuer != expectedIssuer {
		t.Errorf("Expected issuer %s, got %s", expectedIssuer, config.Issuer)
	}
	
	expectedAuthEndpoint := "https://example.com/tenant/test-tenant-123/oauth/authorize"
	if config.AuthorizationEndpoint != expectedAuthEndpoint {
		t.Errorf("Expected authorization endpoint %s, got %s", expectedAuthEndpoint, config.AuthorizationEndpoint)
	}
}

func TestConfigBuilder(t *testing.T) {
	baseURL := "https://test.example.com"
	
	// Test legacy configuration
	config := NewConfigBuilder(baseURL).Build()
	
	if config.Issuer != baseURL {
		t.Errorf("Expected issuer %s, got %s", baseURL, config.Issuer)
	}
	
	expectedAuthEndpoint := baseURL + "/oauth/authorize"
	if config.AuthorizationEndpoint != expectedAuthEndpoint {
		t.Errorf("Expected authorization endpoint %s, got %s", expectedAuthEndpoint, config.AuthorizationEndpoint)
	}
	
	// Test tenant configuration
	tenantID := "tenant-456"
	tenantConfig := NewConfigBuilder(baseURL).WithTenant(tenantID).Build()
	
	expectedTenantIssuer := baseURL + "/tenant/" + tenantID
	if tenantConfig.Issuer != expectedTenantIssuer {
		t.Errorf("Expected tenant issuer %s, got %s", expectedTenantIssuer, tenantConfig.Issuer)
	}
	
	expectedTenantAuthEndpoint := baseURL + "/tenant/" + tenantID + "/oauth/authorize"
	if tenantConfig.AuthorizationEndpoint != expectedTenantAuthEndpoint {
		t.Errorf("Expected tenant authorization endpoint %s, got %s", expectedTenantAuthEndpoint, tenantConfig.AuthorizationEndpoint)
	}
}

func TestHTTPSchemeDetection(t *testing.T) {
	handler := NewHandler()
	
	// Test HTTP request (no TLS)
	req := httptest.NewRequest("GET", "http://example.com/.well-known/openid_configuration", nil)
	w := httptest.NewRecorder()
	
	handler.LegacyDiscoveryHandler(w, req)
	
	var config OpenIDConfiguration
	json.Unmarshal(w.Body.Bytes(), &config)
	
	expectedIssuer := "http://example.com"
	if config.Issuer != expectedIssuer {
		t.Errorf("Expected HTTP issuer %s, got %s", expectedIssuer, config.Issuer)
	}
}

func TestXForwardedProtoHeader(t *testing.T) {
	handler := NewHandler()
	
	// Test with X-Forwarded-Proto header
	req := httptest.NewRequest("GET", "http://example.com/.well-known/openid_configuration", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	w := httptest.NewRecorder()
	
	handler.LegacyDiscoveryHandler(w, req)
	
	var config OpenIDConfiguration
	json.Unmarshal(w.Body.Bytes(), &config)
	
	expectedIssuer := "https://example.com"
	if config.Issuer != expectedIssuer {
		t.Errorf("Expected HTTPS issuer from X-Forwarded-Proto %s, got %s", expectedIssuer, config.Issuer)
	}
}