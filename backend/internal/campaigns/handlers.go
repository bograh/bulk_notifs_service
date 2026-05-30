package campaigns

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibiken/asynq"
	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/pkg/db"
)

type Handler struct {
	db          *db.Database
	asynqClient *asynq.Client
}

func NewHandler(database *db.Database, client *asynq.Client) *Handler {
	return &Handler{
		db:          database,
		asynqClient: client,
	}
}

type CreateCampaignRequest struct {
	Name          string     `json:"name"`
	Type          string     `json:"type"` // sms, email
	Subject       string     `json:"subject"`
	Content       string     `json:"content"`
	TemplateID    *uint      `json:"template_id"`
	ContactListID uint       `json:"contact_list_id"`
	ScheduledAt   *time.Time `json:"scheduled_at"`
}

func (h *Handler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Name == "" || req.Type == "" || req.ContactListID == 0 {
		http.Error(w, "name, type, and contact_list_id are required", http.StatusBadRequest)
		return
	}

	// Verify contact list belongs to user
	var contactList db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", req.ContactListID, claims.UserID).First(&contactList).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	// Check subscription quota
	var user db.User
	if err := h.db.Preload("Subscription").First(&user, claims.UserID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	if user.Subscription == nil {
		http.Error(w, "no active subscription", http.StatusForbidden)
		return
	}

	// Check quota based on campaign type
	if req.Type == "sms" {
		if user.Subscription.SMSUsed >= user.Subscription.SMSQuota {
			http.Error(w, "SMS quota exceeded", http.StatusForbidden)
			return
		}
	} else if req.Type == "email" {
		if user.Subscription.EmailUsed >= user.Subscription.EmailQuota {
			http.Error(w, "email quota exceeded", http.StatusForbidden)
			return
		}
	}

	// Create campaign
	status := "draft"
	if req.ScheduledAt != nil {
		status = "scheduled"
	}

	campaign := db.Campaign{
		UserID:          claims.UserID,
		Name:            req.Name,
		Type:            req.Type,
		Status:          status,
		Subject:         req.Subject,
		Content:         req.Content,
		TemplateID:      req.TemplateID,
		ContactListID:   req.ContactListID,
		ScheduledAt:     req.ScheduledAt,
		TotalRecipients: contactList.ActiveCount,
	}

	if err := h.db.Create(&campaign).Error; err != nil {
		http.Error(w, "failed to create campaign", http.StatusInternalServerError)
		return
	}

	// If scheduled, enqueue task
	if req.ScheduledAt != nil {
		task, err := NewCampaignTask(campaign.ID)
		if err != nil {
			http.Error(w, "failed to create task", http.StatusInternalServerError)
			return
		}

		_, err = h.asynqClient.Enqueue(task, asynq.ProcessAt(*req.ScheduledAt))
		if err != nil {
			http.Error(w, "failed to schedule campaign", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaign)
}

func (h *Handler) GetCampaigns(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	var campaigns []db.Campaign
	var total int64

	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).Count(&total)
	
	if err := h.db.Where("user_id = ?", claims.UserID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&campaigns).Error; err != nil {
		http.Error(w, "failed to fetch campaigns", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"campaigns": campaigns,
		"total":     total,
		"page":      page,
		"per_page":  limit,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	campaignID := chi.URLParam(r, "id")
	
	var campaign db.Campaign
	if err := h.db.Preload("ContactList").
		Preload("Template").
		Where("id = ? AND user_id = ?", campaignID, claims.UserID).
		First(&campaign).Error; err != nil {
		http.Error(w, "campaign not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaign)
}

func (h *Handler) SendCampaign(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	campaignID := chi.URLParam(r, "id")
	
	var campaign db.Campaign
	if err := h.db.Where("id = ? AND user_id = ?", campaignID, claims.UserID).First(&campaign).Error; err != nil {
		http.Error(w, "campaign not found", http.StatusNotFound)
		return
	}

	if campaign.Status != "draft" {
		http.Error(w, "campaign already sent or scheduled", http.StatusBadRequest)
		return
	}

	// Update status and enqueue task
	campaign.Status = "sending"
	campaign.StartedAt = &[]time.Time{time.Now()}[0]
	h.db.Save(&campaign)

	// Enqueue task immediately
	task, err := NewCampaignTask(campaign.ID)
	if err != nil {
		http.Error(w, "failed to create task", http.StatusInternalServerError)
		return
	}

	_, err = h.asynqClient.Enqueue(task, asynq.Queue("default"))
	if err != nil {
		http.Error(w, "failed to send campaign", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaign)
}

func (h *Handler) CancelCampaign(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	campaignID := chi.URLParam(r, "id")
	
	var campaign db.Campaign
	if err := h.db.Where("id = ? AND user_id = ?", campaignID, claims.UserID).First(&campaign).Error; err != nil {
		http.Error(w, "campaign not found", http.StatusNotFound)
		return
	}

	if campaign.Status != "scheduled" && campaign.Status != "sending" {
		http.Error(w, "cannot cancel campaign", http.StatusBadRequest)
		return
	}

	campaign.Status = "cancelled"
	h.db.Save(&campaign)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaign)
}
