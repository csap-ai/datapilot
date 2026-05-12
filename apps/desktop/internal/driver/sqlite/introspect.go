package sqlite

import (
	"context"
	"fmt"
	"strings"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

func (c *sqliteConn) TableColumns(ctx context.Context, _, table string) ([]driver.ColumnInfo, error) {
	rows, err := driver.QueryToStrings(ctx, c.SQLConn,
		fmt.Sprintf("PRAGMA table_info(%s)", quoteIdent(table)))
	if err != nil {
		return nil, fmt.Errorf("sqlite: table_info: %w", err)
	}
	cols := make([]driver.ColumnInfo, 0, len(rows))
	for _, row := range rows {
		// PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
		if len(row) < 6 {
			continue
		}
		cols = append(cols, driver.ColumnInfo{
			Name:         row[1],
			Type:         row[2],
			Nullable:     row[3] == "0",
			DefaultValue: row[4],
			PrimaryKey:   row[5] != "0",
		})
	}
	return cols, nil
}

func (c *sqliteConn) TableIndexes(ctx context.Context, _, table string) ([]driver.IndexInfo, error) {
	rows, err := driver.QueryToStrings(ctx, c.SQLConn,
		fmt.Sprintf("PRAGMA index_list(%s)", quoteIdent(table)))
	if err != nil {
		return nil, fmt.Errorf("sqlite: index_list: %w", err)
	}
	indexes := make([]driver.IndexInfo, 0, len(rows))
	for _, row := range rows {
		// PRAGMA index_list: seq, name, unique, origin, partial
		if len(row) < 3 {
			continue
		}
		idx := driver.IndexInfo{Name: row[1], Unique: row[2] != "0"}
		colRows, _ := driver.QueryToStrings(ctx, c.SQLConn,
			fmt.Sprintf("PRAGMA index_info(%s)", quoteIdent(idx.Name)))
		for _, cr := range colRows {
			if len(cr) >= 3 {
				idx.Columns = append(idx.Columns, cr[2])
			}
		}
		indexes = append(indexes, idx)
	}
	return indexes, nil
}

func (c *sqliteConn) TableForeignKeys(ctx context.Context, _, table string) ([]driver.ForeignKey, error) {
	rows, err := driver.QueryToStrings(ctx, c.SQLConn,
		fmt.Sprintf("PRAGMA foreign_key_list(%s)", quoteIdent(table)))
	if err != nil {
		return nil, fmt.Errorf("sqlite: foreign_key_list: %w", err)
	}
	// PRAGMA foreign_key_list: id, seq, table, from, to, on_update, on_delete, match
	byID := make(map[string]*driver.ForeignKey)
	var order []string
	for _, r := range rows {
		if len(r) < 5 {
			continue
		}
		id := r[0]
		if _, ok := byID[id]; !ok {
			byID[id] = &driver.ForeignKey{Name: "fk_" + r[2] + "_" + id, RefTable: r[2]}
			order = append(order, id)
		}
		byID[id].Columns = append(byID[id].Columns, r[3])
		byID[id].RefColumns = append(byID[id].RefColumns, r[4])
	}
	out := make([]driver.ForeignKey, 0, len(order))
	for _, id := range order {
		out = append(out, *byID[id])
	}
	return out, nil
}

func (c *sqliteConn) GenerateDDL(ctx context.Context, _, table string) (string, error) {
	rows, err := driver.QueryToStrings(ctx, c.SQLConn,
		`SELECT sql FROM sqlite_master WHERE type IN ('table','view') AND name = ?`, table)
	if err != nil {
		return "", fmt.Errorf("sqlite: ddl: %w", err)
	}
	if len(rows) == 0 || len(rows[0]) == 0 {
		return "", fmt.Errorf("sqlite: object not found: %s", table)
	}
	return rows[0][0] + ";", nil
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
