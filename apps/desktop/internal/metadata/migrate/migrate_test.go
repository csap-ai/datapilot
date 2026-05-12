package migrate

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

var testMigrations = []Migration{
	{
		Version: 1,
		Name:    "create_preferences",
		Up:      `CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
		Down:    `DROP TABLE preferences`,
	},
	{
		Version: 2,
		Name:    "create_workspace",
		Up:      `CREATE TABLE workspace (id TEXT PRIMARY KEY, state TEXT NOT NULL)`,
		Down:    `DROP TABLE workspace`,
	},
}

func TestRunAppliesMigrations(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	if err := Run(ctx, db, testMigrations); err != nil {
		t.Fatalf("Run: %v", err)
	}

	v, err := currentVersion(ctx, db)
	if err != nil {
		t.Fatalf("currentVersion: %v", err)
	}
	if v != 2 {
		t.Fatalf("expected version 2, got %d", v)
	}

	// Tables should exist.
	for _, table := range []string{"preferences", "workspace"} {
		var name string
		err := db.QueryRowContext(ctx, `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&name)
		if err != nil {
			t.Fatalf("table %s not found: %v", table, err)
		}
	}
}

func TestRunIsIdempotent(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	if err := Run(ctx, db, testMigrations); err != nil {
		t.Fatalf("first Run: %v", err)
	}
	if err := Run(ctx, db, testMigrations); err != nil {
		t.Fatalf("second Run: %v", err)
	}
}

func TestRollback(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	if err := Run(ctx, db, testMigrations); err != nil {
		t.Fatalf("Run: %v", err)
	}
	if err := Rollback(ctx, db, testMigrations); err != nil {
		t.Fatalf("Rollback: %v", err)
	}

	v, err := currentVersion(ctx, db)
	if err != nil {
		t.Fatalf("currentVersion: %v", err)
	}
	if v != 1 {
		t.Fatalf("expected version 1 after rollback, got %d", v)
	}
}
