package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type SendGridProvider struct {
	apiKey     string
	fromEmail  string
	fromName   string
	httpClient *http.Client
}

func NewSendGridProvider(apiKey, fromEmail, fromName string) *SendGridProvider {
	return &SendGridProvider{
		apiKey:     apiKey,
		fromEmail:  fromEmail,
		fromName:   fromName,
		httpClient: &http.Client{},
	}
}

func (s *SendGridProvider) Name() string {
	return "sendgrid"
}

type sendGridRequest struct {
	Personalizations []sendGridPersonalization `json:"personalizations"`
	From             sendGridEmail             `json:"from"`
	Subject          string                    `json:"subject"`
	Content          []sendGridContent         `json:"content"`
	TrackingSettings sendGridTracking          `json:"tracking_settings"`
}

type sendGridPersonalization struct {
	To []sendGridEmail `json:"to"`
}

type sendGridEmail struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type sendGridContent struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type sendGridTracking struct {
	ClickTracking sendGridClickTracking `json:"click_tracking"`
	OpenTracking  sendGridOpenTracking  `json:"open_tracking"`
}

type sendGridClickTracking struct {
	Enable bool `json:"enable"`
}

type sendGridOpenTracking struct {
	Enable bool `json:"enable"`
}

func (s *SendGridProvider) Send(msg *EmailMessage) (*SendResult, error) {
	fromName := s.fromName
	if msg.FromName != "" {
		fromName = msg.FromName
	}
	fromEmail := s.fromEmail
	if msg.From != "" {
		fromEmail = msg.From
	}

	content := []sendGridContent{}
	if msg.TextBody != "" {
		content = append(content, sendGridContent{Type: "text/plain", Value: msg.TextBody})
	}
	if msg.HTMLBody != "" {
		content = append(content, sendGridContent{Type: "text/html", Value: msg.HTMLBody})
	}
	if len(content) == 0 {
		content = append(content, sendGridContent{Type: "text/plain", Value: msg.TextBody})
	}

	payload := sendGridRequest{
		Personalizations: []sendGridPersonalization{
			{
				To: []sendGridEmail{{Email: msg.To, Name: msg.ToName}},
			},
		},
		From:    sendGridEmail{Email: fromEmail, Name: fromName},
		Subject: msg.Subject,
		Content: content,
		TrackingSettings: sendGridTracking{
			ClickTracking: sendGridClickTracking{Enable: true},
			OpenTracking:  sendGridOpenTracking{Enable: true},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal sendgrid request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.sendgrid.com/v3/mail/send", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create sendgrid request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sendgrid request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sendgrid returned status %d: %s", resp.StatusCode, string(respBody))
	}

	providerID := resp.Header.Get("X-Message-Id")

	return &SendResult{
		ProviderID: providerID,
		Cost:       0.002,
	}, nil
}
