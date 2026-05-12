package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

type sqliteDriver struct{}

func New() driver.Driver { return &sqliteDriver{} }

func (d *sqliteDriver) Capabilities() driver.Capabilities {
	return driver.Capabilities{
		Name:        "sqlite",
		DisplayName: "SQLite",
		Version:     "3.x",
		Features:    []string{"browse", "ddl", "dml", "explain", "csv-import", "indexes", "foreign-keys", "transactions"},
		BuiltIn:     true,
		Schemas:     false,
	}
}

func (d *sqliteDriver) Open(ctx context.Context, params driver.ConnParams) (driver.Conn, error) {
	dsn := buildDSN(params.DSN, params.ReadOnly)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("sqlite: open: %w", err)
	}
	db.SetMaxOpenConns(1)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("sqlite: ping: %w", err)
	}
	return &sqliteConn{SQLConn: driver.NewSQLConn(db)}, nil
}

func buildDSN(filePath string, readOnly bool) string {
	if readOnly {
		return "file:" + filePath + "?mode=ro&_foreign_keys=on"
	}
	return "file:" + filePath + "?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on"
}

type sqliteConn struct {
	*driver.SQLConn
}

func (c *sqliteConn) ObjectTree(ctx context.Context) ([]*driver.TreeNode, error) {
	rows, err := driver.QueryToStrings(ctx, c.SQLConn,
		`SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name`)
	if err != nil {
		return nil, fmt.Errorf("sqlite: introspect: %w", err)
	}

	db := &driver.TreeNode{Name: "main", Kind: driver.NodeDatabase}
	for _, row := range rows {
		if len(row) < 2 {
			continue
		}
		kind := driver.NodeTable
		if row[1] == "view" {
			kind = driver.NodeView
		}
		db.Children = append(db.Children, &driver.TreeNode{Name: row[0], Kind: kind})
	}
	return []*driver.TreeNode{db}, nil
}
