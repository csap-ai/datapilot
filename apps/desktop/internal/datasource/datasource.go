package datasource

import (
	"context"
	"time"
)

// Type identifies the database engine.
type Type string

const (
	TypeSQLite   Type = "sqlite"
	TypePostgres Type = "postgres"
	TypeMySQL    Type = "mysql"
)

// DataSource is a saved database connection configuration.
// Passwords are stored separately in the credential store, keyed by ID.
type DataSource struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Type      Type      `json:"type"`
	Host      string    `json:"host,omitempty"`
	Port      int       `json:"port,omitempty"`
	Database  string    `json:"database,omitempty"`
	Username  string    `json:"username,omitempty"`
	FilePath  string    `json:"file_path,omitempty"` // SQLite only
	ReadOnly  bool      `json:"read_only"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Store persists and retrieves DataSource records.
type Store interface {
	Create(ctx context.Context, ds *DataSource) error
	Get(ctx context.Context, id string) (*DataSource, error)
	List(ctx context.Context) ([]*DataSource, error)
	Update(ctx context.Context, ds *DataSource) error
	Delete(ctx context.Context, id string) error
}
