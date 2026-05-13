package workspace

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Tab struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Type   string `json:"type"`
	Pinned bool   `json:"pinned,omitempty"`
}

type State struct {
	Tabs        []Tab  `json:"tabs"`
	ActiveTabID string `json:"activeTabId"`
}

type Service struct {
	db *sql.DB
}

func New(db *sql.DB) *Service {
	return &Service{db: db}
}

const stateKey = "main"

func (s *Service) Save(ctx context.Context, state State) error {
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("workspace: marshal: %w", err)
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO workspace_state (id, payload, updated_at) VALUES (?, ?, datetime('now'))
		 ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')`,
		stateKey, string(data))
	return err
}

func (s *Service) Load(ctx context.Context) (State, error) {
	var raw string
	err := s.db.QueryRowContext(ctx, `SELECT payload FROM workspace_state WHERE id = ?`, stateKey).Scan(&raw)
	if err == sql.ErrNoRows {
		return State{}, nil
	}
	if err != nil {
		return State{}, err
	}

	var state State
	if err := json.Unmarshal([]byte(raw), &state); err != nil {
		return State{}, fmt.Errorf("workspace: unmarshal: %w", err)
	}
	return state, nil
}
