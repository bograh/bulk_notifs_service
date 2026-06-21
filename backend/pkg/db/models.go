package db

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// JSONB type for PostgreSQL
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// User model
type User struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Email             string         `gorm:"unique;not null" json:"email"`
	Password          string         `gorm:"not null" json:"-"`
	FirstName         string         `json:"first_name"`
	LastName          string         `json:"last_name"`
	Company           string         `json:"company"`
	Role              string         `gorm:"default:'user'" json:"role"` // user, admin
	IsActive          bool           `gorm:"default:true" json:"is_active"`
	EmailVerified     bool           `gorm:"default:false" json:"email_verified"`
	PhoneNumber       string         `json:"phone_number"`
	SubscriptionID    *uint          `json:"subscription_id"`
	Subscription      *Subscription  `gorm:"foreignKey:SubscriptionID" json:"subscription,omitempty"`
	VerificationToken string         `json:"-"`
	ResetToken        string         `json:"-"`
	ResetTokenExpiry  time.Time      `json:"-"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// ContactList model
type ContactList struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"not null;index" json:"user_id"`
	OrganizationID *uint          `gorm:"index" json:"organization_id"`
	Name           string         `gorm:"not null" json:"name"`
	Description    string         `json:"description"`
	TotalCount     int            `gorm:"default:0" json:"total_count"`
	ActiveCount    int            `gorm:"default:0" json:"active_count"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	
	User           User           `gorm:"foreignKey:UserID" json:"-"`
	Organization   *Organization  `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Contacts       []Contact      `gorm:"foreignKey:ContactListID" json:"contacts,omitempty"`
}

// Contact model
type Contact struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	ContactListID uint           `gorm:"not null;index" json:"contact_list_id"`
	Email         string         `gorm:"index" json:"email"`
	PhoneNumber   string         `gorm:"index" json:"phone_number"`
	FirstName     string         `json:"first_name"`
	LastName      string         `json:"last_name"`
	CustomFields  JSONB          `gorm:"type:jsonb" json:"custom_fields"`
	IsSubscribed  bool           `gorm:"default:true" json:"is_subscribed"`
	UnsubscribedAt *time.Time    `json:"unsubscribed_at"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	
	ContactList   ContactList    `gorm:"foreignKey:ContactListID" json:"-"`
	Tags          []ContactTag   `gorm:"foreignKey:ContactID" json:"tags,omitempty"`
}

// Campaign model
type Campaign struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `gorm:"not null;index" json:"user_id"`
	Name            string         `gorm:"not null" json:"name"`
	Type            string         `gorm:"not null" json:"type"` // sms, email
	Status          string         `gorm:"default:'draft'" json:"status"` // draft, scheduled, sending, completed, failed, cancelled
	Subject         string         `json:"subject"` // for emails
	Content         string         `gorm:"type:text" json:"content"`
	TemplateID      *uint          `json:"template_id"`
	ContactListID   uint           `gorm:"not null" json:"contact_list_id"`
	ScheduledAt     *time.Time     `json:"scheduled_at"`
	StartedAt       *time.Time     `json:"started_at"`
	CompletedAt     *time.Time     `json:"completed_at"`
	TotalRecipients int            `gorm:"default:0" json:"total_recipients"`
	SentCount       int            `gorm:"default:0" json:"sent_count"`
	DeliveredCount  int            `gorm:"default:0" json:"delivered_count"`
	FailedCount     int            `gorm:"default:0" json:"failed_count"`
	ClickCount      int            `gorm:"default:0" json:"click_count"`
	OpenCount       int            `gorm:"default:0" json:"open_count"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	
	User            User           `gorm:"foreignKey:UserID" json:"-"`
	Template        *Template      `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	ContactList     ContactList    `gorm:"foreignKey:ContactListID" json:"contact_list,omitempty"`
	Messages        []Message      `gorm:"foreignKey:CampaignID" json:"messages,omitempty"`
}

// Template model
type Template struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Name        string         `gorm:"not null" json:"name"`
	Type        string         `gorm:"not null" json:"type"` // sms, email
	Subject     string         `json:"subject"` // for emails
	Content     string         `gorm:"type:text;not null" json:"content"`
	HTMLContent string         `gorm:"type:text" json:"html_content"` // for emails
	Variables   JSONB          `gorm:"type:jsonb" json:"variables"`
	IsPublic    bool           `gorm:"default:false" json:"is_public"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	
	User        User           `gorm:"foreignKey:UserID" json:"-"`
}

// Message model (tracks individual message delivery)
type Message struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	CampaignID      uint           `gorm:"not null;index" json:"campaign_id"`
	ContactID       uint           `gorm:"not null;index" json:"contact_id"`
	Type            string         `gorm:"not null" json:"type"` // sms, email
	Recipient       string         `gorm:"not null" json:"recipient"` // email or phone
	Status          string         `gorm:"default:'pending'" json:"status"` // pending, sent, delivered, failed, bounced, clicked, opened
	ProviderID      string         `json:"provider_id"` // ID from SMS/email provider
	ErrorMessage    string         `json:"error_message"`
	SentAt          *time.Time     `json:"sent_at"`
	DeliveredAt     *time.Time     `json:"delivered_at"`
	OpenedAt        *time.Time     `json:"opened_at"`
	ClickedAt       *time.Time     `json:"clicked_at"`
	FailedAt        *time.Time     `json:"failed_at"`
	Cost            float64        `gorm:"default:0" json:"cost"` // cost per message
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	
	Campaign        Campaign       `gorm:"foreignKey:CampaignID" json:"-"`
	Contact         Contact        `gorm:"foreignKey:ContactID" json:"-"`
}

// Subscription model
type Subscription struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `gorm:"not null;unique;index" json:"user_id"`
	PlanName        string         `gorm:"not null" json:"plan_name"` // free, basic, pro, enterprise
	Status          string         `gorm:"default:'active'" json:"status"` // active, cancelled, expired
	SMSQuota        int            `gorm:"default:0" json:"sms_quota"`
	EmailQuota      int            `gorm:"default:0" json:"email_quota"`
	SMSUsed         int            `gorm:"default:0" json:"sms_used"`
	EmailUsed       int            `gorm:"default:0" json:"email_used"`
	PricePerMonth   float64        `json:"price_per_month"`
	BillingCycle    string         `gorm:"default:'monthly'" json:"billing_cycle"` // monthly, yearly
	StripeCustomerID string        `json:"stripe_customer_id"`
	StripeSubID     string         `json:"stripe_subscription_id"`
	CurrentPeriodStart *time.Time  `json:"current_period_start"`
	CurrentPeriodEnd   *time.Time  `json:"current_period_end"`
	CancelledAt     *time.Time     `json:"cancelled_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	
	User            User           `gorm:"foreignKey:UserID" json:"-"`
}

// Transaction model
type Transaction struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `gorm:"not null;index" json:"user_id"`
	OrganizationID  *uint          `gorm:"index" json:"organization_id"`
	Amount          float64        `gorm:"not null" json:"amount"`
	Currency        string         `gorm:"default:'USD'" json:"currency"`
	Status          string         `gorm:"default:'pending'" json:"status"` // pending, completed, failed, refunded
	Type            string         `gorm:"not null" json:"type"` // subscription, top_up
	Provider        string         `gorm:"not null" json:"provider"` // stripe, paystack
	ProviderID      string         `json:"provider_id"`
	Description     string         `json:"description"`
	Metadata        JSONB          `gorm:"type:jsonb" json:"metadata"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	
	User            User           `gorm:"foreignKey:UserID" json:"-"`
	Organization    *Organization  `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
}

// Organization model (multi-tenant)
type Organization struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Slug        string         `gorm:"unique;not null" json:"slug"`
	OwnerID     uint           `gorm:"not null;index" json:"owner_id"`
	Plan        string         `gorm:"default:'free'" json:"plan"`
	Settings    JSONB          `gorm:"type:jsonb" json:"settings"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	
	Owner       User              `gorm:"foreignKey:OwnerID" json:"-"`
	Members     []OrganizationMember `gorm:"foreignKey:OrganizationID" json:"members,omitempty"`
}

// OrganizationMember model
type OrganizationMember struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	OrganizationID uint      `gorm:"not null;index;uniqueIndex:idx_org_user" json:"organization_id"`
	UserID         uint      `gorm:"not null;index;uniqueIndex:idx_org_user" json:"user_id"`
	Role           string    `gorm:"default:'member'" json:"role"` // owner, admin, member, viewer
	InvitedEmail   string    `json:"invited_email"`
	AcceptedAt     *time.Time `json:"accepted_at"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	
	Organization   Organization `gorm:"foreignKey:OrganizationID" json:"-"`
	User           User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ContactTag model
type ContactTag struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ContactID uint      `gorm:"not null;index;uniqueIndex:idx_contact_tag" json:"contact_id"`
	Tag       string    `gorm:"not null;index;uniqueIndex:idx_contact_tag" json:"tag"`
	CreatedAt time.Time `json:"created_at"`
	
	Contact   Contact   `gorm:"foreignKey:ContactID" json:"-"`
}
