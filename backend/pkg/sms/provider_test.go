package sms

import (
	"testing"
)

func TestTwilioProvider_Name(t *testing.T) {
	p := NewTwilioProvider("sid", "token", "+1234567890")
	if p.Name() != "twilio" {
		t.Errorf("Name() = %s, want twilio", p.Name())
	}
}

func TestTermiiProvider_Name(t *testing.T) {
	p := NewTermiiProvider("api-key", "SENDER")
	if p.Name() != "termii" {
		t.Errorf("Name() = %s, want termii", p.Name())
	}
}

func TestSMSMessage_Fields(t *testing.T) {
	msg := &SMSMessage{
		To:         "+1234567890",
		Body:       "Hello World",
		CampaignID: 7,
	}

	if msg.To != "+1234567890" {
		t.Errorf("To = %s, want +1234567890", msg.To)
	}
	if msg.Body != "Hello World" {
		t.Errorf("Body = %s, want Hello World", msg.Body)
	}
	if msg.CampaignID != 7 {
		t.Errorf("CampaignID = %d, want 7", msg.CampaignID)
	}
}

func TestSendResult_Fields(t *testing.T) {
	result := &SendResult{
		ProviderID: "twilio-123",
		Cost:       0.0079,
	}

	if result.ProviderID != "twilio-123" {
		t.Errorf("ProviderID = %s, want twilio-123", result.ProviderID)
	}
	if result.Cost != 0.0079 {
		t.Errorf("Cost = %f, want 0.0079", result.Cost)
	}
}
