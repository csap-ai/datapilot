package queryhistory

import (
	"context"
	"database/sql"
)

type Record struct {
	ID           int64  `json:"id"`
	ConnectionID string `json:"connectionId"`
	SQL          string `json:"sql"`
	DurationMs   int64  `json:"durationMs"`
	RowCount     int64  `json:"rowCount"`
	Error        string `json:"error,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Save(ctx context.Context, r *Record) error {
	errVal := sql.NullString{String: r.Error, Valid: r.Error != ""}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO query_history (connection_id, sql_text, duration_ms, row_count, error)
		 VALUES (?, ?, ?, ?, ?)`,
		r.ConnectionID, r.SQL, r.DurationMs, r.RowCount, errVal,
	)
	return err
}

func (s *Store) List(ctx context.Context, connectionID string, limit int) ([]*Record, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, connection_id, sql_text, COALESCE(duration_ms,0), COALESCE(row_count,0),
		        COALESCE(error,''), created_at
		 FROM query_history
		 WHERE connection_id = ?
		 ORDER BY created_at DESC
		 LIMIT ?`,
		connectionID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Record
	for rows.Next() {
		var r Record
		if err := rows.Scan(&r.ID, &r.ConnectionID, &r.SQL,
			&r.DurationMs, &r.RowCount, &r.Error, &r.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &r)
	}
	if list == nil {
		list = []*Record{}
	}
	return list, rows.Err()
}
