package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/middleware"
	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type ClientHandler struct {
	clientService *services.ClientService
}

type CreateClientRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	RedirectURIs []string `json:"redirect_uris"`
	Scopes       []string `json:"scopes"`
	GrantTypes   []string `json:"grant_types"`
}

type UpdateClientRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	RedirectURIs []string `json:"redirect_uris"`
	Scopes       []string `json:"scopes"`
	GrantTypes   []string `json:"grant_types"`
	Active       bool     `json:"active"`
}

type ClientResponse struct {
	*models.Client
	ClientSecret string `json:"client_secret,omitempty"`
}

func NewClientHandler(clientService *services.ClientService) *ClientHandler {
	return &ClientHandler{
		clientService: clientService,
	}
}

func (h *ClientHandler) CreateClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)

	var createReq CreateClientRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if createReq.Name == "" {
		http.Error(w, "Client name is required", http.StatusBadRequest)
		return
	}

	if len(createReq.RedirectURIs) == 0 {
		http.Error(w, "At least one redirect URI is required", http.StatusBadRequest)
		return
	}

	client := &models.Client{
		Name:         createReq.Name,
		Description:  createReq.Description,
		RedirectURIs: createReq.RedirectURIs,
		Scopes:       createReq.Scopes,
		GrantTypes:   createReq.GrantTypes,
		TenantID:     tenantID,
	}

	if client.Scopes == nil {
		client.Scopes = []string{"read"}
	}
	if client.GrantTypes == nil {
		client.GrantTypes = []string{"authorization_code", "refresh_token"}
	}

	if err := h.clientService.CreateClient(client); err != nil {
		http.Error(w, "Failed to create client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := &ClientResponse{
		Client:       client,
		ClientSecret: client.ClientSecret,
	}

	client.ClientSecret = ""

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *ClientHandler) GetClients(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)
	activeOnly := r.URL.Query().Get("active") == "true"

	var clients []*models.Client
	var err error

	if activeOnly {
		clients, err = h.clientService.GetActiveClients(tenantID)
	} else {
		clients, err = h.clientService.GetAllClients(tenantID)
	}

	if err != nil {
		http.Error(w, "Failed to get clients: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if clients == nil {
		clients = []*models.Client{}
	}

	for _, client := range clients {
		client.ClientSecret = ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clients)
}

func (h *ClientHandler) GetClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	client, err := h.clientService.GetClientByID(clientID, tenantID)
	if err != nil {
		http.Error(w, "Client not found", http.StatusNotFound)
		return
	}

	client.ClientSecret = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(client)
}

func (h *ClientHandler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	var updateReq UpdateClientRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if updateReq.Name == "" {
		http.Error(w, "Client name is required", http.StatusBadRequest)
		return
	}

	if len(updateReq.RedirectURIs) == 0 {
		http.Error(w, "At least one redirect URI is required", http.StatusBadRequest)
		return
	}

	client := &models.Client{
		Name:         updateReq.Name,
		Description:  updateReq.Description,
		RedirectURIs: updateReq.RedirectURIs,
		Scopes:       updateReq.Scopes,
		GrantTypes:   updateReq.GrantTypes,
		Active:       updateReq.Active,
	}

	if client.Scopes == nil {
		client.Scopes = []string{}
	}
	if client.GrantTypes == nil {
		client.GrantTypes = []string{"authorization_code", "refresh_token"}
	}

	if err := h.clientService.UpdateClient(clientID, tenantID, client); err != nil {
		http.Error(w, "Failed to update client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	updatedClient, err := h.clientService.GetClientByID(clientID, tenantID)
	if err != nil {
		http.Error(w, "Failed to get updated client", http.StatusInternalServerError)
		return
	}

	updatedClient.ClientSecret = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedClient)
}

func (h *ClientHandler) DeleteClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	if err := h.clientService.DeleteClient(clientID, tenantID); err != nil {
		http.Error(w, "Failed to delete client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ClientHandler) ActivateClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	if err := h.clientService.ActivateClient(clientID, tenantID); err != nil {
		http.Error(w, "Failed to activate client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Client activated successfully"})
}

func (h *ClientHandler) DeactivateClient(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	if err := h.clientService.DeactivateClient(clientID, tenantID); err != nil {
		http.Error(w, "Failed to deactivate client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Client deactivated successfully"})
}

func (h *ClientHandler) RegenerateSecret(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	clientID := vars["id"]
	tenantID := middleware.GetTenantIDFromRequest(r)

	newSecret, err := h.clientService.RegenerateClientSecret(clientID, tenantID)
	if err != nil {
		http.Error(w, "Failed to regenerate client secret: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"client_secret": newSecret,
		"message":       "Client secret regenerated successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}