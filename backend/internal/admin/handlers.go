package admin

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yourusername/bulk-notifs/pkg/db"
)

type Handler struct {
	db *db.Database
}

func NewHandler(database *db.Database) *Handler {
	return &Handler{db: database}
}

type SystemStats struct {
	TotalUsers       int64 `json:"total_users"`
	ActiveUsers      int64 `json:"active_users"`
	TotalCampaigns   int64 `json:"total_campaigns"`
	TotalMessages    int64 `json:"total_messages"`
	TotalContactLists int64 `json:"total_contact_lists"`
	TotalContacts    int64 `json:"total_contacts"`
	TotalTemplates   int64 `json:"total_templates"`
	TotalRevenue     float64 `json:"total_revenue"`
	SubscriptionBreakdown map[string]int64 `json:"subscription_breakdown"`
}

func (h *Handler) GetSystemStats(w http.ResponseWriter, r *http.Request) {
	var stats SystemStats
	stats.SubscriptionBreakdown = make(map[string]int64)

	h.db.Model(&db.User{}).Count(&stats.TotalUsers)
	h.db.Model(&db.User{}).Where("is_active = true").Count(&stats.ActiveUsers)
	h.db.Model(&db.Campaign{}).Count(&stats.TotalCampaigns)
	h.db.Model(&db.Message{}).Where("status = 'sent'").Count(&stats.TotalMessages)
	h.db.Model(&db.ContactList{}).Count(&stats.TotalContactLists)
	h.db.Model(&db.Contact{}).Count(&stats.TotalContacts)
	h.db.Model(&db.Template{}).Count(&stats.TotalTemplates)

	h.db.Model(&db.Transaction{}).Where("status = 'completed'").
		Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalRevenue)

	type planCount struct {
		PlanName string
		Count    int64
	}
	var planCounts []planCount
	h.db.Model(&db.Subscription{}).Select("plan_name, COUNT(*) as count").
		Group("plan_name").Scan(&planCounts)

	for _, pc := range planCounts {
		stats.SubscriptionBreakdown[pc.PlanName] = pc.Count
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *Handler) GetUsers(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	search := r.URL.Query().Get("search")
	query := h.db.Model(&db.User{})

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
			searchTerm, searchTerm, searchTerm)
	}

	var users []db.User
	var total int64

	query.Count(&total)

	if err := query.Preload("Subscription").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&users).Error; err != nil {
		http.Error(w, "failed to fetch users", http.StatusInternalServerError)
		return
	}

	for i := range users {
		users[i].Password = ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users":    users,
		"total":    total,
		"page":     page,
		"per_page": limit,
	})
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	var user db.User
	if err := h.db.Preload("Subscription").First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	user.Password = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

type UpdateUserRequest struct {
	Role     *string `json:"role"`
	IsActive *bool   `json:"is_active"`
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	var user db.User
	if err := h.db.First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Role != nil {
		if *req.Role != "user" && *req.Role != "admin" {
			http.Error(w, "role must be 'user' or 'admin'", http.StatusBadRequest)
			return
		}
		user.Role = *req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	h.db.Save(&user)
	user.Password = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	var user db.User
	if err := h.db.First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	h.db.Delete(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "user deleted"})
}

func (h *Handler) UpdateUserSubscription(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	var user db.User
	if err := h.db.Preload("Subscription").First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	if user.Subscription == nil {
		http.Error(w, "user has no subscription", http.StatusNotFound)
		return
	}

	var req struct {
		PlanName   string `json:"plan_name"`
		SMSQuota   *int   `json:"sms_quota"`
		EmailQuota *int   `json:"email_quota"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.PlanName != "" {
		user.Subscription.PlanName = req.PlanName
	}
	if req.SMSQuota != nil {
		user.Subscription.SMSQuota = *req.SMSQuota
	}
	if req.EmailQuota != nil {
		user.Subscription.EmailQuota = *req.EmailQuota
	}

	h.db.Save(user.Subscription)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user.Subscription)
}
