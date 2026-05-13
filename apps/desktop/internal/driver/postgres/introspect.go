package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
)

func (c *pgConn) TableColumns(ctx context.Context, schema, table string) ([]driver.ColumnInfo, error) {
	if schema == "" {
		schema = "public"
	}
	rows, err := c.DB.QueryContext(ctx, `
		SELECT
			c.column_name,
			c.data_type,
			c.is_nullable = 'YES',
			COALESCE(c.column_default, ''),
			EXISTS (
				SELECT 1 FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage kcu
					ON tc.constraint_name = kcu.constraint_name
				   AND tc.table_schema = kcu.table_schema
				WHERE tc.constraint_type = 'PRIMARY KEY'
				  AND tc.table_schema = c.table_schema
				  AND tc.table_name = c.table_name
				  AND kcu.column_name = c.column_name
			)
		FROM information_schema.columns c
		WHERE c.table_schema = $1 AND c.table_name = $2
		ORDER BY c.ordinal_position`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("postgres: columns: %w", err)
	}
	defer rows.Close()

	cols := make([]driver.ColumnInfo, 0, 16)
	for rows.Next() {
		var ci driver.ColumnInfo
		if err := rows.Scan(&ci.Name, &ci.Type, &ci.Nullable, &ci.DefaultValue, &ci.PrimaryKey); err != nil {
			return nil, err
		}
		cols = append(cols, ci)
	}
	return cols, rows.Err()
}

func (c *pgConn) TableIndexes(ctx context.Context, schema, table string) ([]driver.IndexInfo, error) {
	if schema == "" {
		schema = "public"
	}
	rows, err := c.DB.QueryContext(ctx, `
		SELECT
			i.relname,
			string_agg(a.attname, ',' ORDER BY array_position(ix.indkey, a.attnum)),
			ix.indisunique
		FROM pg_class t
		JOIN pg_index ix ON t.oid = ix.indrelid
		JOIN pg_class i ON i.oid = ix.indexrelid
		JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
		JOIN pg_namespace ns ON ns.oid = t.relnamespace
		WHERE ns.nspname = $1 AND t.relname = $2
		GROUP BY i.relname, ix.indisunique
		ORDER BY i.relname`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("postgres: indexes: %w", err)
	}
	defer rows.Close()

	indexes := make([]driver.IndexInfo, 0)
	for rows.Next() {
		var name, colsStr string
		var unique bool
		if err := rows.Scan(&name, &colsStr, &unique); err != nil {
			return nil, err
		}
		indexes = append(indexes, driver.IndexInfo{
			Name:    name,
			Columns: strings.Split(colsStr, ","),
			Unique:  unique,
		})
	}
	return indexes, rows.Err()
}

func (c *pgConn) TableForeignKeys(ctx context.Context, schema, table string) ([]driver.ForeignKey, error) {
	if schema == "" {
		schema = "public"
	}
	rows, err := c.DB.QueryContext(ctx, `
		SELECT
			con.conname,
			string_agg(att.attname,  ',' ORDER BY array_position(con.conkey,  att.attnum)),
			fns.nspname,
			fcl.relname,
			string_agg(fatt.attname, ',' ORDER BY array_position(con.confkey, fatt.attnum))
		FROM pg_constraint con
		JOIN pg_class      cl  ON cl.oid  = con.conrelid
		JOIN pg_namespace  ns  ON ns.oid  = cl.relnamespace
		JOIN pg_attribute  att ON att.attrelid  = cl.oid  AND att.attnum  = ANY(con.conkey)
		JOIN pg_class      fcl ON fcl.oid = con.confrelid
		JOIN pg_namespace  fns ON fns.oid = fcl.relnamespace
		JOIN pg_attribute  fatt ON fatt.attrelid = fcl.oid AND fatt.attnum = ANY(con.confkey)
		WHERE con.contype = 'f' AND ns.nspname = $1 AND cl.relname = $2
		GROUP BY con.conname, fns.nspname, fcl.relname
		ORDER BY con.conname`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("postgres: foreign keys: %w", err)
	}
	defer rows.Close()

	out := make([]driver.ForeignKey, 0)
	for rows.Next() {
		var name, cols, refSchema, refTable, refCols string
		if err := rows.Scan(&name, &cols, &refSchema, &refTable, &refCols); err != nil {
			return nil, err
		}
		out = append(out, driver.ForeignKey{
			Name:       name,
			Columns:    strings.Split(cols, ","),
			RefSchema:  refSchema,
			RefTable:   refTable,
			RefColumns: strings.Split(refCols, ","),
		})
	}
	return out, rows.Err()
}

func (c *pgConn) GenerateDDL(ctx context.Context, schema, table string) (string, error) {
	if schema == "" {
		schema = "public"
	}
	cols, err := c.TableColumns(ctx, schema, table)
	if err != nil {
		return "", err
	}
	if len(cols) == 0 {
		return "", fmt.Errorf("postgres: table not found: %s.%s", schema, table)
	}

	var b strings.Builder
	fmt.Fprintf(&b, "CREATE TABLE %s.%s (\n", quoteIdent(schema), quoteIdent(table))
	var pkCols []string
	for i, col := range cols {
		fmt.Fprintf(&b, "    %s %s", quoteIdent(col.Name), col.Type)
		if !col.Nullable {
			b.WriteString(" NOT NULL")
		}
		if col.DefaultValue != "" {
			fmt.Fprintf(&b, " DEFAULT %s", col.DefaultValue)
		}
		if col.PrimaryKey {
			pkCols = append(pkCols, quoteIdent(col.Name))
		}
		if i < len(cols)-1 || len(pkCols) > 0 {
			b.WriteString(",")
		}
		b.WriteString("\n")
	}
	if len(pkCols) > 0 {
		fmt.Fprintf(&b, "    PRIMARY KEY (%s)\n", strings.Join(pkCols, ", "))
	}
	b.WriteString(");")
	return b.String(), nil
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
