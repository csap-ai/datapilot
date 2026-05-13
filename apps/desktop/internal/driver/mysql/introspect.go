package mysql

import (
	"context"
	"fmt"
	"strings"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

func (c *mysqlConn) TableColumns(ctx context.Context, schema, table string) ([]driver.ColumnInfo, error) {
	q := `SELECT column_name, column_type, is_nullable, column_key, COALESCE(column_default, '')
	      FROM information_schema.columns
	      WHERE table_name = ?`
	args := []any{table}
	if schema != "" {
		q += " AND table_schema = ?"
		args = append(args, schema)
	} else {
		q += " AND table_schema = DATABASE()"
	}
	q += " ORDER BY ordinal_position"

	rows, err := c.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("mysql: columns: %w", err)
	}
	defer rows.Close()

	cols := make([]driver.ColumnInfo, 0, 16)
	for rows.Next() {
		var name, colType, isNullable, colKey, defaultVal string
		if err := rows.Scan(&name, &colType, &isNullable, &colKey, &defaultVal); err != nil {
			return nil, err
		}
		cols = append(cols, driver.ColumnInfo{
			Name:         name,
			Type:         colType,
			Nullable:     strings.EqualFold(isNullable, "YES"),
			PrimaryKey:   colKey == "PRI",
			DefaultValue: defaultVal,
		})
	}
	return cols, rows.Err()
}

func (c *mysqlConn) TableIndexes(ctx context.Context, schema, table string) ([]driver.IndexInfo, error) {
	q := fmt.Sprintf("SHOW INDEX FROM `%s`", strings.ReplaceAll(table, "`", "``"))
	if schema != "" {
		q = fmt.Sprintf("SHOW INDEX FROM `%s`.`%s`",
			strings.ReplaceAll(schema, "`", "``"),
			strings.ReplaceAll(table, "`", "``"))
	}
	rows, err := driver.QueryToStrings(ctx, c.SQLConn, q)
	if err != nil {
		return nil, fmt.Errorf("mysql: indexes: %w", err)
	}

	// SHOW INDEX columns: Table(0), Non_unique(1), Key_name(2), Seq_in_index(3), Column_name(4), ...
	byName := make(map[string]*driver.IndexInfo)
	var order []string
	for _, row := range rows {
		if len(row) < 5 {
			continue
		}
		name := row[2]
		if _, ok := byName[name]; !ok {
			byName[name] = &driver.IndexInfo{Name: name, Unique: row[1] == "0"}
			order = append(order, name)
		}
		byName[name].Columns = append(byName[name].Columns, row[4])
	}
	result := make([]driver.IndexInfo, 0, len(order))
	for _, n := range order {
		result = append(result, *byName[n])
	}
	return result, nil
}

func (c *mysqlConn) TableForeignKeys(ctx context.Context, schema, table string) ([]driver.ForeignKey, error) {
	q := `SELECT
	        kcu.constraint_name,
	        kcu.column_name,
	        COALESCE(kcu.referenced_table_schema, ''),
	        kcu.referenced_table_name,
	        kcu.referenced_column_name
	      FROM information_schema.key_column_usage kcu
	      WHERE kcu.referenced_table_name IS NOT NULL
	        AND kcu.table_name = ?`
	args := []any{table}
	if schema != "" {
		q += " AND kcu.table_schema = ?"
		args = append(args, schema)
	} else {
		q += " AND kcu.table_schema = DATABASE()"
	}
	q += " ORDER BY kcu.constraint_name, kcu.ordinal_position"

	rows, err := c.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("mysql: foreign keys: %w", err)
	}
	defer rows.Close()

	byName := make(map[string]*driver.ForeignKey)
	var order []string
	for rows.Next() {
		var name, col, refSchema, refTable, refCol string
		if err := rows.Scan(&name, &col, &refSchema, &refTable, &refCol); err != nil {
			return nil, err
		}
		if _, ok := byName[name]; !ok {
			byName[name] = &driver.ForeignKey{Name: name, RefSchema: refSchema, RefTable: refTable}
			order = append(order, name)
		}
		byName[name].Columns = append(byName[name].Columns, col)
		byName[name].RefColumns = append(byName[name].RefColumns, refCol)
	}
	out := make([]driver.ForeignKey, 0, len(order))
	for _, n := range order {
		out = append(out, *byName[n])
	}
	return out, rows.Err()
}

func (c *mysqlConn) GenerateDDL(ctx context.Context, schema, table string) (string, error) {
	q := fmt.Sprintf("SHOW CREATE TABLE `%s`", strings.ReplaceAll(table, "`", "``"))
	if schema != "" {
		q = fmt.Sprintf("SHOW CREATE TABLE `%s`.`%s`",
			strings.ReplaceAll(schema, "`", "``"),
			strings.ReplaceAll(table, "`", "``"))
	}
	rows, err := driver.QueryToStrings(ctx, c.SQLConn, q)
	if err != nil {
		return "", fmt.Errorf("mysql: ddl: %w", err)
	}
	if len(rows) == 0 || len(rows[0]) < 2 {
		return "", fmt.Errorf("mysql: table not found: %s", table)
	}
	return rows[0][1] + ";", nil
}
