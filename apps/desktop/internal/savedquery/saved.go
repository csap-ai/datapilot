package savedquery

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Record struct {
	ID           string `json:"id"`
	ConnectionID string `json:"connectionId"`
	Name         string `json:"name"`
	SQL          string `json:"sql"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Save(ctx context.Context, r *Record) error {
	r.ID = uuid.NewString()
	now := time.Now().UTC().Format(time.RFC3339)
	r.CreatedAt = now
	r.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO saved_queries (id, connection_id, name, sql_text, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		r.ID, r.ConnectionID, r.Name, r.SQL, now, now,
	)
	return err
}

func (s *Store) List(ctx context.Context, connectionID string) ([]*Record, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, connection_id, name, sql_text, created_at, updated_at
		 FROM saved_queries
		 WHERE connection_id = ? OR connection_id = ''
		 ORDER BY updated_at DESC`,
		connectionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Record
	for rows.Next() {
		var r Record
		if err := rows.Scan(&r.ID, &r.ConnectionID, &r.Name, &r.SQL, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &r)
	}
	if list == nil {
		list = []*Record{}
	}
	return list, rows.Err()
}

func (s *Store) Rename(ctx context.Context, id, name string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx,
		`UPDATE saved_queries SET name = ?, updated_at = ? WHERE id = ?`,
		name, now, id,
	)
	return err
}

func (s *Store) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM saved_queries WHERE id = ?`, id)
	return err
}
