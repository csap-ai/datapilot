package driver

import (
	"context"
	"database/sql"
	"fmt"
)

// SQLConn adapts *sql.DB to the Conn interface.
// Concrete drivers embed this and add type-specific behaviour.
type SQLConn struct {
	DB *sql.DB
}

func NewSQLConn(db *sql.DB) *SQLConn { return &SQLConn{DB: db} }

func (c *SQLConn) Ping(ctx context.Context) error { return c.DB.PingContext(ctx) }

func (c *SQLConn) Query(ctx context.Context, q string, args ...any) (Rows, error) {
	rows, err := c.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	return &sqlRows{rows: rows}, nil
}

func (c *SQLConn) Exec(ctx context.Context, q string, args ...any) (Result, error) {
	r, err := c.DB.ExecContext(ctx, q, args...)
	if err != nil {
		return Result{}, err
	}
	ra, _ := r.RowsAffected()
	li, _ := r.LastInsertId()
	return Result{RowsAffected: ra, LastInsertID: li}, nil
}

func (c *SQLConn) Close() error { return c.DB.Close() }

// sqlRows adapts *sql.Rows to the Rows interface.
type sqlRows struct {
	rows    *sql.Rows
	cols    []Column
	colsErr error
}

func (r *sqlRows) Columns() []Column {
	if r.cols != nil || r.colsErr != nil {
		return r.cols
	}
	names, err := r.rows.Columns()
	if err != nil {
		r.colsErr = err
		return nil
	}
	types, _ := r.rows.ColumnTypes()
	r.cols = make([]Column, len(names))
	for i, name := range names {
		col := Column{Name: name}
		if i < len(types) {
			col.Type = types[i].DatabaseTypeName()
			if nullable, ok := types[i].Nullable(); ok {
				col.Nullable = nullable
			}
		}
		r.cols[i] = col
	}
	return r.cols
}

func (r *sqlRows) Next() bool          { return r.rows.Next() }
func (r *sqlRows) Scan(dest ...any) error { return r.rows.Scan(dest...) }
func (r *sqlRows) Close() error          { return r.rows.Close() }

func (r *sqlRows) Err() error {
	if r.colsErr != nil {
		return r.colsErr
	}
	return r.rows.Err()
}

// QueryToStrings executes a SQL query on conn and returns all rows as string slices.
func QueryToStrings(ctx context.Context, conn *SQLConn, q string, args ...any) ([][]string, error) {
	rows, err := conn.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols := rows.Columns()
	var result [][]string
	for rows.Next() {
		dest := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range dest {
			ptrs[i] = &dest[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make([]string, len(cols))
		for i, v := range dest {
			row[i] = fmt.Sprintf("%v", v)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}
