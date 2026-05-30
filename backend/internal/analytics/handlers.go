package analytics

import (
	"encoding/json"
	"net/http"
	"time"

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

type SummaryStats struct {
	TotalCampaigns int64 `json:"total_campaigns"`
	TotalSent      int64 `json:"total_sent"`
	TotalDelivered int64 `json:"total_delivered"`
	TotalFailed    int64 `json:"total_failed"`
	TotalOpened    int64 `json:"total_opened"`
	TotalClicked   int64 `json:"total_clicked"`
	TotalContacts  int64 `json:"total_contacts"`
	TotalLists     int64 `json:"total_lists"`
	TotalTemplates int64 `json:"total_templates"`
	SMSSent        int64 `json:"sms_sent"`
	EmailSent      int64 `json:"email_sent"`
}

type CampaignAnalytics struct {
	CampaignID     uint    `json:"campaign_id"`
	CampaignName   string  `json:"campaign_name"`
	Type           string  `json:"type"`
	Status         string  `json:"status"`
	TotalRecipients int   `json:"total_recipients"`
	SentCount      int     `json:"sent_count"`
	DeliveredCount int     `json:"delivered_count"`
	FailedCount    int     `json:"failed_count"`
	OpenCount      int     `json:"open_count"`
	ClickCount     int     `json:"click_count"`
	DeliveryRate   float64 `json:"delivery_rate"`
	OpenRate       float64 `json:"open_rate"`
	ClickRate      float64 `json:"click_rate"`
}

type DailyStats struct {
	Date  string `json:"date"`
	Sent  int64  `json:"sent"`
	Email int64  `json:"email"`
	SMS   int64  `json:"sms"`
}

func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var stats SummaryStats

	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).Count(&stats.TotalCampaigns)

	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).
		Select("COALESCE(SUM(sent_count), 0)").Scan(&stats.TotalSent)
	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).
		Select("COALESCE(SUM(delivered_count), 0)").Scan(&stats.TotalDelivered)
	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).
		Select("COALESCE(SUM(failed_count), 0)").Scan(&stats.TotalFailed)
	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).
		Select("COALESCE(SUM(open_count), 0)").Scan(&stats.TotalOpened)
	h.db.Model(&db.Campaign{}).Where("user_id = ?", claims.UserID).
		Select("COALESCE(SUM(click_count), 0)").Scan(&stats.TotalClicked)

	h.db.Model(&db.Campaign{}).Where("user_id = ? AND type = ?", claims.UserID, "sms").
		Select("COALESCE(SUM(sent_count), 0)").Scan(&stats.SMSSent)
	h.db.Model(&db.Campaign{}).Where("user_id = ? AND type = ?", claims.UserID, "email").
		Select("COALESCE(SUM(sent_count), 0)").Scan(&stats.EmailSent)

	h.db.Model(&db.Contact{}).
		Joins("JOIN contact_lists ON contact_lists.id = contacts.contact_list_id").
		Where("contact_lists.user_id = ?", claims.UserID).
		Count(&stats.TotalContacts)

	h.db.Model(&db.ContactList{}).Where("user_id = ?", claims.UserID).Count(&stats.TotalLists)
	h.db.Model(&db.Template{}).Where("user_id = ?", claims.UserID).Count(&stats.TotalTemplates)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *Handler) GetCampaignAnalytics(w http.ResponseWriter, r *http.Request) {
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

	analytics := CampaignAnalytics{
		CampaignID:      campaign.ID,
		CampaignName:    campaign.Name,
		Type:            campaign.Type,
		Status:          campaign.Status,
		TotalRecipients: campaign.TotalRecipients,
		SentCount:       campaign.SentCount,
		DeliveredCount:  campaign.DeliveredCount,
		FailedCount:     campaign.FailedCount,
		OpenCount:       campaign.OpenCount,
		ClickCount:      campaign.ClickCount,
	}

	if campaign.SentCount > 0 {
		analytics.DeliveryRate = float64(campaign.DeliveredCount) / float64(campaign.SentCount) * 100
	}
	if campaign.DeliveredCount > 0 {
		analytics.OpenRate = float64(campaign.OpenCount) / float64(campaign.DeliveredCount) * 100
		analytics.ClickRate = float64(campaign.ClickCount) / float64(campaign.DeliveredCount) * 100
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func (h *Handler) GetDailyStats(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	days := 30
	since := time.Now().AddDate(0, 0, -days)

	type result struct {
		Date  string
		Email int64
		SMS   int64
	}

	var results []result
	h.db.Raw(`
		SELECT DATE(m.created_at) as date,
			COALESCE(SUM(CASE WHEN m.type = 'email' THEN 1 ELSE 0 END), 0) as email,
			COALESCE(SUM(CASE WHEN m.type = 'sms' THEN 1 ELSE 0 END), 0) as sms
		FROM messages m
		JOIN campaigns c ON c.id = m.campaign_id
		WHERE c.user_id = ? AND m.created_at >= ? AND m.status = 'sent'
		GROUP BY DATE(m.created_at)
		ORDER BY date ASC
	`, claims.UserID, since).Scan(&results)

	stats := make([]DailyStats, len(results))
	for i, r := range results {
		stats[i] = DailyStats{
			Date:  r.Date,
			Email: r.Email,
			SMS:   r.SMS,
			Sent:  r.Email + r.SMS,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
