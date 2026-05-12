package dashboard

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Widget struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	ConnectionID string `json:"connectionId"`
	SQL          string `json:"sql"`
	ChartType    string `json:"chartType"`
	Position     int    `json:"position"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) List(ctx context.Context) ([]*Widget, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, title, connection_id, sql_text, chart_type, position, created_at, updated_at
		 FROM dashboard_widgets ORDER BY position ASC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Widget
	for rows.Next() {
		var w Widget
		if err := rows.Scan(&w.ID, &w.Title, &w.ConnectionID, &w.SQL, &w.ChartType, &w.Position, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &w)
	}
	if list == nil {
		list = []*Widget{}
	}
	return list, rows.Err()
}

func (s *Store) Create(ctx context.Context, w *Widget) error {
	w.ID = uuid.NewString()
	now := time.Now().UTC().Format(time.RFC3339)
	w.CreatedAt = now
	w.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO dashboard_widgets (id, title, connection_id, sql_text, chart_type, position, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		w.ID, w.Title, w.ConnectionID, w.SQL, w.ChartType, w.Position, now, now,
	)
	return err
}

func (s *Store) Update(ctx context.Context, w *Widget) error {
	now := time.Now().UTC().Format(time.RFC3339)
	w.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`UPDATE dashboard_widgets
		 SET title = ?, connection_id = ?, sql_text = ?, chart_type = ?, position = ?, updated_at = ?
		 WHERE id = ?`,
		w.Title, w.ConnectionID, w.SQL, w.ChartType, w.Position, now, w.ID,
	)
	return err
}

func (s *Store) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM dashboard_widgets WHERE id = ?`, id)
	return err
}
