package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestJWTManager_GenerateAndValidateToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", "test-refresh-secret")

	token, err := manager.GenerateToken(1, "test@example.com", "user")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if token == "" {
		t.Fatal("GenerateToken() returned empty token")
	}

	claims, err := manager.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}

	if claims.UserID != 1 {
		t.Errorf("claims.UserID = %d, want 1", claims.UserID)
	}
	if claims.Email != "test@example.com" {
		t.Errorf("claims.Email = %s, want test@example.com", claims.Email)
	}
	if claims.Role != "user" {
		t.Errorf("claims.Role = %s, want user", claims.Role)
	}
}

func TestJWTManager_GenerateAndValidateRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", "test-refresh-secret")

	token, err := manager.GenerateRefreshToken(2, "admin@example.com", "admin")
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	claims, err := manager.ValidateRefreshToken(token)
	if err != nil {
		t.Fatalf("ValidateRefreshToken() error = %v", err)
	}

	if claims.UserID != 2 {
		t.Errorf("claims.UserID = %d, want 2", claims.UserID)
	}
	if claims.Role != "admin" {
		t.Errorf("claims.Role = %s, want admin", claims.Role)
	}
}

func TestJWTManager_ValidateToken_InvalidToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", "test-refresh-secret")

	_, err := manager.ValidateToken("invalid-token")
	if err == nil {
		t.Fatal("ValidateToken() expected error for invalid token")
	}
}

func TestJWTManager_ValidateToken_WrongSecret(t *testing.T) {
	manager1 := NewJWTManager("secret-1", "refresh-1")
	manager2 := NewJWTManager("secret-2", "refresh-2")

	token, _ := manager1.GenerateToken(1, "test@example.com", "user")

	_, err := manager2.ValidateToken(token)
	if err == nil {
		t.Fatal("ValidateToken() expected error for wrong secret")
	}
}

func TestJWTManager_ValidateToken_ExpiredToken(t *testing.T) {
	manager := &JWTManager{
		secretKey:        "test-secret",
		refreshSecretKey: "test-refresh",
		tokenDuration:    -1 * time.Hour,
		refreshDuration:  -1 * time.Hour,
	}

	token, _ := manager.GenerateToken(1, "test@example.com", "user")

	_, err := manager.ValidateToken(token)
	if err == nil {
		t.Fatal("ValidateToken() expected error for expired token")
	}
}

func TestAuthMiddleware_NoToken(t *testing.T) {
	manager := NewJWTManager("test-secret", "test-refresh")

	handler := manager.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
	}
}

func TestAuthMiddleware_ValidTokenInHeader(t *testing.T) {
	manager := NewJWTManager("test-secret", "test-refresh")

	token, _ := manager.GenerateToken(1, "test@example.com", "user")

	handler := manager.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := GetUserFromContext(r.Context())
		if err != nil {
			t.Fatalf("GetUserFromContext() error = %v", err)
		}
		if claims.UserID != 1 {
			t.Errorf("claims.UserID = %d, want 1", claims.UserID)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}
}

func TestAuthMiddleware_ValidTokenInCookie(t *testing.T) {
	manager := NewJWTManager("test-secret", "test-refresh")

	token, _ := manager.GenerateToken(1, "test@example.com", "user")

	handler := manager.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}
}

func TestAdminMiddleware_NonAdminUser(t *testing.T) {
	manager := NewJWTManager("test-secret", "test-refresh")

	claims := &Claims{UserID: 1, Email: "user@example.com", Role: "user"}
	ctx := context.WithValue(context.Background(), UserContextKey, claims)

	handler := manager.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called for non-admin")
	}))

	req := httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusForbidden)
	}
}

func TestAdminMiddleware_AdminUser(t *testing.T) {
	manager := NewJWTManager("test-secret", "test-refresh")

	claims := &Claims{UserID: 1, Email: "admin@example.com", Role: "admin"}
	ctx := context.WithValue(context.Background(), UserContextKey, claims)

	handler := manager.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}
}

func TestSetAndClearAuthCookies(t *testing.T) {
	rr := httptest.NewRecorder()
	SetAuthCookies(rr, "access-token-value", "refresh-token-value", false)

	cookies := rr.Result().Cookies()
	if len(cookies) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(cookies))
	}

	var accessCookie, refreshCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "access_token" {
			accessCookie = c
		}
		if c.Name == "refresh_token" {
			refreshCookie = c
		}
	}

	if accessCookie == nil {
		t.Fatal("access_token cookie not found")
	}
	if accessCookie.Value != "access-token-value" {
		t.Errorf("access_token value = %s, want access-token-value", accessCookie.Value)
	}
	if !accessCookie.HttpOnly {
		t.Error("access_token should be HttpOnly")
	}

	if refreshCookie == nil {
		t.Fatal("refresh_token cookie not found")
	}
	if refreshCookie.MaxAge != 604800 {
		t.Errorf("refresh_token MaxAge = %d, want 604800", refreshCookie.MaxAge)
	}

	rr2 := httptest.NewRecorder()
	ClearAuthCookies(rr2)

	cookies2 := rr2.Result().Cookies()
	for _, c := range cookies2 {
		if c.MaxAge != -1 {
			t.Errorf("cookie %s MaxAge = %d, want -1", c.Name, c.MaxAge)
		}
	}
}

func TestGetUserFromContext_Missing(t *testing.T) {
	_, err := GetUserFromContext(context.Background())
	if err == nil {
		t.Fatal("expected error for missing user in context")
	}
}
