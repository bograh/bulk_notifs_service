package email

type EmailMessage struct {
	To          string
	ToName      string
	From        string
	FromName    string
	Subject     string
	TextBody    string
	HTMLBody    string
	CampaignID  uint
}

type SendResult struct {
	ProviderID string
	Cost       float64
}

type Provider interface {
	Send(msg *EmailMessage) (*SendResult, error)
	Name() string
}
