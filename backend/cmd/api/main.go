package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/yourusername/bulk-notifs/internal/admin"
	"github.com/yourusername/bulk-notifs/internal/analytics"
	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/internal/billing"
	"github.com/yourusername/bulk-notifs/internal/campaigns"
	"github.com/yourusername/bulk-notifs/internal/contacts"
	"github.com/yourusername/bulk-notifs/internal/templates"
	"github.com/yourusername/bulk-notifs/internal/users"
	"github.com/yourusername/bulk-notifs/pkg/config"
	"github.com/yourusername/bulk-notifs/pkg/db"
	"github.com/yourusername/bulk-notifs/pkg/redis"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	database, err := db.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Initialize Redis
	redisClient, err := redis.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize Asynq client
	asynqClient, err := redis.NewAsynqClient(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to create Asynq client: %v", err)
	}
	defer asynqClient.Close()

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTRefreshSecret)

	// Initialize handlers
	userHandler := users.NewHandler(database, jwtManager)
	campaignHandler := campaigns.NewHandler(database, asynqClient)
	contactHandler := contacts.NewHandler(database)
	templateHandler := templates.NewHandler(database)
	analyticsHandler := analytics.NewHandler(database)
	billingHandler := billing.NewHandler(database, cfg.StripeSecretKey, cfg.StripeWebhookSecret)
	adminHandler := admin.NewHandler(database)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Public routes
	r.Route("/api/v1", func(r chi.Router) {
		// Auth routes
		r.Post("/auth/register", userHandler.Register)
		r.Post("/auth/login", userHandler.Login)
		r.Post("/auth/refresh", userHandler.RefreshToken)
		r.Post("/auth/verify-email", userHandler.VerifyEmail)
		r.Post("/auth/request-password-reset", userHandler.RequestPasswordReset)
		r.Post("/auth/reset-password", userHandler.ResetPassword)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(jwtManager.AuthMiddleware)

			// User routes
			r.Get("/auth/profile", userHandler.GetProfile)
			r.Post("/auth/logout", userHandler.Logout)
			r.Post("/auth/request-verification", userHandler.RequestEmailVerification)

			// Campaign routes
			r.Route("/campaigns", func(r chi.Router) {
				r.Get("/", campaignHandler.GetCampaigns)
				r.Post("/", campaignHandler.CreateCampaign)
				r.Get("/{id}", campaignHandler.GetCampaign)
				r.Post("/{id}/send", campaignHandler.SendCampaign)
				r.Post("/{id}/cancel", campaignHandler.CancelCampaign)
			})

			// Contact routes
			r.Route("/contact-lists", func(r chi.Router) {
				r.Get("/", contactHandler.GetContactLists)
				r.Post("/", contactHandler.CreateContactList)
				r.Get("/{id}", contactHandler.GetContactList)
				r.Put("/{id}", contactHandler.UpdateContactList)
				r.Delete("/{id}", contactHandler.DeleteContactList)
				r.Get("/{id}/contacts", contactHandler.GetContacts)
				r.Post("/{id}/contacts", contactHandler.CreateContact)
				r.Post("/{id}/import", contactHandler.ImportContacts)
			})
			r.Put("/contacts/{id}", contactHandler.UpdateContact)
			r.Delete("/contacts/{id}", contactHandler.DeleteContact)

			// Template routes
			r.Route("/templates", func(r chi.Router) {
				r.Get("/", templateHandler.GetTemplates)
				r.Post("/", templateHandler.CreateTemplate)
				r.Get("/{id}", templateHandler.GetTemplate)
				r.Put("/{id}", templateHandler.UpdateTemplate)
				r.Delete("/{id}", templateHandler.DeleteTemplate)
			})

			// Analytics routes
			r.Get("/analytics/summary", analyticsHandler.GetSummary)
			r.Get("/analytics/daily", analyticsHandler.GetDailyStats)
			r.Get("/analytics/campaigns/{id}", analyticsHandler.GetCampaignAnalytics)

			// Billing routes
			r.Get("/billing/plans", billingHandler.GetPlans)
			r.Get("/billing/plans/{name}", billingHandler.GetPlanByName)
			r.Get("/billing/subscription", billingHandler.GetCurrentSubscription)
			r.Post("/billing/subscribe", billingHandler.Subscribe)
			r.Post("/billing/cancel", billingHandler.CancelSubscription)
			r.Get("/billing/transactions", billingHandler.GetTransactions)
		})

		// Admin routes
		r.Group(func(r chi.Router) {
			r.Use(jwtManager.AuthMiddleware)
			r.Use(jwtManager.AdminMiddleware)

			r.Get("/admin/stats", adminHandler.GetSystemStats)
			r.Get("/admin/users", adminHandler.GetUsers)
			r.Get("/admin/users/{id}", adminHandler.GetUser)
			r.Put("/admin/users/{id}", adminHandler.UpdateUser)
			r.Delete("/admin/users/{id}", adminHandler.DeleteUser)
			r.Put("/admin/users/{id}/subscription", adminHandler.UpdateUserSubscription)
		})

		// Stripe webhook (no auth - verified by signature)
		r.Post("/webhooks/stripe", billingHandler.HandleWebhook)
	})

	// Start server
	addr := ":" + cfg.ServerPort
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
