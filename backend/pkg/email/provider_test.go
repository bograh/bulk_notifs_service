package email

import (
	"testing"
)

func TestSendGridProvider_Name(t *testing.T) {
	p := NewSendGridProvider("test-key", "from@example.com", "Test")
	if p.Name() != "sendgrid" {
		t.Errorf("Name() = %s, want sendgrid", p.Name())
	}
}

func TestSendGridProvider_Send_MissingAPIKey(t *testing.T) {
	p := NewSendGridProvider("", "from@example.com", "Test")

	msg := &EmailMessage{
		To:      "to@example.com",
		Subject: "Test",
		TextBody: "Hello",
	}

	_, err := p.Send(msg)
	if err == nil {
		t.Fatal("expected error with empty API key")
	}
}

func TestEmailMessage_Fields(t *testing.T) {
	msg := &EmailMessage{
		To:         "recipient@example.com",
		ToName:     "John Doe",
		From:       "sender@example.com",
		FromName:   "BulkNotifs",
		Subject:    "Test Subject",
		TextBody:   "Plain text",
		HTMLBody:   "<h1>HTML</h1>",
		CampaignID: 42,
	}

	if msg.To != "recipient@example.com" {
		t.Errorf("To = %s, want recipient@example.com", msg.To)
	}
	if msg.CampaignID != 42 {
		t.Errorf("CampaignID = %d, want 42", msg.CampaignID)
	}
}
