package users

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/pkg/db"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	db         *db.Database
	jwtManager *auth.JWTManager
}

func NewHandler(database *db.Database, jwtManager *auth.JWTManager) *Handler {
	return &Handler{
		db:         database,
		jwtManager: jwtManager,
	}
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Company     string `json:"company"`
	PhoneNumber string `json:"phone_number"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	User         *db.User `json:"user"`
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	var existingUser db.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		http.Error(w, "user already exists", http.StatusConflict)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
		return
	}

	// Create user
	user := db.User{
		Email:       req.Email,
		Password:    string(hashedPassword),
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Company:     req.Company,
		PhoneNumber: req.PhoneNumber,
		Role:        "user",
		IsActive:    true,
	}

	if err := h.db.Create(&user).Error; err != nil {
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	// Create free subscription for new user
	subscription := db.Subscription{
		UserID:         user.ID,
		PlanName:       "free",
		Status:         "active",
		SMSQuota:       100,
		EmailQuota:     500,
		SMSUsed:        0,
		EmailUsed:      0,
		PricePerMonth:  0,
		BillingCycle:   "monthly",
		CurrentPeriodStart: &[]time.Time{time.Now()}[0],
		CurrentPeriodEnd:   &[]time.Time{time.Now().AddDate(0, 1, 0)}[0],
	}

	if err := h.db.Create(&subscription).Error; err != nil {
		http.Error(w, "failed to create subscription", http.StatusInternalServerError)
		return
	}

	// Generate tokens
	accessToken, err := h.jwtManager.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	// Set cookies
	auth.SetAuthCookies(w, accessToken, refreshToken, r.TLS != nil)

	// Return response
	user.Password = "" // Don't send password
	response := AuthResponse{
		User:         &user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Find user
	var user db.User
	if err := h.db.Preload("Subscription").Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}

	// Check if user is active
	if !user.IsActive {
		http.Error(w, "account is inactive", http.StatusForbidden)
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate tokens
	accessToken, err := h.jwtManager.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	// Set cookies
	auth.SetAuthCookies(w, accessToken, refreshToken, r.TLS != nil)

	// Return response
	user.Password = "" // Don't send password
	response := AuthResponse{
		User:         &user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearAuthCookies(w)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out successfully"})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var user db.User
	if err := h.db.Preload("Subscription").First(&user, claims.UserID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	user.Password = ""
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		http.Error(w, "refresh token not found", http.StatusUnauthorized)
		return
	}

	claims, err := h.jwtManager.ValidateRefreshToken(cookie.Value)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	// Generate new access token
	accessToken, err := h.jwtManager.GenerateToken(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	// Set new access token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400, // 24 hours
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessToken,
	})
}

func (h *Handler) RequestEmailVerification(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var user db.User
	if err := h.db.First(&user, claims.UserID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	if user.EmailVerified {
		http.Error(w, "email already verified", http.StatusBadRequest)
		return
	}

	token := make([]byte, 32)
	rand.Read(token)
	tokenStr := hex.EncodeToString(token)

	h.db.Model(&user).Update("verification_token", tokenStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "verification email sent",
		"token":   tokenStr,
	})
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token required", http.StatusBadRequest)
		return
	}

	var user db.User
	if err := h.db.Where("verification_token = ?", token).First(&user).Error; err != nil {
		http.Error(w, "invalid or expired token", http.StatusBadRequest)
		return
	}

	user.EmailVerified = true
	user.VerificationToken = ""
	h.db.Save(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "email verified"})
}

type RequestPasswordResetRequest struct {
	Email string `json:"email"`
}

func (h *Handler) RequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req RequestPasswordResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var user db.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "if email exists, reset link sent"})
		return
	}

	token := make([]byte, 32)
	rand.Read(token)
	tokenStr := hex.EncodeToString(token)
	expiry := time.Now().Add(1 * time.Hour)

	user.ResetToken = tokenStr
	user.ResetTokenExpiry = expiry
	h.db.Save(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "if email exists, reset link sent",
		"token":   tokenStr,
	})
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		http.Error(w, "token and new_password required", http.StatusBadRequest)
		return
	}

	var user db.User
	if err := h.db.Where("reset_token = ? AND reset_token_expiry > ?", req.Token, time.Now()).First(&user).Error; err != nil {
		http.Error(w, "invalid or expired token", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
		return
	}

	user.Password = string(hashedPassword)
	user.ResetToken = ""
	user.ResetTokenExpiry = time.Time{}
	h.db.Save(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "password reset successful"})
}
