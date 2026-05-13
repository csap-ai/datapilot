package aiaudit

import (
	"context"
	"database/sql"
)

type Event struct {
	ID         int64  `json:"id"`
	Action     string `json:"action"`
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	InputLen   int    `json:"inputLen"`
	OutputLen  int    `json:"outputLen"`
	DurationMs int64  `json:"durationMs"`
	Error      string `json:"error,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Log(ctx context.Context, e *Event) error {
	errVal := sql.NullString{String: e.Error, Valid: e.Error != ""}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO ai_audit_events (action, provider, model, input_len, output_len, duration_ms, error)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		e.Action, e.Provider, e.Model, e.InputLen, e.OutputLen, e.DurationMs, errVal,
	)
	return err
}

func (s *Store) List(ctx context.Context, limit int) ([]*Event, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, action, provider, model, input_len, output_len, duration_ms,
		        COALESCE(error,''), created_at
		 FROM ai_audit_events
		 ORDER BY created_at DESC
		 LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Action, &e.Provider, &e.Model,
			&e.InputLen, &e.OutputLen, &e.DurationMs, &e.Error, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &e)
	}
	if list == nil {
		list = []*Event{}
	}
	return list, rows.Err()
}
