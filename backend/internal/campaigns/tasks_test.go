package campaigns

import (
	"encoding/json"
	"testing"
)

func TestNewCampaignTask(t *testing.T) {
	task, err := NewCampaignTask(42)
	if err != nil {
		t.Fatalf("NewCampaignTask() error = %v", err)
	}

	if task.Type() != TypeCampaign {
		t.Errorf("task.Type() = %s, want %s", task.Type(), TypeCampaign)
	}

	var payload CampaignPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if payload.CampaignID != 42 {
		t.Errorf("payload.CampaignID = %d, want 42", payload.CampaignID)
	}
}

func TestCampaignPayload_Serialization(t *testing.T) {
	original := CampaignPayload{CampaignID: 123}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	var restored CampaignPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}

	if restored.CampaignID != original.CampaignID {
		t.Errorf("CampaignID = %d, want %d", restored.CampaignID, original.CampaignID)
	}
}
