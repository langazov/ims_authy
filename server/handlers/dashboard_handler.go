package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"oauth2-openid-server/database"
	"oauth2-openid-server/middleware"
	"oauth2-openid-server/services"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardHandler struct {
	userService   *services.UserService
	groupService  *services.GroupService
	clientService *services.ClientService
	db            *database.MongoDB
}

type DashboardStats struct {
	TotalUsers          int64                `json:"total_users"`
	ActiveUsers         int64                `json:"active_users"`
	TotalGroups         int64                `json:"total_groups"`
	TotalClients        int64                `json:"total_clients"`
	ActiveClients       int64                `json:"active_clients"`
	TotalTokens         int64                `json:"total_tokens"`
	ActiveTokens        int64                `json:"active_tokens"`
	RecentActivity      []ActivityItem       `json:"recent_activity"`
	UserRegistrations   []RegistrationStats  `json:"user_registrations"`
	TokenUsage          []TokenUsageStats    `json:"token_usage"`
	ClientUsage         []ClientUsageStats   `json:"client_usage"`
}

type ActivityItem struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	UserID    string    `json:"user_id,omitempty"`
	ClientID  string    `json:"client_id,omitempty"`
}

type RegistrationStats struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type TokenUsageStats struct {
	Date   string `json:"date"`
	Tokens int64  `json:"tokens"`
}

type ClientUsageStats struct {
	ClientID   string `json:"client_id"`
	ClientName string `json:"client_name"`
	Tokens     int64  `json:"tokens"`
}

func NewDashboardHandler(userService *services.UserService, groupService *services.GroupService, clientService *services.ClientService, db *database.MongoDB) *DashboardHandler {
	return &DashboardHandler{
		userService:   userService,
		groupService:  groupService,
		clientService: clientService,
		db:            db,
	}
}

func (h *DashboardHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := &DashboardStats{}

	users, err := h.userService.GetAllUsers()
	if err != nil {
		http.Error(w, "Failed to get users", http.StatusInternalServerError)
		return
	}

	tenantID := middleware.GetTenantIDFromRequest(r)

	groups, err := h.groupService.GetAllGroups(tenantID)
	if err != nil {
		http.Error(w, "Failed to get groups", http.StatusInternalServerError)
		return
	}

	clients, err := h.clientService.GetAllClients(tenantID)
	if err != nil {
		http.Error(w, "Failed to get clients", http.StatusInternalServerError)
		return
	}

	activeClients, err := h.clientService.GetActiveClients(tenantID)
	if err != nil {
		http.Error(w, "Failed to get active clients", http.StatusInternalServerError)
		return
	}

	stats.TotalUsers = int64(len(users))
	var activeUserCount int64
	for _, user := range users {
		if user.Active {
			activeUserCount++
		}
	}
	stats.ActiveUsers = activeUserCount

	stats.TotalGroups = int64(len(groups))
	stats.TotalClients = int64(len(clients))
	stats.ActiveClients = int64(len(activeClients))

	tokenStats, err := h.getTokenStats()
	if err == nil {
		stats.TotalTokens = tokenStats.Total
		stats.ActiveTokens = tokenStats.Active
	}

	recentActivity, err := h.getRecentActivity()
	if err == nil {
		stats.RecentActivity = recentActivity
	}

	userRegistrations, err := h.getUserRegistrations()
	if err == nil {
		stats.UserRegistrations = userRegistrations
	}

	tokenUsage, err := h.getTokenUsage()
	if err == nil {
		stats.TokenUsage = tokenUsage
	}

	clientUsage, err := h.getClientUsage(tenantID)
	if err == nil {
		stats.ClientUsage = clientUsage
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

type TokenStats struct {
	Total  int64
	Active int64
}

func (h *DashboardHandler) getTokenStats() (*TokenStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokenCollection := h.db.GetCollection("access_tokens")

	total, err := tokenCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, err
	}

	active, err := tokenCollection.CountDocuments(ctx, bson.M{
		"revoked":    false,
		"expires_at": bson.M{"$gt": time.Now()},
	})
	if err != nil {
		return nil, err
	}

	return &TokenStats{
		Total:  total,
		Active: active,
	}, nil
}

func (h *DashboardHandler) getRecentActivity() ([]ActivityItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var activities []ActivityItem

	userCollection := h.db.GetCollection("users")
	opts := options.Find().SetLimit(10).SetSort(bson.M{"created_at": -1})
	cursor, err := userCollection.Find(ctx, bson.M{}, opts)
	if err == nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var user struct {
				ID        string    `bson:"_id"`
				Email     string    `bson:"email"`
				CreatedAt time.Time `bson:"created_at"`
			}
			if cursor.Decode(&user) == nil {
				activities = append(activities, ActivityItem{
					Type:      "user_created",
					Message:   "New user registered: " + user.Email,
					Timestamp: user.CreatedAt,
					UserID:    user.ID,
				})
			}
		}
	}

	clientCollection := h.db.GetCollection("clients")
	opts = options.Find().SetLimit(10).SetSort(bson.M{"created_at": -1})
	cursor, err = clientCollection.Find(ctx, bson.M{}, opts)
	if err == nil {
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var client struct {
				ID        string    `bson:"_id"`
				Name      string    `bson:"name"`
				CreatedAt time.Time `bson:"created_at"`
			}
			if cursor.Decode(&client) == nil {
				activities = append(activities, ActivityItem{
					Type:      "client_created",
					Message:   "New OAuth2 client registered: " + client.Name,
					Timestamp: client.CreatedAt,
					ClientID:  client.ID,
				})
			}
		}
	}

	return activities[:min(len(activities), 20)], nil
}

func (h *DashboardHandler) getUserRegistrations() ([]RegistrationStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userCollection := h.db.GetCollection("users")
	
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"created_at": bson.M{
					"$gte": time.Now().AddDate(0, 0, -30),
				},
			},
		},
		{
			"$group": bson.M{
				"_id": bson.M{
					"$dateToString": bson.M{
						"format": "%Y-%m-%d",
						"date":   "$created_at",
					},
				},
				"count": bson.M{"$sum": 1},
			},
		},
		{
			"$sort": bson.M{"_id": 1},
		},
	}

	cursor, err := userCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return []RegistrationStats{}, nil
	}
	defer cursor.Close(ctx)

	var stats []RegistrationStats
	for cursor.Next(ctx) {
		var result struct {
			Date  string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if cursor.Decode(&result) == nil {
			stats = append(stats, RegistrationStats{
				Date:  result.Date,
				Count: result.Count,
			})
		}
	}

	return stats, nil
}

func (h *DashboardHandler) getTokenUsage() ([]TokenUsageStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokenCollection := h.db.GetCollection("access_tokens")
	
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"created_at": bson.M{
					"$gte": time.Now().AddDate(0, 0, -30),
				},
			},
		},
		{
			"$group": bson.M{
				"_id": bson.M{
					"$dateToString": bson.M{
						"format": "%Y-%m-%d",
						"date":   "$created_at",
					},
				},
				"count": bson.M{"$sum": 1},
			},
		},
		{
			"$sort": bson.M{"_id": 1},
		},
	}

	cursor, err := tokenCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return []TokenUsageStats{}, nil
	}
	defer cursor.Close(ctx)

	var stats []TokenUsageStats
	for cursor.Next(ctx) {
		var result struct {
			Date  string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if cursor.Decode(&result) == nil {
			stats = append(stats, TokenUsageStats{
				Date:   result.Date,
				Tokens: result.Count,
			})
		}
	}

	return stats, nil
}

func (h *DashboardHandler) getClientUsage(tenantID string) ([]ClientUsageStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokenCollection := h.db.GetCollection("access_tokens")
	
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"created_at": bson.M{
					"$gte": time.Now().AddDate(0, 0, -30),
				},
			},
		},
		{
			"$group": bson.M{
				"_id":   "$client_id",
				"count": bson.M{"$sum": 1},
			},
		},
		{
			"$sort": bson.M{"count": -1},
		},
		{
			"$limit": 10,
		},
	}

	cursor, err := tokenCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return []ClientUsageStats{}, nil
	}
	defer cursor.Close(ctx)

	var stats []ClientUsageStats
	for cursor.Next(ctx) {
		var result struct {
			ClientID string `bson:"_id"`
			Count    int64  `bson:"count"`
		}
		if cursor.Decode(&result) == nil {
			client, err := h.clientService.GetClientByClientID(result.ClientID, tenantID)
			clientName := result.ClientID
			if err == nil && client != nil {
				clientName = client.Name
			}

			stats = append(stats, ClientUsageStats{
				ClientID:   result.ClientID,
				ClientName: clientName,
				Tokens:     result.Count,
			})
		}
	}

	return stats, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}