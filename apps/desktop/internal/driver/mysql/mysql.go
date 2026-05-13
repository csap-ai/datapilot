package mysql

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

type mysqlDriver struct{}

func New() driver.Driver { return &mysqlDriver{} }

func (d *mysqlDriver) Capabilities() driver.Capabilities {
	return driver.Capabilities{
		Name:        "mysql",
		DisplayName: "MySQL",
		Version:     "5.7+",
		Features:    []string{"browse", "ddl", "dml", "explain", "csv-import", "indexes", "foreign-keys", "transactions"},
		BuiltIn:     true,
		Schemas:     true,
	}
}

func (d *mysqlDriver) Open(ctx context.Context, params driver.ConnParams) (driver.Conn, error) {
	db, err := sql.Open("mysql", params.DSN)
	if err != nil {
		return nil, fmt.Errorf("mysql: open: %w", err)
	}
	db.SetMaxOpenConns(10)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("mysql: ping: %w", err)
	}
	return &mysqlConn{SQLConn: driver.NewSQLConn(db)}, nil
}

type mysqlConn struct {
	*driver.SQLConn
}

func (c *mysqlConn) ObjectTree(ctx context.Context) ([]*driver.TreeNode, error) {
	dbs, err := driver.QueryToStrings(ctx, c.SQLConn, `SHOW DATABASES`)
	if err != nil {
		return nil, fmt.Errorf("mysql: list databases: %w", err)
	}

	skip := map[string]bool{
		"information_schema": true,
		"performance_schema": true,
		"mysql":              true,
		"sys":                true,
	}

	var nodes []*driver.TreeNode
	for _, row := range dbs {
		if len(row) == 0 || skip[row[0]] {
			continue
		}
		dbName := row[0]
		dbNode := &driver.TreeNode{Name: dbName, Kind: driver.NodeDatabase}

		tables, err := driver.QueryToStrings(ctx, c.SQLConn,
			fmt.Sprintf("SHOW FULL TABLES FROM `%s`", dbName))
		if err != nil {
			nodes = append(nodes, dbNode)
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
			dbNode.Children = append(dbNode.Children, &driver.TreeNode{Name: t[0], Kind: kind})
		}
		nodes = append(nodes, dbNode)
	}
	return nodes, nil
}
