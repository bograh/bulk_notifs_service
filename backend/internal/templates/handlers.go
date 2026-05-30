package templates

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/pkg/db"
)

type Handler struct {
	db *db.Database
}

func NewHandler(database *db.Database) *Handler {
	return &Handler{db: database}
}

type CreateTemplateRequest struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Subject     string   `json:"subject"`
	Content     string   `json:"content"`
	HTMLContent string   `json:"html_content"`
	Variables   db.JSONB `json:"variables"`
	IsPublic    bool     `json:"is_public"`
}

type UpdateTemplateRequest struct {
	Name        string   `json:"name"`
	Subject     string   `json:"subject"`
	Content     string   `json:"content"`
	HTMLContent string   `json:"html_content"`
	Variables   db.JSONB `json:"variables"`
	IsPublic    *bool    `json:"is_public"`
}

func (h *Handler) GetTemplates(w http.ResponseWriter, r *http.Request) {
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

	templateType := r.URL.Query().Get("type")

	query := h.db.Where("user_id = ? OR is_public = true", claims.UserID)
	if templateType != "" {
		query = query.Where("type = ?", templateType)
	}

	var templates []db.Template
	var total int64

	query.Model(&db.Template{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&templates).Error; err != nil {
		http.Error(w, "failed to fetch templates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"templates": templates,
		"total":     total,
		"page":      page,
		"per_page":  limit,
	})
}

func (h *Handler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Type == "" || req.Content == "" {
		http.Error(w, "name, type, and content are required", http.StatusBadRequest)
		return
	}

	if req.Type != "sms" && req.Type != "email" {
		http.Error(w, "type must be 'sms' or 'email'", http.StatusBadRequest)
		return
	}

	template := db.Template{
		UserID:      claims.UserID,
		Name:        req.Name,
		Type:        req.Type,
		Subject:     req.Subject,
		Content:     req.Content,
		HTMLContent: req.HTMLContent,
		Variables:   req.Variables,
		IsPublic:    req.IsPublic,
	}

	if err := h.db.Create(&template).Error; err != nil {
		http.Error(w, "failed to create template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(template)
}

func (h *Handler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	templateID := chi.URLParam(r, "id")

	var template db.Template
	if err := h.db.Where("(id = ? AND user_id = ?) OR is_public = true", templateID, claims.UserID).
		First(&template).Error; err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(template)
}

func (h *Handler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	templateID := chi.URLParam(r, "id")

	var template db.Template
	if err := h.db.Where("id = ? AND user_id = ?", templateID, claims.UserID).First(&template).Error; err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}

	var req UpdateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		template.Name = req.Name
	}
	if req.Subject != "" {
		template.Subject = req.Subject
	}
	if req.Content != "" {
		template.Content = req.Content
	}
	if req.HTMLContent != "" {
		template.HTMLContent = req.HTMLContent
	}
	if req.Variables != nil {
		template.Variables = req.Variables
	}
	if req.IsPublic != nil {
		template.IsPublic = *req.IsPublic
	}

	h.db.Save(&template)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(template)
}

func (h *Handler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	templateID := chi.URLParam(r, "id")

	var template db.Template
	if err := h.db.Where("id = ? AND user_id = ?", templateID, claims.UserID).First(&template).Error; err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}

	var campaignCount int64
	h.db.Model(&db.Campaign{}).Where("template_id = ?", template.ID).Count(&campaignCount)
	if campaignCount > 0 {
		http.Error(w, "cannot delete template with active campaigns", http.StatusConflict)
		return
	}

	h.db.Delete(&template)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "template deleted"})
}
