package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
)

type Migration struct {
	Version int
	Name    string
	Up      string
	Down    string
}

func Run(ctx context.Context, db *sql.DB, migrations []Migration) error {
	if err := ensureTable(ctx, db); err != nil {
		return fmt.Errorf("migrate: ensure table: %w", err)
	}

	current, err := currentVersion(ctx, db)
	if err != nil {
		return fmt.Errorf("migrate: current version: %w", err)
	}

	pending := pendingMigrations(migrations, current)
	for _, m := range pending {
		if err := apply(ctx, db, m); err != nil {
			return fmt.Errorf("migrate: apply v%d %s: %w", m.Version, m.Name, err)
		}
	}
	return nil
}

func Rollback(ctx context.Context, db *sql.DB, migrations []Migration) error {
	current, err := currentVersion(ctx, db)
	if err != nil {
		return fmt.Errorf("migrate: current version: %w", err)
	}
	if current == 0 {
		return nil
	}

	for _, m := range migrations {
		if m.Version == current {
			return rollback(ctx, db, m)
		}
	}
	return fmt.Errorf("migrate: no migration found for version %d", current)
}

func ensureTable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name    TEXT NOT NULL,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`)
	return err
}

func currentVersion(ctx context.Context, db *sql.DB) (int, error) {
	var v int
	err := db.QueryRowContext(ctx, `SELECT COALESCE(MAX(version), 0) FROM schema_migrations`).Scan(&v)
	return v, err
}

func pendingMigrations(all []Migration, current int) []Migration {
	sort.Slice(all, func(i, j int) bool { return all[i].Version < all[j].Version })
	var pending []Migration
	for _, m := range all {
		if m.Version > current {
			pending = append(pending, m)
		}
	}
	return pending
}

func apply(ctx context.Context, db *sql.DB, m Migration) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, m.Up); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version, name) VALUES (?, ?)`, m.Version, m.Name); err != nil {
		return err
	}
	return tx.Commit()
}

func rollback(ctx context.Context, db *sql.DB, m Migration) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, m.Down); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM schema_migrations WHERE version = ?`, m.Version); err != nil {
		return err
	}
	return tx.Commit()
}
