package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	os.Clearenv()

	cfg := Load()

	if cfg.ServerPort != "8080" {
		t.Errorf("ServerPort = %s, want 8080", cfg.ServerPort)
	}
	if cfg.EmailProvider != "sendgrid" {
		t.Errorf("EmailProvider = %s, want sendgrid", cfg.EmailProvider)
	}
	if cfg.SMSProvider != "twilio" {
		t.Errorf("SMSProvider = %s, want twilio", cfg.SMSProvider)
	}
	if cfg.AWSRegion != "us-east-1" {
		t.Errorf("AWSRegion = %s, want us-east-1", cfg.AWSRegion)
	}
	if cfg.FrontendURL != "http://localhost:3000" {
		t.Errorf("FrontendURL = %s, want http://localhost:3000", cfg.FrontendURL)
	}
}

func TestLoad_EnvironmentVariables(t *testing.T) {
	os.Clearenv()
	os.Setenv("SERVER_PORT", "9090")
	os.Setenv("EMAIL_PROVIDER", "ses")
	os.Setenv("SMS_PROVIDER", "termii")
	os.Setenv("SENDGRID_API_KEY", "test-key-123")
	os.Setenv("TWILIO_ACCOUNT_SID", "test-sid")
	os.Setenv("STRIPE_SECRET_KEY", "sk_test_123")
	os.Setenv("FROM_EMAIL", "hello@example.com")

	cfg := Load()

	if cfg.ServerPort != "9090" {
		t.Errorf("ServerPort = %s, want 9090", cfg.ServerPort)
	}
	if cfg.EmailProvider != "ses" {
		t.Errorf("EmailProvider = %s, want ses", cfg.EmailProvider)
	}
	if cfg.SMSProvider != "termii" {
		t.Errorf("SMSProvider = %s, want termii", cfg.SMSProvider)
	}
	if cfg.SendGridAPIKey != "test-key-123" {
		t.Errorf("SendGridAPIKey = %s, want test-key-123", cfg.SendGridAPIKey)
	}
	if cfg.TwilioAccountSID != "test-sid" {
		t.Errorf("TwilioAccountSID = %s, want test-sid", cfg.TwilioAccountSID)
	}
	if cfg.StripeSecretKey != "sk_test_123" {
		t.Errorf("StripeSecretKey = %s, want sk_test_123", cfg.StripeSecretKey)
	}
	if cfg.FromEmail != "hello@example.com" {
		t.Errorf("FromEmail = %s, want hello@example.com", cfg.FromEmail)
	}
}

func TestGetEnv(t *testing.T) {
	os.Clearenv()

	result := getEnv("NONEXISTENT_KEY", "default-value")
	if result != "default-value" {
		t.Errorf("getEnv() = %s, want default-value", result)
	}

	os.Setenv("EXISTING_KEY", "actual-value")
	result = getEnv("EXISTING_KEY", "default-value")
	if result != "actual-value" {
		t.Errorf("getEnv() = %s, want actual-value", result)
	}
}
