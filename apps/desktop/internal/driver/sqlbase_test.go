package driver_test

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

func newConn(t *testing.T) *driver.SQLConn {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return driver.NewSQLConn(db)
}

func TestSQLConnPing(t *testing.T) {
	c := newConn(t)
	if err := c.Ping(context.Background()); err != nil {
		t.Fatalf("Ping: %v", err)
	}
}

func TestSQLConnExecReturnsRowsAffected(t *testing.T) {
	c := newConn(t)
	ctx := context.Background()

	if _, err := c.Exec(ctx, `CREATE TABLE t (x INT)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}
	res, err := c.Exec(ctx, `INSERT INTO t VALUES (1),(2),(3)`)
	if err != nil {
		t.Fatalf("INSERT: %v", err)
	}
	if res.RowsAffected != 3 {
		t.Fatalf("RowsAffected = %d, want 3", res.RowsAffected)
	}
}

func TestSQLConnExecErrorPropagates(t *testing.T) {
	c := newConn(t)
	if _, err := c.Exec(context.Background(), `NOT VALID SQL`); err == nil {
		t.Fatalf("expected error for invalid SQL")
	}
}

func TestSQLConnQueryColumnsAndScan(t *testing.T) {
	c := newConn(t)
	ctx := context.Background()
	if _, err := c.Exec(ctx, `CREATE TABLE t (id INT, name TEXT)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}
	if _, err := c.Exec(ctx, `INSERT INTO t VALUES (1, 'a'), (2, 'b')`); err != nil {
		t.Fatalf("INSERT: %v", err)
	}

	rows, err := c.Query(ctx, `SELECT id, name FROM t ORDER BY id`)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	defer rows.Close()

	cols := rows.Columns()
	if len(cols) != 2 {
		t.Fatalf("expected 2 cols, got %d", len(cols))
	}
	if cols[0].Name != "id" || cols[1].Name != "name" {
		t.Fatalf("col names: %+v", cols)
	}

	count := 0
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			t.Fatalf("Scan: %v", err)
		}
		count++
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows.Err: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 rows, got %d", count)
	}
}

func TestSQLConnQueryErrorPropagates(t *testing.T) {
	c := newConn(t)
	if _, err := c.Query(context.Background(), `SELECT * FROM nonexistent`); err == nil {
		t.Fatalf("expected error for missing table")
	}
}

func TestQueryToStringsBasic(t *testing.T) {
	c := newConn(t)
	ctx := context.Background()
	if _, err := c.Exec(ctx, `CREATE TABLE t (id INT, name TEXT); INSERT INTO t VALUES (1,'a'),(2,'b')`); err != nil {
		t.Fatalf("setup: %v", err)
	}

	rows, err := driver.QueryToStrings(ctx, c, `SELECT id, name FROM t ORDER BY id`)
	if err != nil {
		t.Fatalf("QueryToStrings: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if rows[0][0] != "1" || rows[0][1] != "a" {
		t.Fatalf("row[0] = %v", rows[0])
	}
	if rows[1][0] != "2" || rows[1][1] != "b" {
		t.Fatalf("row[1] = %v", rows[1])
	}
}

func TestQueryToStringsEmpty(t *testing.T) {
	c := newConn(t)
	ctx := context.Background()
	if _, err := c.Exec(ctx, `CREATE TABLE t (x INT)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}
	rows, err := driver.QueryToStrings(ctx, c, `SELECT * FROM t`)
	if err != nil {
		t.Fatalf("QueryToStrings: %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("expected 0 rows, got %d", len(rows))
	}
}

func TestQueryToStringsBindsArgs(t *testing.T) {
	c := newConn(t)
	ctx := context.Background()
	if _, err := c.Exec(ctx, `CREATE TABLE t (id INT); INSERT INTO t VALUES (1),(2),(3)`); err != nil {
		t.Fatalf("setup: %v", err)
	}
	rows, err := driver.QueryToStrings(ctx, c, `SELECT id FROM t WHERE id > ?`, 1)
	if err != nil {
		t.Fatalf("QueryToStrings: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
}

func TestSQLConnRespectsContextCancellation(t *testing.T) {
	c := newConn(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := c.Ping(ctx); err == nil {
		t.Fatalf("expected error on cancelled ctx")
	}
}
