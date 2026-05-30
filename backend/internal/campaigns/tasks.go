package campaigns

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

const (
	TypeCampaign = "campaign:send"
)

type CampaignPayload struct {
	CampaignID uint `json:"campaign_id"`
}

func NewCampaignTask(campaignID uint) (*asynq.Task, error) {
	payload, err := json.Marshal(CampaignPayload{CampaignID: campaignID})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeCampaign, payload), nil
}
