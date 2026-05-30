package sms

type SMSMessage struct {
	To         string
	Body       string
	CampaignID uint
}

type SendResult struct {
	ProviderID string
	Cost       float64
}

type Provider interface {
	Send(msg *SMSMessage) (*SendResult, error)
	Name() string
}
