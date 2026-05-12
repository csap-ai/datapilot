package datasource

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// SQLiteStore persists DataSource records in the metadata SQLite database.
type SQLiteStore struct {
	db *sql.DB
}

func NewSQLiteStore(db *sql.DB) *SQLiteStore {
	return &SQLiteStore{db: db}
}

func (s *SQLiteStore) Create(ctx context.Context, ds *DataSource) error {
	ds.ID = uuid.NewString()
	now := time.Now().UTC()
	ds.CreatedAt = now
	ds.UpdatedAt = now

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO data_sources
			(id, name, type, host, port, database, username, file_path, read_only, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?), datetime(?))`,
		ds.ID, ds.Name, string(ds.Type), ds.Host, ds.Port, ds.Database,
		ds.Username, ds.FilePath, boolToInt(ds.ReadOnly),
		now.Format(time.RFC3339), now.Format(time.RFC3339),
	)
	return err
}

func (s *SQLiteStore) Get(ctx context.Context, id string) (*DataSource, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, type, host, port, database, username, file_path, read_only, created_at, updated_at
		FROM data_sources WHERE id = ?`, id)
	ds, err := scanDataSource(row)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("datasource: not found: %s", id)
	}
	return ds, err
}

func (s *SQLiteStore) List(ctx context.Context) ([]*DataSource, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, type, host, port, database, username, file_path, read_only, created_at, updated_at
		FROM data_sources ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*DataSource
	for rows.Next() {
		ds, err := scanDataSource(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, ds)
	}
	if list == nil {
		list = []*DataSource{}
	}
	return list, rows.Err()
}

func (s *SQLiteStore) Update(ctx context.Context, ds *DataSource) error {
	ds.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `
		UPDATE data_sources SET
			name = ?, type = ?, host = ?, port = ?, database = ?, username = ?,
			file_path = ?, read_only = ?, updated_at = datetime(?)
		WHERE id = ?`,
		ds.Name, string(ds.Type), ds.Host, ds.Port, ds.Database,
		ds.Username, ds.FilePath, boolToInt(ds.ReadOnly),
		ds.UpdatedAt.Format(time.RFC3339), ds.ID,
	)
	return err
}

func (s *SQLiteStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM data_sources WHERE id = ?`, id)
	return err
}

// scanner is satisfied by both *sql.Row and *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

func scanDataSource(s scanner) (*DataSource, error) {
	var ds DataSource
	var readOnly int
	var createdAt, updatedAt string
	var dbType string

	err := s.Scan(
		&ds.ID, &ds.Name, &dbType, &ds.Host, &ds.Port, &ds.Database,
		&ds.Username, &ds.FilePath, &readOnly, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	ds.Type = Type(dbType)
	ds.ReadOnly = readOnly != 0
	ds.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	ds.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &ds, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
