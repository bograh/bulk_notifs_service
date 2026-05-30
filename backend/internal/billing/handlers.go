package billing

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"
	"github.com/yourusername/bulk-notifs/internal/auth"
	"github.com/yourusername/bulk-notifs/pkg/db"
)

type Plan struct {
	Name          string  `json:"name"`
	SMSQuota      int     `json:"sms_quota"`
	EmailQuota    int     `json:"email_quota"`
	PricePerMonth float64 `json:"price_per_month"`
	StripePriceID string  `json:"stripe_price_id"`
}

var Plans = map[string]Plan{
	"free": {
		Name:          "free",
		SMSQuota:      100,
		EmailQuota:    500,
		PricePerMonth: 0,
	},
	"basic": {
		Name:          "basic",
		SMSQuota:      5000,
		EmailQuota:    25000,
		PricePerMonth: 29.99,
	},
	"pro": {
		Name:          "pro",
		SMSQuota:      25000,
		EmailQuota:    100000,
		PricePerMonth: 99.99,
	},
	"enterprise": {
		Name:          "enterprise",
		SMSQuota:      100000,
		EmailQuota:    500000,
		PricePerMonth: 299.99,
	},
}

type Handler struct {
	db            *db.Database
	stripeKey     string
	webhookSecret string
}

func NewHandler(database *db.Database, stripeKey, webhookSecret string) *Handler {
	stripe.Key = stripeKey
	return &Handler{
		db:            database,
		stripeKey:     stripeKey,
		webhookSecret: webhookSecret,
	}
}

func (h *Handler) GetPlans(w http.ResponseWriter, r *http.Request) {
	plans := make([]Plan, 0, len(Plans))
	for _, p := range Plans {
		plans = append(plans, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plans)
}

func (h *Handler) GetCurrentSubscription(w http.ResponseWriter, r *http.Request) {
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user.Subscription)
}

type SubscribeRequest struct {
	PlanName string `json:"plan_name"`
}

func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req SubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	plan, ok := Plans[req.PlanName]
	if !ok {
		http.Error(w, "invalid plan", http.StatusBadRequest)
		return
	}

	if plan.PricePerMonth == 0 {
		http.Error(w, "free plan does not require subscription", http.StatusBadRequest)
		return
	}

	if plan.StripePriceID == "" {
		http.Error(w, "plan not available for purchase", http.StatusBadRequest)
		return
	}

	var user db.User
	if err := h.db.First(&user, claims.UserID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	var stripeCustomerID string
	if user.Subscription != nil && user.Subscription.StripeCustomerID != "" {
		stripeCustomerID = user.Subscription.StripeCustomerID
	} else {
		custParams := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
			Name:  stripe.String(user.FirstName + " " + user.LastName),
		}
		custParams.AddMetadata("user_id", string(rune(user.ID)))
		cust, err := customer.New(custParams)
		if err != nil {
			http.Error(w, "failed to create stripe customer: "+err.Error(), http.StatusInternalServerError)
			return
		}
		stripeCustomerID = cust.ID
	}

	sessionParams := &stripe.CheckoutSessionParams{
		Customer:              stripe.String(stripeCustomerID),
		PaymentMethodTypes:    stripe.StringSlice([]string{"card"}),
		Mode:                  stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL:            stripe.String(r.Header.Get("Origin") + "/billing?success=true"),
		CancelURL:             stripe.String(r.Header.Get("Origin") + "/billing?canceled=true"),
		ClientReferenceID:     stripe.String(string(rune(user.ID))),
	}
	sessionParams.LineItems = []*stripe.CheckoutSessionLineItemParams{
		{
			Price:    stripe.String(plan.StripePriceID),
			Quantity: stripe.Int64(1),
		},
	}

	sess, err := session.New(sessionParams)
	if err != nil {
		http.Error(w, "failed to create checkout session: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"checkout_url": sess.URL,
		"session_id":   sess.ID,
	})
}

func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
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

	if user.Subscription == nil || user.Subscription.StripeSubID == "" {
		http.Error(w, "no active paid subscription", http.StatusBadRequest)
		return
	}

	_, err = subscription.Cancel(user.Subscription.StripeSubID, nil)
	if err != nil {
		http.Error(w, "failed to cancel subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	now := time.Now()
	user.Subscription.Status = "cancelled"
	user.Subscription.CancelledAt = &now
	h.db.Save(user.Subscription)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "subscription cancelled"})
}

func (h *Handler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	claims, err := auth.GetUserFromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var transactions []db.Transaction
	if err := h.db.Where("user_id = ?", claims.UserID).
		Order("created_at DESC").
		Limit(50).
		Find(&transactions).Error; err != nil {
		http.Error(w, "failed to fetch transactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), h.webhookSecret)
	if err != nil {
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		h.handleCheckoutCompleted(event)
	case "customer.subscription.updated":
		h.handleSubscriptionUpdated(event)
	case "customer.subscription.deleted":
		h.handleSubscriptionDeleted(event)
	case "invoice.payment_succeeded":
		h.handlePaymentSucceeded(event)
	case "invoice.payment_failed":
		h.handlePaymentFailed(event)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) handleCheckoutCompleted(event stripe.Event) {
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		return
	}

	if sess.Subscription == nil {
		return
	}

	sub, err := subscription.Get(sess.Subscription.ID, nil)
	if err != nil {
		return
	}

	var user db.User
	if err := h.db.Preload("Subscription").Where("email = ?", sess.CustomerDetails.Email).First(&user).Error; err != nil {
		return
	}

	if user.Subscription == nil {
		return
	}

	planName := "basic"
	if plan, ok := determinePlanFromSubscription(sub); ok {
		planName = plan.Name
	}

	plan := Plans[planName]
	now := time.Now()
	periodEnd := time.Unix(sub.CurrentPeriodEnd, 0)

	user.Subscription.PlanName = planName
	user.Subscription.Status = "active"
	user.Subscription.SMSQuota = plan.SMSQuota
	user.Subscription.EmailQuota = plan.EmailQuota
	user.Subscription.SMSUsed = 0
	user.Subscription.EmailUsed = 0
	user.Subscription.PricePerMonth = plan.PricePerMonth
	user.Subscription.StripeCustomerID = sess.Customer.ID
	user.Subscription.StripeSubID = sub.ID
	user.Subscription.CurrentPeriodStart = &now
	user.Subscription.CurrentPeriodEnd = &periodEnd
	h.db.Save(user.Subscription)

	h.db.Create(&db.Transaction{
		UserID:      user.ID,
		Amount:      plan.PricePerMonth,
		Currency:    "USD",
		Status:      "completed",
		Type:        "subscription",
		Provider:    "stripe",
		ProviderID:  sess.PaymentIntent.ID,
		Description: "Subscription to " + planName + " plan",
	})
}

func (h *Handler) handleSubscriptionUpdated(event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return
	}

	var userSub db.Subscription
	if err := h.db.Where("stripe_sub_id = ?", sub.ID).First(&userSub).Error; err != nil {
		return
	}

	periodEnd := time.Unix(sub.CurrentPeriodEnd, 0)
	userSub.CurrentPeriodEnd = &periodEnd

	switch sub.Status {
	case stripe.SubscriptionStatusActive:
		userSub.Status = "active"
	case stripe.SubscriptionStatusPastDue:
		userSub.Status = "active"
	case stripe.SubscriptionStatusCanceled, stripe.SubscriptionStatusUnpaid:
		userSub.Status = "cancelled"
	}

	h.db.Save(&userSub)
}

func (h *Handler) handleSubscriptionDeleted(event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return
	}

	var userSub db.Subscription
	if err := h.db.Where("stripe_sub_id = ?", sub.ID).First(&userSub).Error; err != nil {
		return
	}

	now := time.Now()
	userSub.Status = "expired"
	userSub.CancelledAt = &now
	h.db.Save(&userSub)
}

func (h *Handler) handlePaymentSucceeded(event stripe.Event) {
	var invoice struct {
		ID              string  `json:"id"`
		AmountPaid      int64   `json:"amount_paid"`
		Currency        string  `json:"currency"`
		Customer        string  `json:"customer"`
		Subscription    string  `json:"subscription"`
	}
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return
	}

	var userSub db.Subscription
	if err := h.db.Where("stripe_sub_id = ?", invoice.Subscription).First(&userSub).Error; err != nil {
		return
	}

	now := time.Now()
	plan := Plans[userSub.PlanName]
	userSub.SMSUsed = 0
	userSub.EmailUsed = 0
	userSub.CurrentPeriodStart = &now
	userSub.CurrentPeriodEnd = &[]time.Time{now.AddDate(0, 1, 0)}[0]
	h.db.Save(&userSub)

	h.db.Create(&db.Transaction{
		UserID:      userSub.UserID,
		Amount:      plan.PricePerMonth,
		Currency:    "USD",
		Status:      "completed",
		Type:        "subscription",
		Provider:    "stripe",
		ProviderID:  invoice.ID,
		Description: "Monthly subscription payment",
	})
}

func (h *Handler) handlePaymentFailed(event stripe.Event) {
	var invoice struct {
		ID           string `json:"id"`
		Subscription string `json:"subscription"`
	}
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return
	}

	var userSub db.Subscription
	if err := h.db.Where("stripe_sub_id = ?", invoice.Subscription).First(&userSub).Error; err != nil {
		return
	}

	h.db.Create(&db.Transaction{
		UserID:      userSub.UserID,
		Amount:      0,
		Currency:    "USD",
		Status:      "failed",
		Type:        "subscription",
		Provider:    "stripe",
		ProviderID:  invoice.ID,
		Description: "Failed subscription payment",
	})
}

func determinePlanFromSubscription(sub *stripe.Subscription) (Plan, bool) {
	if len(sub.Items.Data) == 0 {
		return Plan{}, false
	}

	priceID := sub.Items.Data[0].Price.ID
	for _, plan := range Plans {
		if plan.StripePriceID == priceID {
			return plan, true
		}
	}

	return Plan{}, false
}

func (h *Handler) GetPlanByName(w http.ResponseWriter, r *http.Request) {
	planName := chi.URLParam(r, "name")

	plan, ok := Plans[planName]
	if !ok {
		http.Error(w, "plan not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plan)
}
