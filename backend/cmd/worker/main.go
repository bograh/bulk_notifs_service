package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/yourusername/bulk-notifs/internal/campaigns"
	"github.com/yourusername/bulk-notifs/pkg/config"
	"github.com/yourusername/bulk-notifs/pkg/db"
	emailpkg "github.com/yourusername/bulk-notifs/pkg/email"
	"github.com/yourusername/bulk-notifs/pkg/redis"
	smspkg "github.com/yourusername/bulk-notifs/pkg/sms"
)

type Worker struct {
	db            *db.Database
	cfg           *config.Config
	emailProvider emailpkg.Provider
	smsProvider   smspkg.Provider
}

func NewWorker(database *db.Database, cfg *config.Config) (*Worker, error) {
	w := &Worker{
		db:  database,
		cfg: cfg,
	}

	if err := w.initProviders(); err != nil {
		return nil, err
	}

	return w, nil
}

func (w *Worker) initProviders() error {
	switch strings.ToLower(w.cfg.EmailProvider) {
	case "sendgrid":
		if w.cfg.SendGridAPIKey == "" {
			return fmt.Errorf("SENDGRID_API_KEY is required for sendgrid provider")
		}
		w.emailProvider = emailpkg.NewSendGridProvider(w.cfg.SendGridAPIKey, w.cfg.FromEmail, w.cfg.FromName)
	case "ses":
		if w.cfg.AWSAccessKeyID == "" || w.cfg.AWSSecretAccessKey == "" {
			return fmt.Errorf("AWS credentials are required for SES provider")
		}
		provider, err := emailpkg.NewSESProvider(
			w.cfg.AWSAccessKeyID,
			w.cfg.AWSSecretAccessKey,
			w.cfg.AWSSESRegion,
			w.cfg.FromEmail,
			w.cfg.FromName,
		)
		if err != nil {
			return fmt.Errorf("failed to init SES provider: %w", err)
		}
		w.emailProvider = provider
	default:
		return fmt.Errorf("unsupported email provider: %s", w.cfg.EmailProvider)
	}

	switch strings.ToLower(w.cfg.SMSProvider) {
	case "twilio":
		if w.cfg.TwilioAccountSID == "" || w.cfg.TwilioAuthToken == "" || w.cfg.TwilioPhoneNumber == "" {
			return fmt.Errorf("Twilio credentials are required for twilio provider")
		}
		w.smsProvider = smspkg.NewTwilioProvider(w.cfg.TwilioAccountSID, w.cfg.TwilioAuthToken, w.cfg.TwilioPhoneNumber)
	case "termii":
		if w.cfg.TermiiAPIKey == "" {
			return fmt.Errorf("TERMII_API_KEY is required for termii provider")
		}
		w.smsProvider = smspkg.NewTermiiProvider(w.cfg.TermiiAPIKey, w.cfg.TermiiSenderID)
	default:
		return fmt.Errorf("unsupported SMS provider: %s", w.cfg.SMSProvider)
	}

	log.Printf("Email provider: %s, SMS provider: %s", w.emailProvider.Name(), w.smsProvider.Name())
	return nil
}

func (w *Worker) ProcessCampaignTask(ctx context.Context, t *asynq.Task) error {
	var payload campaigns.CampaignPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	log.Printf("Processing campaign: %d", payload.CampaignID)

	var campaign db.Campaign
	if err := w.db.Preload("ContactList.Contacts").First(&campaign, payload.CampaignID).Error; err != nil {
		return err
	}

	campaign.Status = "sending"
	now := time.Now()
	campaign.StartedAt = &now
	w.db.Save(&campaign)

	var contacts []db.Contact
	if err := w.db.Where("contact_list_id = ? AND is_subscribed = true", campaign.ContactListID).Find(&contacts).Error; err != nil {
		return err
	}

	for _, contact := range contacts {
		recipient := contact.Email
		if campaign.Type == "sms" {
			recipient = contact.PhoneNumber
		}

		message := db.Message{
			CampaignID: campaign.ID,
			ContactID:  contact.ID,
			Type:       campaign.Type,
			Recipient:  recipient,
			Status:     "pending",
		}
		w.db.Create(&message)

		var err error
		if campaign.Type == "email" {
			err = w.sendEmail(campaign, contact, &message)
		} else if campaign.Type == "sms" {
			err = w.sendSMS(campaign, contact, &message)
		}

		if err != nil {
			message.Status = "failed"
			message.ErrorMessage = err.Error()
			failedAt := time.Now()
			message.FailedAt = &failedAt
			campaign.FailedCount++
		} else {
			message.Status = "sent"
			sentAt := time.Now()
			message.SentAt = &sentAt
			campaign.SentCount++
		}
		w.db.Save(&message)
	}

	campaign.Status = "completed"
	completedAt := time.Now()
	campaign.CompletedAt = &completedAt
	w.db.Save(&campaign)

	var user db.User
	if err := w.db.Preload("Subscription").First(&user, campaign.UserID).Error; err == nil {
		if user.Subscription != nil {
			if campaign.Type == "sms" {
				user.Subscription.SMSUsed += campaign.SentCount
			} else {
				user.Subscription.EmailUsed += campaign.SentCount
			}
			w.db.Save(user.Subscription)
		}
	}

	log.Printf("Completed campaign: %d (sent: %d, failed: %d)", campaign.ID, campaign.SentCount, campaign.FailedCount)
	return nil
}

func (w *Worker) sendEmail(campaign db.Campaign, contact db.Contact, message *db.Message) error {
	toName := contact.FirstName
	if contact.LastName != "" {
		toName = contact.FirstName + " " + contact.LastName
	}

	content := campaign.Content
	if campaign.Template != nil && campaign.Template.HTMLContent != "" {
		content = campaign.Template.HTMLContent
	}

	content = replaceVariables(content, contact)

	msg := &emailpkg.EmailMessage{
		To:         contact.Email,
		ToName:     toName,
		Subject:    campaign.Subject,
		TextBody:   campaign.Content,
		HTMLBody:   content,
		CampaignID: campaign.ID,
	}

	result, err := w.emailProvider.Send(msg)
	if err != nil {
		return err
	}

	message.ProviderID = result.ProviderID
	message.Cost = result.Cost
	return nil
}

func (w *Worker) sendSMS(campaign db.Campaign, contact db.Contact, message *db.Message) error {
	body := replaceVariables(campaign.Content, contact)

	msg := &smspkg.SMSMessage{
		To:         contact.PhoneNumber,
		Body:       body,
		CampaignID: campaign.ID,
	}

	result, err := w.smsProvider.Send(msg)
	if err != nil {
		return err
	}

	message.ProviderID = result.ProviderID
	message.Cost = result.Cost
	return nil
}

func replaceVariables(content string, contact db.Contact) string {
	content = strings.ReplaceAll(content, "{{first_name}}", contact.FirstName)
	content = strings.ReplaceAll(content, "{{last_name}}", contact.LastName)
	content = strings.ReplaceAll(content, "{{email}}", contact.Email)
	content = strings.ReplaceAll(content, "{{phone}}", contact.PhoneNumber)

	for key, val := range contact.CustomFields {
		if strVal, ok := val.(string); ok {
			content = strings.ReplaceAll(content, "{{"+key+"}}", strVal)
		}
	}

	return content
}

func main() {
	cfg := config.Load()

	database, err := db.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	worker, err := NewWorker(database, cfg)
	if err != nil {
		log.Fatalf("Failed to initialize worker: %v", err)
	}

	server, err := redis.NewAsynqServer(cfg.RedisURL, 10)
	if err != nil {
		log.Fatalf("Failed to create Asynq server: %v", err)
	}

	mux := asynq.NewServeMux()
	mux.HandleFunc(campaigns.TypeCampaign, worker.ProcessCampaignTask)

	log.Println("Worker starting...")
	if err := server.Run(mux); err != nil {
		log.Fatalf("Worker failed: %v", err)
	}
}
