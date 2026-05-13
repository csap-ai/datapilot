//go:build integration

// MySQL driver integration test.
// Skipped unless built with -tags=integration AND DATAPILOT_TEST_MYSQL_DSN is set.
//
// Run locally:
//
//	docker run --rm -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=test mysql:8
//	DATAPILOT_TEST_MYSQL_DSN='root:test@tcp(127.0.0.1:3306)/' \
//	  go test -tags=integration ./apps/desktop/internal/driver/mysql/...
package mysql_test

import (
	"context"
	"os"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
	"github.com/csap-ai/datapilot/apps/desktop/internal/driver/mysql"
)

func openIntegration(t *testing.T) driver.Conn {
	t.Helper()
	dsn := os.Getenv("DATAPILOT_TEST_MYSQL_DSN")
	if dsn == "" {
		t.Skip("DATAPILOT_TEST_MYSQL_DSN not set")
	}
	d := mysql.New()
	conn, err := d.Open(context.Background(), driver.ConnParams{DSN: dsn})
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn
}

func TestMySQLPingAndRoundTrip(t *testing.T) {
	conn := openIntegration(t)
	ctx := context.Background()
	if err := conn.Ping(ctx); err != nil {
		t.Fatalf("Ping: %v", err)
	}
	rows, err := conn.Query(ctx, `SELECT 1 AS x, 'hi' AS y`)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	defer rows.Close()
	if !rows.Next() {
		t.Fatalf("expected 1 row")
	}
	var x int
	var y string
	if err := rows.Scan(&x, &y); err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if x != 1 || y != "hi" {
		t.Fatalf("got x=%d y=%q", x, y)
	}
}

func TestMySQLObjectTreeFiltersSystemSchemas(t *testing.T) {
	conn := openIntegration(t).(interface {
		driver.Conn
		ObjectTree(ctx context.Context) ([]*driver.TreeNode, error)
	})
	tree, err := conn.ObjectTree(context.Background())
	if err != nil {
		t.Fatalf("ObjectTree: %v", err)
	}
	for _, db := range tree {
		switch db.Name {
		case "information_schema", "performance_schema", "mysql", "sys":
			t.Fatalf("system schema %q should be filtered out", db.Name)
		}
	}
}

func TestMySQLCapabilities(t *testing.T) {
	caps := mysql.New().Capabilities()
	if caps.Name != "mysql" {
		t.Fatalf("Name = %q", caps.Name)
	}
	if !caps.Schemas {
		t.Fatalf("mysql should advertise Schemas=true")
	}
}
