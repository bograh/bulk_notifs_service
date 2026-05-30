package db

import (
	"encoding/json"
	"testing"
)

func TestJSONB_Value(t *testing.T) {
	j := JSONB{"key": "value", "number": float64(42)}

	val, err := j.Value()
	if err != nil {
		t.Fatalf("JSONB.Value() error = %v", err)
	}

	bytes, ok := val.([]byte)
	if !ok {
		t.Fatal("JSONB.Value() did not return []byte")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(bytes, &parsed); err != nil {
		t.Fatalf("failed to unmarshal JSONB value: %v", err)
	}

	if parsed["key"] != "value" {
		t.Errorf("key = %v, want value", parsed["key"])
	}
	if parsed["number"] != float64(42) {
		t.Errorf("number = %v, want 42", parsed["number"])
	}
}

func TestJSONB_Scan(t *testing.T) {
	var j JSONB

	data := []byte(`{"name":"test","count":5}`)
	if err := j.Scan(data); err != nil {
		t.Fatalf("JSONB.Scan() error = %v", err)
	}

	if j["name"] != "test" {
		t.Errorf("name = %v, want test", j["name"])
	}
	if j["count"] != float64(5) {
		t.Errorf("count = %v, want 5", j["count"])
	}
}

func TestJSONB_Scan_Nil(t *testing.T) {
	var j JSONB

	if err := j.Scan(nil); err != nil {
		t.Fatalf("JSONB.Scan(nil) error = %v", err)
	}

	if j == nil {
		t.Fatal("JSONB should be initialized as empty map, not nil")
	}

	if len(j) != 0 {
		t.Errorf("JSONB should be empty, got %d entries", len(j))
	}
}

func TestJSONB_RoundTrip(t *testing.T) {
	original := JSONB{
		"email":     "test@example.com",
		"verified":  true,
		"tags":      []interface{}{"admin", "user"},
	}

	val, err := original.Value()
	if err != nil {
		t.Fatalf("Value() error = %v", err)
	}

	var restored JSONB
	if err := restored.Scan(val); err != nil {
		t.Fatalf("Scan() error = %v", err)
	}

	if restored["email"] != "test@example.com" {
		t.Errorf("email = %v, want test@example.com", restored["email"])
	}
	if restored["verified"] != true {
		t.Errorf("verified = %v, want true", restored["verified"])
	}
}
