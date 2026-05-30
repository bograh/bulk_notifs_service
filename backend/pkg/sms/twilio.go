package sms

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type TwilioProvider struct {
	accountSID  string
	authToken   string
	fromNumber  string
	httpClient  *http.Client
}

func NewTwilioProvider(accountSID, authToken, fromNumber string) *TwilioProvider {
	return &TwilioProvider{
		accountSID: accountSID,
		authToken:  authToken,
		fromNumber: fromNumber,
		httpClient: &http.Client{},
	}
}

func (t *TwilioProvider) Name() string {
	return "twilio"
}

func (t *TwilioProvider) Send(msg *SMSMessage) (*SendResult, error) {
	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", t.accountSID)

	data := url.Values{}
	data.Set("To", msg.To)
	data.Set("From", t.fromNumber)
	data.Set("Body", msg.Body)

	req, err := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create twilio request: %w", err)
	}

	req.SetBasicAuth(t.accountSID, t.authToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("twilio request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("twilio returned status %d: %s", resp.StatusCode, string(body))
	}

	providerID := resp.Header.Get("X-Twilio-CallSid")
	if providerID == "" {
		providerID = fmt.Sprintf("twilio-%d", resp.StatusCode)
	}

	return &SendResult{
		ProviderID: providerID,
		Cost:       0.0079,
	}, nil
}
