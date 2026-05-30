package sms

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type TermiiProvider struct {
	apiKey     string
	senderID   string
	httpClient *http.Client
}

func NewTermiiProvider(apiKey, senderID string) *TermiiProvider {
	return &TermiiProvider{
		apiKey:     apiKey,
		senderID:   senderID,
		httpClient: &http.Client{},
	}
}

func (t *TermiiProvider) Name() string {
	return "termii"
}

type termiiRequest struct {
	To         string `json:"to"`
	From       string `json:"from"`
	SMS        string `json:"sms"`
	Type       string `json:"type"`
	APIKey     string `json:"api_key"`
	Channel    string `json:"channel"`
}

type termiiResponse struct {
	MessageID string `json:"message_id"`
	Message   string `json:"message"`
}

func (t *TermiiProvider) Send(msg *SMSMessage) (*SendResult, error) {
	payload := termiiRequest{
		To:      msg.To,
		From:    t.senderID,
		SMS:     msg.Body,
		Type:    "plain",
		APIKey:  t.apiKey,
		Channel: "generic",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal termii request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.ng.termii.com/api/sms/send", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create termii request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("termii request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("termii returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result termiiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return &SendResult{Cost: 0.005}, nil
	}

	return &SendResult{
		ProviderID: result.MessageID,
		Cost:       0.005,
	}, nil
}
