package sqlpolicy

import (
	"context"
	"database/sql"
)

type Policy struct {
	ID        int64  `json:"id"`
	Pattern   string `json:"pattern"`
	Level     string `json:"level"` // "warning" | "danger"
	Message   string `json:"message"`
	Enabled   bool   `json:"enabled"`
	CreatedAt string `json:"createdAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) List(ctx context.Context) ([]*Policy, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, pattern, level, message, enabled, created_at
		 FROM sql_policies ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Policy
	for rows.Next() {
		var p Policy
		var enabled int
		if err := rows.Scan(&p.ID, &p.Pattern, &p.Level, &p.Message, &enabled, &p.CreatedAt); err != nil {
			return nil, err
		}
		p.Enabled = enabled != 0
		list = append(list, &p)
	}
	if list == nil {
		list = []*Policy{}
	}
	return list, rows.Err()
}

func (s *Store) Create(ctx context.Context, p *Policy) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO sql_policies (pattern, level, message, enabled) VALUES (?, ?, ?, 1)`,
		p.Pattern, p.Level, p.Message,
	)
	if err != nil {
		return err
	}
	p.ID, _ = res.LastInsertId()
	p.Enabled = true
	return nil
}

func (s *Store) Toggle(ctx context.Context, id int64, enabled bool) error {
	v := 0
	if enabled {
		v = 1
	}
	_, err := s.db.ExecContext(ctx, `UPDATE sql_policies SET enabled = ? WHERE id = ?`, v, id)
	return err
}

func (s *Store) Delete(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sql_policies WHERE id = ?`, id)
	return err
}
