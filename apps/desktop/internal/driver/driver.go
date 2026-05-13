package driver

import "context"

// Driver creates connections to a specific database type.
type Driver interface {
	Open(ctx context.Context, params ConnParams) (Conn, error)
	Capabilities() Capabilities
}

// Capabilities describes what a driver can do.
type Capabilities struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName"`
	Version     string   `json:"version"`
	Features    []string `json:"features"`
	BuiltIn     bool     `json:"builtIn"`
	Schemas     bool     `json:"schemas"`
}

// Conn is an open connection to a database.
type Conn interface {
	Ping(ctx context.Context) error
	Query(ctx context.Context, sql string, args ...any) (Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (Result, error)
	Close() error
}

// Rows is the result of a Query call.
type Rows interface {
	Columns() []Column
	Next() bool
	Scan(dest ...any) error
	Err() error
	Close() error
}

// Column describes a single result column.
type Column struct {
	Name     string
	Type     string
	Nullable bool
}

// Result is the outcome of an Exec call.
type Result struct {
	RowsAffected int64
	LastInsertID int64
}

// ConnParams holds the minimal parameters a Driver needs to open a connection.
type ConnParams struct {
	DSN      string
	ReadOnly bool
}
