package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL          string
	RedisURL             string
	JWTSecret            string
	JWTRefreshSecret     string
	ServerPort           string
	FrontendURL          string
	
	// AWS S3
	AWSS3Bucket          string
	AWSAccessKeyID       string
	AWSSecretAccessKey   string
	AWSRegion            string
	
	// Email providers
	EmailProvider        string
	SendGridAPIKey       string
	MailgunAPIKey        string
	MailgunDomain        string
	AWSSESRegion         string
	FromEmail            string
	FromName             string
	
	// SMS providers
	SMSProvider          string
	TwilioAccountSID     string
	TwilioAuthToken      string
	TwilioPhoneNumber    string
	TermiiAPIKey         string
	TermiiSenderID       string
	
	// Billing
	StripeSecretKey      string
	StripeWebhookSecret  string
	PaystackSecretKey    string
}

func Load() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://localhost:5432/bulksaas?sslmode=disable"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTRefreshSecret:     getEnv("JWT_REFRESH_SECRET", "your-refresh-secret-key"),
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:3000"),
		
		AWSS3Bucket:          getEnv("AWS_S3_BUCKET", ""),
		AWSAccessKeyID:       getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey:   getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSRegion:            getEnv("AWS_REGION", "us-east-1"),
		
		EmailProvider:        getEnv("EMAIL_PROVIDER", "sendgrid"),
		SendGridAPIKey:       getEnv("SENDGRID_API_KEY", ""),
		MailgunAPIKey:        getEnv("MAILGUN_API_KEY", ""),
		MailgunDomain:        getEnv("MAILGUN_DOMAIN", ""),
		AWSSESRegion:         getEnv("AWS_SES_REGION", "us-east-1"),
		FromEmail:            getEnv("FROM_EMAIL", "noreply@bulknotifs.com"),
		FromName:             getEnv("FROM_NAME", "BulkNotifs"),
		
		SMSProvider:          getEnv("SMS_PROVIDER", "twilio"),
		TwilioAccountSID:     getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioAuthToken:      getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioPhoneNumber:    getEnv("TWILIO_PHONE_NUMBER", ""),
		TermiiAPIKey:         getEnv("TERMII_API_KEY", ""),
		TermiiSenderID:       getEnv("TERMII_SENDER_ID", ""),
		
		StripeSecretKey:      getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", ""),
		PaystackSecretKey:    getEnv("PAYSTACK_SECRET_KEY", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
