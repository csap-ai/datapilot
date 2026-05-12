package postgres

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

type postgresDriver struct{}

func New() driver.Driver { return &postgresDriver{} }

func (d *postgresDriver) Capabilities() driver.Capabilities {
	return driver.Capabilities{
		Name:        "postgres",
		DisplayName: "PostgreSQL",
		Version:     "9.x+",
		Features:    []string{"browse", "ddl", "dml", "explain", "csv-import", "indexes", "foreign-keys", "transactions", "schemas"},
		BuiltIn:     true,
		Schemas:     true,
	}
}

func (d *postgresDriver) Open(ctx context.Context, params driver.ConnParams) (driver.Conn, error) {
	db, err := sql.Open("postgres", params.DSN)
	if err != nil {
		return nil, fmt.Errorf("postgres: open: %w", err)
	}
	db.SetMaxOpenConns(10)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("postgres: ping: %w", err)
	}
	return &pgConn{SQLConn: driver.NewSQLConn(db)}, nil
}

type pgConn struct {
	*driver.SQLConn
}

func (c *pgConn) ObjectTree(ctx context.Context) ([]*driver.TreeNode, error) {
	schemas, err := driver.QueryToStrings(ctx, c.SQLConn,
		`SELECT schema_name FROM information_schema.schemata
		 WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
		 ORDER BY schema_name`)
	if err != nil {
		return nil, fmt.Errorf("postgres: list schemas: %w", err)
	}

	dbNode := &driver.TreeNode{Kind: driver.NodeDatabase}
	// Get current database name
	rows, _ := driver.QueryToStrings(ctx, c.SQLConn, `SELECT current_database()`)
	if len(rows) > 0 && len(rows[0]) > 0 {
		dbNode.Name = rows[0][0]
	}

	for _, row := range schemas {
		if len(row) == 0 {
			continue
		}
		schema := row[0]
		schemaNode := &driver.TreeNode{Name: schema, Kind: driver.NodeSchema}

		tables, err := driver.QueryToStrings(ctx, c.SQLConn,
			`SELECT table_name, table_type FROM information_schema.tables
			 WHERE table_schema = $1 ORDER BY table_name`, schema)
		if err != nil {
			continue
		}
		for _, t := range tables {
			if len(t) < 2 {
				continue
			}
			kind := driver.NodeTable
			if t[1] == "VIEW" {
				kind = driver.NodeView
			}
			schemaNode.Children = append(schemaNode.Children, &driver.TreeNode{Name: t[0], Kind: kind})
		}
		dbNode.Children = append(dbNode.Children, schemaNode)
	}
	return []*driver.TreeNode{dbNode}, nil
}
