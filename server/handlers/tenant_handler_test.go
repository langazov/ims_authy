package handlers

import (
	"net/http/httptest"
	"testing"

	"oauth2-openid-server/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestBuildTenantResponse(t *testing.T) {
	// Create a tenant handler
	handler := &TenantHandler{}

	// Create a sample tenant
	tenantID := primitive.NewObjectID()
	tenant := &models.Tenant{
		ID:        tenantID,
		Name:      "Test Tenant",
		Domain:    "test.example.com",
		Subdomain: "test",
		Active:    true,
	}

	// Create a mock HTTP request
	req := httptest.NewRequest("GET", "https://authy.imsc.eu/api/v1/tenants", nil)

	// Test the buildTenantResponse function
	response := handler.buildTenantResponse(tenant, req)

	// Verify the response structure
	if response.Tenant != tenant {
		t.Error("Expected embedded tenant to match original")
	}

	expectedURL := "https://authy.imsc.eu/.well-known/" + tenantID.Hex() + "/openid_configuration"
	if response.WellKnownURLs.OpenIDConfiguration != expectedURL {
		t.Errorf("Expected OpenID configuration URL %s, got %s", expectedURL, response.WellKnownURLs.OpenIDConfiguration)
	}
}

func TestBuildTenantResponseHTTP(t *testing.T) {
	// Create a tenant handler
	handler := &TenantHandler{}

	// Create a sample tenant
	tenantID := primitive.NewObjectID()
	tenant := &models.Tenant{
		ID:        tenantID,
		Name:      "HTTP Test Tenant",
		Domain:    "httptest.example.com",
		Subdomain: "httptest",
		Active:    true,
	}

	// Create a mock HTTP request (without TLS)
	req := httptest.NewRequest("GET", "http://localhost:8080/api/v1/tenants", nil)

	// Test the buildTenantResponse function
	response := handler.buildTenantResponse(tenant, req)

	// Verify HTTP scheme is detected correctly
	expectedURL := "http://localhost:8080/.well-known/" + tenantID.Hex() + "/openid_configuration"
	if response.WellKnownURLs.OpenIDConfiguration != expectedURL {
		t.Errorf("Expected HTTP OpenID configuration URL %s, got %s", expectedURL, response.WellKnownURLs.OpenIDConfiguration)
	}
}

func TestBuildTenantsResponse(t *testing.T) {
	// Create a tenant handler
	handler := &TenantHandler{}

	// Create sample tenants
	tenant1ID := primitive.NewObjectID()
	tenant2ID := primitive.NewObjectID()
	tenants := []*models.Tenant{
		{
			ID:        tenant1ID,
			Name:      "Tenant 1",
			Domain:    "tenant1.example.com",
			Subdomain: "tenant1",
			Active:    true,
		},
		{
			ID:        tenant2ID,
			Name:      "Tenant 2",
			Domain:    "tenant2.example.com",
			Subdomain: "tenant2",
			Active:    true,
		},
	}

	// Create a mock HTTP request
	req := httptest.NewRequest("GET", "https://authy.imsc.eu/api/v1/tenants", nil)

	// Test the buildTenantsResponse function
	responses := handler.buildTenantsResponse(tenants, req)

	// Verify we get the correct number of responses
	if len(responses) != 2 {
		t.Errorf("Expected 2 responses, got %d", len(responses))
	}

	// Verify the first tenant response
	expectedURL1 := "https://authy.imsc.eu/.well-known/" + tenant1ID.Hex() + "/openid_configuration"
	if responses[0].WellKnownURLs.OpenIDConfiguration != expectedURL1 {
		t.Errorf("Expected first tenant URL %s, got %s", expectedURL1, responses[0].WellKnownURLs.OpenIDConfiguration)
	}

	// Verify the second tenant response
	expectedURL2 := "https://authy.imsc.eu/.well-known/" + tenant2ID.Hex() + "/openid_configuration"
	if responses[1].WellKnownURLs.OpenIDConfiguration != expectedURL2 {
		t.Errorf("Expected second tenant URL %s, got %s", expectedURL2, responses[1].WellKnownURLs.OpenIDConfiguration)
	}
}