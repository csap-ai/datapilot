package config

import (
	"context"
	"encoding/json"
	"testing"
)

type mockPrefs struct {
	data map[string]string
}

func (m *mockPrefs) All(_ context.Context) (map[string]string, error) {
	return m.data, nil
}

func (m *mockPrefs) Set(_ context.Context, key, value string) error {
	m.data[key] = value
	return nil
}

func TestExportStripsSecrets(t *testing.T) {
	prefs := &mockPrefs{data: map[string]string{
		"theme":          "dark",
		"font_size":      "14",
		"db_password":    "hunter2",
		"openai_api_key": "sk-xxx",
	}}

	data, err := Export(context.Background(), prefs)
	if err != nil {
		t.Fatalf("Export: %v", err)
	}

	var bundle ExportBundle
	if err := json.Unmarshal(data, &bundle); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := bundle.Preferences["db_password"]; ok {
		t.Error("exported bundle contains db_password")
	}
	if _, ok := bundle.Preferences["openai_api_key"]; ok {
		t.Error("exported bundle contains openai_api_key")
	}
	if bundle.Preferences["theme"] != "dark" {
		t.Error("expected theme=dark in export")
	}
}

func TestImportSkipsSecrets(t *testing.T) {
	bundle := ExportBundle{
		Version:     1,
		Preferences: map[string]string{"theme": "light", "db_password": "evil"},
	}
	data, _ := json.Marshal(bundle)

	prefs := &mockPrefs{data: make(map[string]string)}
	if err := Import(context.Background(), data, prefs); err != nil {
		t.Fatalf("Import: %v", err)
	}

	if prefs.data["theme"] != "light" {
		t.Error("expected theme=light after import")
	}
	if _, ok := prefs.data["db_password"]; ok {
		t.Error("import should have skipped db_password")
	}
}
