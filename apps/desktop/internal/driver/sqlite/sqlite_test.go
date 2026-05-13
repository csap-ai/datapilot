package sqlite_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
	"github.com/csap-ai/datapilot/apps/desktop/internal/driver/sqlite"
)

type introspector interface {
	driver.Conn
	ObjectTree(ctx context.Context) ([]*driver.TreeNode, error)
	TableColumns(ctx context.Context, schema, table string) ([]driver.ColumnInfo, error)
	TableIndexes(ctx context.Context, schema, table string) ([]driver.IndexInfo, error)
	TableForeignKeys(ctx context.Context, schema, table string) ([]driver.ForeignKey, error)
	GenerateDDL(ctx context.Context, schema, table string) (string, error)
}

func openTest(t *testing.T) introspector {
	t.Helper()
	dsn := filepath.Join(t.TempDir(), "test.db")
	d := sqlite.New()
	conn, err := d.Open(context.Background(), driver.ConnParams{DSN: dsn})
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn.(introspector)
}

func TestCapabilities(t *testing.T) {
	caps := sqlite.New().Capabilities()
	if caps.Name != "sqlite" {
		t.Fatalf("Name = %q", caps.Name)
	}
	if !caps.BuiltIn {
		t.Fatalf("expected BuiltIn=true")
	}
	if caps.Schemas {
		t.Fatalf("sqlite should not advertise schema support")
	}
	if len(caps.Features) == 0 {
		t.Fatalf("expected non-empty Features")
	}
}

func TestOpenAndPing(t *testing.T) {
	conn := openTest(t)
	if err := conn.Ping(context.Background()); err != nil {
		t.Fatalf("Ping: %v", err)
	}
}

func TestExecAndQueryRoundTrip(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()

	if _, err := conn.Exec(ctx, `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}
	res, err := conn.Exec(ctx, `INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob')`)
	if err != nil {
		t.Fatalf("INSERT: %v", err)
	}
	if res.RowsAffected != 2 {
		t.Fatalf("RowsAffected = %d, want 2", res.RowsAffected)
	}

	rows, err := conn.Query(ctx, `SELECT id, name FROM users ORDER BY id`)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	defer rows.Close()

	cols := rows.Columns()
	if len(cols) != 2 {
		t.Fatalf("expected 2 columns, got %d", len(cols))
	}
	if cols[0].Name != "id" || cols[1].Name != "name" {
		t.Fatalf("unexpected column names: %+v", cols)
	}

	var ids []int64
	var names []string
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			t.Fatalf("Scan: %v", err)
		}
		ids = append(ids, id)
		names = append(names, name)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows.Err: %v", err)
	}
	if len(ids) != 2 || ids[0] != 1 || ids[1] != 2 {
		t.Fatalf("ids = %v", ids)
	}
	if names[0] != "alice" || names[1] != "bob" {
		t.Fatalf("names = %v", names)
	}
}

func TestReadOnlyDSNAllowsReads(t *testing.T) {
	dsn := filepath.Join(t.TempDir(), "ro.db")
	d := sqlite.New()
	ctx := context.Background()

	rw, err := d.Open(ctx, driver.ConnParams{DSN: dsn})
	if err != nil {
		t.Fatalf("rw Open: %v", err)
	}
	if _, err := rw.Exec(ctx, `CREATE TABLE t (x INT); INSERT INTO t VALUES (42)`); err != nil {
		t.Fatalf("CREATE+INSERT: %v", err)
	}
	rw.Close()

	ro, err := d.Open(ctx, driver.ConnParams{DSN: dsn, ReadOnly: true})
	if err != nil {
		t.Fatalf("ro Open: %v", err)
	}
	defer ro.Close()

	rows, err := ro.Query(ctx, `SELECT x FROM t`)
	if err != nil {
		t.Fatalf("read query should succeed on RO conn: %v", err)
	}
	defer rows.Close()
	if !rows.Next() {
		t.Fatalf("expected 1 row")
	}
	var x int
	if err := rows.Scan(&x); err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if x != 42 {
		t.Fatalf("x = %d", x)
	}
}

func TestObjectTreeReturnsTablesAndViews(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()

	for _, sql := range []string{
		`CREATE TABLE users (id INT)`,
		`CREATE TABLE orders (id INT)`,
		`CREATE VIEW v1 AS SELECT 1 AS x`,
	} {
		if _, err := conn.Exec(ctx, sql); err != nil {
			t.Fatalf("setup %q: %v", sql, err)
		}
	}

	tree, err := conn.ObjectTree(ctx)
	if err != nil {
		t.Fatalf("ObjectTree: %v", err)
	}
	if len(tree) != 1 {
		t.Fatalf("expected 1 root node, got %d", len(tree))
	}
	root := tree[0]
	if root.Kind != driver.NodeDatabase {
		t.Fatalf("root.Kind = %v", root.Kind)
	}

	gotTables := map[string]bool{}
	gotViews := map[string]bool{}
	for _, c := range root.Children {
		switch c.Kind {
		case driver.NodeTable:
			gotTables[c.Name] = true
		case driver.NodeView:
			gotViews[c.Name] = true
		}
	}
	if !gotTables["users"] || !gotTables["orders"] {
		t.Fatalf("missing tables: %+v", gotTables)
	}
	if !gotViews["v1"] {
		t.Fatalf("missing view: %+v", gotViews)
	}
}

func TestTableColumnsExtractsTypeNullablePK(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()
	if _, err := conn.Exec(ctx, `CREATE TABLE t (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		nick TEXT
	)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}

	cols, err := conn.TableColumns(ctx, "", "t")
	if err != nil {
		t.Fatalf("TableColumns: %v", err)
	}
	if len(cols) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(cols))
	}
	byName := map[string]driver.ColumnInfo{}
	for _, c := range cols {
		byName[c.Name] = c
	}
	if !byName["id"].PrimaryKey {
		t.Fatalf("id should be PK")
	}
	if byName["name"].Nullable {
		t.Fatalf("name should be NOT NULL")
	}
	if !byName["nick"].Nullable {
		t.Fatalf("nick should be nullable")
	}
}

func TestTableIndexesIncludesUserDefined(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()
	if _, err := conn.Exec(ctx, `CREATE TABLE t (id INT, name TEXT)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}
	if _, err := conn.Exec(ctx, `CREATE UNIQUE INDEX idx_t_name ON t(name)`); err != nil {
		t.Fatalf("CREATE INDEX: %v", err)
	}

	idx, err := conn.TableIndexes(ctx, "", "t")
	if err != nil {
		t.Fatalf("TableIndexes: %v", err)
	}
	found := false
	for _, i := range idx {
		if i.Name == "idx_t_name" {
			found = true
			if !i.Unique {
				t.Fatalf("idx_t_name should be unique")
			}
			if len(i.Columns) != 1 || i.Columns[0] != "name" {
				t.Fatalf("idx_t_name columns = %v", i.Columns)
			}
		}
	}
	if !found {
		t.Fatalf("idx_t_name not found in %+v", idx)
	}
}

func TestTableForeignKeys(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()
	for _, sql := range []string{
		`CREATE TABLE parent (id INTEGER PRIMARY KEY)`,
		`CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id))`,
	} {
		if _, err := conn.Exec(ctx, sql); err != nil {
			t.Fatalf("setup %q: %v", sql, err)
		}
	}

	fks, err := conn.TableForeignKeys(ctx, "", "child")
	if err != nil {
		t.Fatalf("TableForeignKeys: %v", err)
	}
	if len(fks) != 1 {
		t.Fatalf("expected 1 fk, got %d", len(fks))
	}
	if fks[0].RefTable != "parent" {
		t.Fatalf("RefTable = %s", fks[0].RefTable)
	}
	if len(fks[0].Columns) != 1 || fks[0].Columns[0] != "parent_id" {
		t.Fatalf("Columns = %v", fks[0].Columns)
	}
	if len(fks[0].RefColumns) != 1 || fks[0].RefColumns[0] != "id" {
		t.Fatalf("RefColumns = %v", fks[0].RefColumns)
	}
}

func TestGenerateDDLReturnsCreateStatement(t *testing.T) {
	conn := openTest(t)
	ctx := context.Background()
	if _, err := conn.Exec(ctx, `CREATE TABLE my_t (id INTEGER PRIMARY KEY, x TEXT)`); err != nil {
		t.Fatalf("CREATE: %v", err)
	}

	ddl, err := conn.GenerateDDL(ctx, "", "my_t")
	if err != nil {
		t.Fatalf("GenerateDDL: %v", err)
	}
	if ddl == "" {
		t.Fatalf("expected non-empty DDL")
	}
	if ddl[len(ddl)-1] != ';' {
		t.Fatalf("DDL should end with ; got %q", ddl)
	}
}

func TestGenerateDDLForNonExistentTable(t *testing.T) {
	conn := openTest(t)
	if _, err := conn.GenerateDDL(context.Background(), "", "nope"); err == nil {
		t.Fatalf("expected error for missing table")
	}
}

func TestOpenInvalidPathReturnsError(t *testing.T) {
	d := sqlite.New()
	// /dev/null/foo can't be opened as a sqlite DB.
	_, err := d.Open(context.Background(), driver.ConnParams{DSN: "/dev/null/cannot-create-here"})
	if err == nil {
		t.Fatalf("expected error opening invalid path")
	}
}
