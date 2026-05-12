package connpolicy

import (
	"context"
	"database/sql"
	"time"
)

type Policy struct {
	ConnectionID string `json:"connectionId"`
	AllowDDL     bool   `json:"allowDdl"`
	AllowDML     bool   `json:"allowDml"`
	AllowExport  bool   `json:"allowExport"`
	UpdatedAt    string `json:"updatedAt"`
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Get returns the policy for a connection. If none is set, returns the permissive default.
func (s *Store) Get(ctx context.Context, connectionID string) (*Policy, error) {
	var p Policy
	var allowDDL, allowDML, allowExport int
	err := s.db.QueryRowContext(ctx,
		`SELECT connection_id, allow_ddl, allow_dml, allow_export, updated_at
		 FROM connection_policies WHERE connection_id = ?`, connectionID).
		Scan(&p.ConnectionID, &allowDDL, &allowDML, &allowExport, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return &Policy{ConnectionID: connectionID, AllowDDL: true, AllowDML: true, AllowExport: true}, nil
	}
	if err != nil {
		return nil, err
	}
	p.AllowDDL = allowDDL != 0
	p.AllowDML = allowDML != 0
	p.AllowExport = allowExport != 0
	return &p, nil
}

func (s *Store) Set(ctx context.Context, p *Policy) error {
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO connection_policies (connection_id, allow_ddl, allow_dml, allow_export, updated_at)
		 VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(connection_id) DO UPDATE SET
		     allow_ddl   = excluded.allow_ddl,
		     allow_dml   = excluded.allow_dml,
		     allow_export = excluded.allow_export,
		     updated_at  = excluded.updated_at`,
		p.ConnectionID, boolInt(p.AllowDDL), boolInt(p.AllowDML), boolInt(p.AllowExport), p.UpdatedAt,
	)
	return err
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
