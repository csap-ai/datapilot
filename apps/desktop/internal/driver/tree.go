package driver

import "context"

type NodeKind string

const (
	NodeDatabase NodeKind = "database"
	NodeSchema   NodeKind = "schema"
	NodeTable    NodeKind = "table"
	NodeView     NodeKind = "view"
)

type TreeNode struct {
	Name     string      `json:"name"`
	Kind     NodeKind    `json:"kind"`
	Children []*TreeNode `json:"children,omitempty"`
}

// ColumnInfo describes a column in a table or view.
type ColumnInfo struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Nullable     bool   `json:"nullable"`
	PrimaryKey   bool   `json:"primaryKey"`
	DefaultValue string `json:"defaultValue"`
}

// IndexInfo describes an index on a table.
type IndexInfo struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

// ForeignKey describes a referential constraint pointing from this table
// to another (schema, table).
type ForeignKey struct {
	Name       string   `json:"name"`
	Columns    []string `json:"columns"`
	RefSchema  string   `json:"refSchema"`
	RefTable   string   `json:"refTable"`
	RefColumns []string `json:"refColumns"`
}

// Introspector is implemented by driver connections that support schema discovery.
type Introspector interface {
	ObjectTree(ctx context.Context) ([]*TreeNode, error)
	TableColumns(ctx context.Context, schema, table string) ([]ColumnInfo, error)
	TableIndexes(ctx context.Context, schema, table string) ([]IndexInfo, error)
	TableForeignKeys(ctx context.Context, schema, table string) ([]ForeignKey, error)
	GenerateDDL(ctx context.Context, schema, table string) (string, error)
}
