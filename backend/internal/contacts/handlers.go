package contacts

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/pkg/db"
	"gorm.io/gorm"
)

type Handler struct {
	db *db.Database
}

func NewHandler(database *db.Database) *Handler {
	return &Handler{db: database}
}

type CreateContactListRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateContactListRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreateContactRequest struct {
	Email        string         `json:"email"`
	PhoneNumber  string         `json:"phone_number"`
	FirstName    string         `json:"first_name"`
	LastName     string         `json:"last_name"`
	CustomFields db.JSONB       `json:"custom_fields"`
	IsSubscribed *bool          `json:"is_subscribed"`
}

type UpdateContactRequest struct {
	Email        string         `json:"email"`
	PhoneNumber  string         `json:"phone_number"`
	FirstName    string         `json:"first_name"`
	LastName     string         `json:"last_name"`
	CustomFields db.JSONB       `json:"custom_fields"`
	IsSubscribed *bool          `json:"is_subscribed"`
}

func (h *Handler) GetContactLists(w http.ResponseWriter, r *http.Request) {
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

	var lists []db.ContactList
	var total int64

	h.db.Model(&db.ContactList{}).Where("user_id = ?", claims.UserID).Count(&total)

	if err := h.db.Where("user_id = ?", claims.UserID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&lists).Error; err != nil {
		http.Error(w, "failed to fetch contact lists", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"contact_lists": lists,
		"total":         total,
		"page":          page,
		"per_page":      limit,
	})
}

func (h *Handler) CreateContactList(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateContactListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	list := db.ContactList{
		UserID:      claims.UserID,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.db.Create(&list).Error; err != nil {
		http.Error(w, "failed to create contact list", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) GetContactList(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) UpdateContactList(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	var req UpdateContactListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		list.Name = req.Name
	}
	if req.Description != "" {
		list.Description = req.Description
	}

	h.db.Save(&list)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) DeleteContactList(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	var campaignCount int64
	h.db.Model(&db.Campaign{}).Where("contact_list_id = ?", list.ID).Count(&campaignCount)
	if campaignCount > 0 {
		http.Error(w, "cannot delete contact list with active campaigns", http.StatusConflict)
		return
	}

	h.db.Delete(&list)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "contact list deleted"})
}

func (h *Handler) GetContacts(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	search := r.URL.Query().Get("search")
	subscribed := r.URL.Query().Get("subscribed")

	query := h.db.Where("contact_list_id = ?", list.ID)

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR phone_number ILIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm)
	}

	if subscribed != "" {
		isSubscribed := subscribed == "true"
		query = query.Where("is_subscribed = ?", isSubscribed)
	}

	var contacts []db.Contact
	var total int64

	query.Model(&db.Contact{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&contacts).Error; err != nil {
		http.Error(w, "failed to fetch contacts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"contacts": contacts,
		"total":    total,
		"page":     page,
		"per_page": limit,
	})
}

func (h *Handler) CreateContact(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	var req CreateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" && req.PhoneNumber == "" {
		http.Error(w, "email or phone_number is required", http.StatusBadRequest)
		return
	}

	if req.Email != "" {
		var existing db.Contact
		if err := h.db.Where("contact_list_id = ? AND email = ?", list.ID, req.Email).First(&existing).Error; err == nil {
			http.Error(w, "contact with this email already exists in this list", http.StatusConflict)
			return
		}
	}

	isSubscribed := true
	if req.IsSubscribed != nil {
		isSubscribed = *req.IsSubscribed
	}

	contact := db.Contact{
		ContactListID: list.ID,
		Email:         req.Email,
		PhoneNumber:   req.PhoneNumber,
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		CustomFields:  req.CustomFields,
		IsSubscribed:  isSubscribed,
	}

	if err := h.db.Create(&contact).Error; err != nil {
		http.Error(w, "failed to create contact", http.StatusInternalServerError)
		return
	}

	h.recalculateListCounts(list.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(contact)
}

func (h *Handler) UpdateContact(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	contactID := chi.URLParam(r, "id")

	var contact db.Contact
	if err := h.db.Joins("JOIN contact_lists ON contact_lists.id = contacts.contact_list_id").
		Where("contacts.id = ? AND contact_lists.user_id = ?", contactID, claims.UserID).
		First(&contact).Error; err != nil {
		http.Error(w, "contact not found", http.StatusNotFound)
		return
	}

	var req UpdateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email != "" {
		contact.Email = req.Email
	}
	if req.PhoneNumber != "" {
		contact.PhoneNumber = req.PhoneNumber
	}
	if req.FirstName != "" {
		contact.FirstName = req.FirstName
	}
	if req.LastName != "" {
		contact.LastName = req.LastName
	}
	if req.CustomFields != nil {
		contact.CustomFields = req.CustomFields
	}
	if req.IsSubscribed != nil {
		wasSubscribed := contact.IsSubscribed
		contact.IsSubscribed = *req.IsSubscribed
		if wasSubscribed && !*req.IsSubscribed {
			now := time.Now()
			contact.UnsubscribedAt = &now
		} else if !wasSubscribed && *req.IsSubscribed {
			contact.UnsubscribedAt = nil
		}
	}

	h.db.Save(&contact)
	h.recalculateListCounts(contact.ContactListID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contact)
}

func (h *Handler) DeleteContact(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	contactID := chi.URLParam(r, "id")

	var contact db.Contact
	if err := h.db.Joins("JOIN contact_lists ON contact_lists.id = contacts.contact_list_id").
		Where("contacts.id = ? AND contact_lists.user_id = ?", contactID, claims.UserID).
		First(&contact).Error; err != nil {
		http.Error(w, "contact not found", http.StatusNotFound)
		return
	}

	listID := contact.ContactListID
	h.db.Delete(&contact)
	h.recalculateListCounts(listID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "contact deleted"})
}

func (h *Handler) ImportContacts(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	listID := chi.URLParam(r, "id")

	var list db.ContactList
	if err := h.db.Where("id = ? AND user_id = ?", listID, claims.UserID).First(&list).Error; err != nil {
		http.Error(w, "contact list not found", http.StatusNotFound)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		http.Error(w, "failed to read CSV file", http.StatusBadRequest)
		return
	}

	if len(records) < 2 {
		http.Error(w, "CSV file must have a header row and at least one data row", http.StatusBadRequest)
		return
	}

	header := records[0]
	colMap := make(map[string]int)
	for i, col := range header {
		colMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	emailIdx, hasEmail := colMap["email"]
	phoneIdx, hasPhone := colMap["phone_number"]
	firstNameIdx, hasFirstName := colMap["first_name"]
	lastNameIdx, hasLastName := colMap["last_name"]

	if !hasEmail && !hasPhone {
		http.Error(w, "CSV must contain at least an 'email' or 'phone_number' column", http.StatusBadRequest)
		return
	}

	imported := 0
	skipped := 0
	var errors []string

	for i, record := range records[1:] {
		rowNum := i + 2

		var email, phone, firstName, lastName string
		if hasEmail && emailIdx < len(record) {
			email = strings.TrimSpace(record[emailIdx])
		}
		if hasPhone && phoneIdx < len(record) {
			phone = strings.TrimSpace(record[phoneIdx])
		}
		if hasFirstName && firstNameIdx < len(record) {
			firstName = strings.TrimSpace(record[firstNameIdx])
		}
		if hasLastName && lastNameIdx < len(record) {
			lastName = strings.TrimSpace(record[lastNameIdx])
		}

		if email == "" && phone == "" {
			errors = append(errors, "row "+strconv.Itoa(rowNum)+": missing email and phone")
			skipped++
			continue
		}

		if email != "" {
			var existing db.Contact
			if err := h.db.Where("contact_list_id = ? AND email = ?", list.ID, email).First(&existing).Error; err == nil {
				skipped++
				continue
			}
		}

		contact := db.Contact{
			ContactListID: list.ID,
			Email:         email,
			PhoneNumber:   phone,
			FirstName:     firstName,
			LastName:      lastName,
			IsSubscribed:  true,
		}

		if err := h.db.Create(&contact).Error; err != nil {
			errors = append(errors, "row "+strconv.Itoa(rowNum)+": "+err.Error())
			skipped++
			continue
		}

		imported++
	}

	h.recalculateListCounts(list.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
	})
}

func (h *Handler) recalculateListCounts(listID uint) {
	var totalCount int64
	h.db.Model(&db.Contact{}).Where("contact_list_id = ?", listID).Count(&totalCount)

	var activeCount int64
	h.db.Model(&db.Contact{}).Where("contact_list_id = ? AND is_subscribed = true", listID).Count(&activeCount)

	h.db.Model(&db.ContactList{}).Where("id = ?", listID).Updates(map[string]interface{}{
		"total_count":  totalCount,
		"active_count": activeCount,
	})
}

func (h *Handler) verifyListOwnership(tx *gorm.DB, listID, userID uint) error {
	return tx.Where("id = ? AND user_id = ?", listID, userID).First(&db.ContactList{}).Error
}
