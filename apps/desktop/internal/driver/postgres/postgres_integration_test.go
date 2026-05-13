//go:build integration

// Postgres driver integration test.
// Skipped unless built with -tags=integration AND DATAPILOT_TEST_PG_DSN is set.
//
// Run locally:
//
//	docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:16
//	DATAPILOT_TEST_PG_DSN='postgres://postgres:test@localhost:5432/postgres?sslmode=disable' \
//	  go test -tags=integration ./apps/desktop/internal/driver/postgres/...
package postgres_test

import (
	"context"
	"os"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
	"github.com/csap-ai/datapilot/apps/desktop/internal/driver/postgres"
)

func openIntegration(t *testing.T) driver.Conn {
	t.Helper()
	dsn := os.Getenv("DATAPILOT_TEST_PG_DSN")
	if dsn == "" {
		t.Skip("DATAPILOT_TEST_PG_DSN not set")
	}
	d := postgres.New()
	conn, err := d.Open(context.Background(), driver.ConnParams{DSN: dsn})
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn
}

func TestPostgresPingAndRoundTrip(t *testing.T) {
	conn := openIntegration(t)
	ctx := context.Background()
	if err := conn.Ping(ctx); err != nil {
		t.Fatalf("Ping: %v", err)
	}

	rows, err := conn.Query(ctx, `SELECT 1::int AS x, 'hi'::text AS y`)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	defer rows.Close()
	if len(rows.Columns()) != 2 {
		t.Fatalf("expected 2 cols, got %d", len(rows.Columns()))
	}
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

func TestPostgresObjectTreeLists(t *testing.T) {
	conn := openIntegration(t).(interface {
		driver.Conn
		ObjectTree(ctx context.Context) ([]*driver.TreeNode, error)
	})
	tree, err := conn.ObjectTree(context.Background())
	if err != nil {
		t.Fatalf("ObjectTree: %v", err)
	}
	if len(tree) == 0 {
		t.Fatalf("expected at least 1 database node")
	}
	// `public` schema should be present in a fresh postgres database.
	root := tree[0]
	foundPublic := false
	for _, s := range root.Children {
		if s.Name == "public" {
			foundPublic = true
		}
	}
	if !foundPublic {
		t.Fatalf("expected 'public' schema in tree")
	}
}

func TestPostgresCapabilities(t *testing.T) {
	caps := postgres.New().Capabilities()
	if caps.Name != "postgres" {
		t.Fatalf("Name = %q", caps.Name)
	}
	if !caps.Schemas {
		t.Fatalf("postgres should advertise Schemas=true")
	}
}
