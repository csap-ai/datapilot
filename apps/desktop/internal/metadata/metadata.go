package metadata

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"

	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata/migrate"
)

var migrations = []migrate.Migration{
	{
		Version: 1,
		Name:    "create_preferences",
		Up:      `CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		Down:    `DROP TABLE preferences`,
	},
	{
		Version: 2,
		Name:    "create_workspace_state",
		Up:      `CREATE TABLE workspace_state (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		Down:    `DROP TABLE workspace_state`,
	},
	{
		Version: 3,
		Name:    "create_query_history",
		Up: `CREATE TABLE query_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			connection_id TEXT NOT NULL,
			sql_text TEXT NOT NULL,
			duration_ms INTEGER,
			row_count INTEGER,
			error TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE query_history`,
	},
	{
		Version: 4,
		Name:    "create_data_sources",
		Up: `CREATE TABLE data_sources (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			host TEXT NOT NULL DEFAULT '',
			port INTEGER NOT NULL DEFAULT 0,
			database TEXT NOT NULL DEFAULT '',
			username TEXT NOT NULL DEFAULT '',
			file_path TEXT NOT NULL DEFAULT '',
			read_only INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE data_sources`,
	},
	{
		Version: 5,
		Name:    "create_saved_queries",
		Up: `CREATE TABLE saved_queries (
			id TEXT PRIMARY KEY,
			connection_id TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
			sql_text TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE saved_queries`,
	},
	{
		Version: 6,
		Name:    "create_ai_audit_events",
		Up: `CREATE TABLE ai_audit_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			action TEXT NOT NULL,
			provider TEXT NOT NULL,
			model TEXT NOT NULL,
			input_len INTEGER NOT NULL DEFAULT 0,
			output_len INTEGER NOT NULL DEFAULT 0,
			duration_ms INTEGER NOT NULL DEFAULT 0,
			error TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE ai_audit_events`,
	},
	{
		Version: 7,
		Name:    "create_sql_audit_events",
		Up: `CREATE TABLE sql_audit_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			connection_id TEXT NOT NULL,
			connection_name TEXT NOT NULL DEFAULT '',
			sql_text TEXT NOT NULL,
			duration_ms INTEGER NOT NULL DEFAULT 0,
			rows_affected INTEGER NOT NULL DEFAULT 0,
			error TEXT,
			risk_level TEXT NOT NULL DEFAULT 'none',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE sql_audit_events`,
	},
	{
		Version: 8,
		Name:    "create_export_audit_events",
		Up: `CREATE TABLE export_audit_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			connection_id TEXT NOT NULL,
			connection_name TEXT NOT NULL DEFAULT '',
			format TEXT NOT NULL,
			row_count INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE export_audit_events`,
	},
	{
		Version: 9,
		Name:    "create_connection_policies",
		Up: `CREATE TABLE connection_policies (
			connection_id TEXT PRIMARY KEY,
			allow_ddl INTEGER NOT NULL DEFAULT 1,
			allow_dml INTEGER NOT NULL DEFAULT 1,
			allow_export INTEGER NOT NULL DEFAULT 1,
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE connection_policies`,
	},
	{
		Version: 10,
		Name:    "create_sql_policies",
		Up: `CREATE TABLE sql_policies (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pattern TEXT NOT NULL,
			level TEXT NOT NULL DEFAULT 'warning',
			message TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE sql_policies`,
	},
	{
		Version: 11,
		Name:    "create_dashboard_widgets",
		Up: `CREATE TABLE dashboard_widgets (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			connection_id TEXT NOT NULL,
			sql_text TEXT NOT NULL,
			chart_type TEXT NOT NULL DEFAULT 'number',
			position INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		Down: `DROP TABLE dashboard_widgets`,
	},
}

type Store struct {
	DB *sql.DB
}

func Open(dataDir string) (*Store, error) {
	dbPath := filepath.Join(dataDir, "metadata.db")
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("metadata: open: %w", err)
	}

	db.SetMaxOpenConns(1)

	if err := migrate.Run(context.Background(), db, migrations); err != nil {
		db.Close()
		return nil, fmt.Errorf("metadata: migrate: %w", err)
	}

	return &Store{DB: db}, nil
}

func (s *Store) Close() error {
	return s.DB.Close()
}
