package handlers

import (
	"encoding/json"
	"net/http"

	"oauth2-openid-server/models"
	"oauth2-openid-server/services"

	"github.com/gorilla/mux"
)

type GroupHandler struct {
	groupService *services.GroupService
}

type CreateGroupRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Scopes      []string `json:"scopes"`
	Members     []string `json:"members"`
}

type UpdateGroupRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Scopes      []string `json:"scopes"`
	Members     []string `json:"members"`
}

type AddMemberRequest struct {
	UserID string `json:"user_id"`
}

func NewGroupHandler(groupService *services.GroupService) *GroupHandler {
	return &GroupHandler{
		groupService: groupService,
	}
}

func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var createReq CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if createReq.Name == "" {
		http.Error(w, "Group name is required", http.StatusBadRequest)
		return
	}

	existing, _ := h.groupService.GetGroupByName(createReq.Name)
	if existing != nil {
		http.Error(w, "Group name already exists", http.StatusConflict)
		return
	}

	group := &models.Group{
		Name:        createReq.Name,
		Description: createReq.Description,
		Scopes:      createReq.Scopes,
		Members:     createReq.Members,
	}

	if group.Scopes == nil {
		group.Scopes = []string{}
	}
	if group.Members == nil {
		group.Members = []string{}
	}

	if err := h.groupService.CreateGroup(group); err != nil {
		http.Error(w, "Failed to create group: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(group)
}

func (h *GroupHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	groups, err := h.groupService.GetAllGroups()
	if err != nil {
		http.Error(w, "Failed to get groups: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if groups == nil {
		groups = []*models.Group{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func (h *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	groupID := vars["id"]

	group, err := h.groupService.GetGroupByID(groupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(group)
}

func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	groupID := vars["id"]

	var updateReq UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if updateReq.Name == "" {
		http.Error(w, "Group name is required", http.StatusBadRequest)
		return
	}

	existing, _ := h.groupService.GetGroupByName(updateReq.Name)
	if existing != nil && existing.ID.Hex() != groupID {
		http.Error(w, "Group name already exists", http.StatusConflict)
		return
	}

	group := &models.Group{
		Name:        updateReq.Name,
		Description: updateReq.Description,
		Scopes:      updateReq.Scopes,
		Members:     updateReq.Members,
	}

	if group.Scopes == nil {
		group.Scopes = []string{}
	}
	if group.Members == nil {
		group.Members = []string{}
	}

	if err := h.groupService.UpdateGroup(groupID, group); err != nil {
		http.Error(w, "Failed to update group: "+err.Error(), http.StatusInternalServerError)
		return
	}

	updatedGroup, err := h.groupService.GetGroupByID(groupID)
	if err != nil {
		http.Error(w, "Failed to get updated group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedGroup)
}

func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	groupID := vars["id"]

	if err := h.groupService.DeleteGroup(groupID); err != nil {
		http.Error(w, "Failed to delete group: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	groupID := vars["id"]

	var addReq AddMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&addReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if addReq.UserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	if err := h.groupService.AddMemberToGroup(groupID, addReq.UserID); err != nil {
		http.Error(w, "Failed to add member: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Member added successfully"})
}

func (h *GroupHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	groupID := vars["id"]
	userID := vars["userId"]

	if err := h.groupService.RemoveMemberFromGroup(groupID, userID); err != nil {
		http.Error(w, "Failed to remove member: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Member removed successfully"})
}

func (h *GroupHandler) GetUserGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	userID := vars["userId"]

	groups, err := h.groupService.GetGroupsByUser(userID)
	if err != nil {
		http.Error(w, "Failed to get user groups: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if groups == nil {
		groups = []*models.Group{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}