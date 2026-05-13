package sqlaudit

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
)

type Event struct {
	ID             int64  `json:"id"`
	ConnectionID   string `json:"connectionId"`
	ConnectionName string `json:"connectionName"`
	SQL            string `json:"sql"`
	DurationMs     int64  `json:"durationMs"`
	RowsAffected   int64  `json:"rowsAffected"`
	Error          string `json:"error,omitempty"`
	RiskLevel      string `json:"riskLevel"`
	CreatedAt      string `json:"createdAt"`
}

type ListFilter struct {
	ConnectionID string
	ErrorOnly    bool
	Limit        int
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
		`INSERT INTO sql_audit_events
		 (connection_id, connection_name, sql_text, duration_ms, rows_affected, error, risk_level)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		e.ConnectionID, e.ConnectionName, e.SQL, e.DurationMs, e.RowsAffected, errVal, e.RiskLevel,
	)
	return err
}

func (s *Store) List(ctx context.Context, f ListFilter) ([]*Event, error) {
	if f.Limit <= 0 {
		f.Limit = 100
	}
	q := `SELECT id, connection_id, connection_name, sql_text, duration_ms, rows_affected,
	             COALESCE(error,''), risk_level, created_at
	      FROM sql_audit_events WHERE 1=1`
	var args []any
	if f.ConnectionID != "" {
		q += " AND connection_id = ?"
		args = append(args, f.ConnectionID)
	}
	if f.ErrorOnly {
		q += " AND error IS NOT NULL AND error != ''"
	}
	q += " ORDER BY created_at DESC LIMIT ?"
	args = append(args, f.Limit)

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.ConnectionID, &e.ConnectionName, &e.SQL,
			&e.DurationMs, &e.RowsAffected, &e.Error, &e.RiskLevel, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &e)
	}
	if list == nil {
		list = []*Event{}
	}
	return list, rows.Err()
}

func (s *Store) ExportCSV(ctx context.Context, f ListFilter) (string, error) {
	events, err := s.List(ctx, f)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"id", "connection_id", "connection_name", "sql", "duration_ms", "rows_affected", "error", "risk_level", "created_at"})
	for _, e := range events {
		_ = w.Write([]string{
			fmt.Sprintf("%d", e.ID),
			e.ConnectionID,
			e.ConnectionName,
			e.SQL,
			fmt.Sprintf("%d", e.DurationMs),
			fmt.Sprintf("%d", e.RowsAffected),
			e.Error,
			e.RiskLevel,
			e.CreatedAt,
		})
	}
	w.Flush()
	return buf.String(), w.Error()
}
