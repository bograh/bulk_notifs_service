package email

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
)

type SESProvider struct {
	client    *ses.SES
	fromEmail string
	fromName  string
}

func NewSESProvider(accessKeyID, secretAccessKey, region, fromEmail, fromName string) (*SESProvider, error) {
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(region),
		Credentials: credentials.NewStaticCredentials(accessKeyID, secretAccessKey, ""),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	return &SESProvider{
		client:    ses.New(sess),
		fromEmail: fromEmail,
		fromName:  fromName,
	}, nil
}

func (s *SESProvider) Name() string {
	return "ses"
}

func (s *SESProvider) Send(msg *EmailMessage) (*SendResult, error) {
	fromEmail := s.fromEmail
	if msg.From != "" {
		fromEmail = msg.From
	}
	fromName := s.fromName
	if msg.FromName != "" {
		fromName = msg.FromName
	}

	source := fromEmail
	if fromName != "" {
		source = fmt.Sprintf("%s <%s>", fromName, fromEmail)
	}

	input := &ses.SendEmailInput{
		Destination: &ses.Destination{
			ToAddresses: []*string{aws.String(msg.To)},
		},
		Message: &ses.Message{
			Subject: &ses.Content{
				Data:    aws.String(msg.Subject),
				Charset: aws.String("UTF-8"),
			},
			Body: &ses.Body{},
		},
		Source: aws.String(source),
	}

	if msg.HTMLBody != "" {
		input.Message.Body.Html = &ses.Content{
			Data:    aws.String(msg.HTMLBody),
			Charset: aws.String("UTF-8"),
		}
	}
	if msg.TextBody != "" {
		input.Message.Body.Text = &ses.Content{
			Data:    aws.String(msg.TextBody),
			Charset: aws.String("UTF-8"),
		}
	}

	result, err := s.client.SendEmail(input)
	if err != nil {
		return nil, fmt.Errorf("SES send failed: %w", err)
	}

	providerID := ""
	if result.MessageId != nil {
		providerID = *result.MessageId
	}

	return &SendResult{
		ProviderID: providerID,
		Cost:       0.0001,
	}, nil
}
