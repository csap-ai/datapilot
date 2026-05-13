package config

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type ExportBundle struct {
	Version     int               `json:"version"`
	ExportedAt  string            `json:"exportedAt"`
	Preferences map[string]string `json:"preferences,omitempty"`
	Workspace   json.RawMessage   `json:"workspace,omitempty"`
}

type PreferenceReader interface {
	All(ctx context.Context) (map[string]string, error)
}

type WorkspaceReader interface {
	Load(ctx context.Context) (any, error)
}

func Export(ctx context.Context, prefs PreferenceReader) ([]byte, error) {
	all, err := prefs.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("config: read preferences: %w", err)
	}

	// Strip anything that looks like a secret.
	for k := range all {
		if isSecretKey(k) {
			delete(all, k)
		}
	}

	bundle := ExportBundle{
		Version:     1,
		ExportedAt:  time.Now().UTC().Format(time.RFC3339),
		Preferences: all,
	}

	return json.MarshalIndent(bundle, "", "  ")
}

type PreferenceWriter interface {
	Set(ctx context.Context, key, value string) error
}

func Import(ctx context.Context, data []byte, prefs PreferenceWriter) error {
	var bundle ExportBundle
	if err := json.Unmarshal(data, &bundle); err != nil {
		return fmt.Errorf("config: parse bundle: %w", err)
	}

	for k, v := range bundle.Preferences {
		if isSecretKey(k) {
			continue
		}
		if err := prefs.Set(ctx, k, v); err != nil {
			return fmt.Errorf("config: import preference %s: %w", k, err)
		}
	}
	return nil
}

func isSecretKey(key string) bool {
	for _, suffix := range []string{"password", "secret", "token", "api_key", "apikey", "credential"} {
		if len(key) >= len(suffix) && key[len(key)-len(suffix):] == suffix {
			return true
		}
	}
	return false
}
