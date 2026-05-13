package backup_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/csap-ai/datapilot/apps/desktop/internal/backup"
	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
)

func newService(t *testing.T) (*backup.Service, string) {
	t.Helper()
	dir := t.TempDir()
	meta, err := metadata.Open(dir)
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return backup.New(dir, meta.DB), dir
}

func TestCreateProducesBackupFile(t *testing.T) {
	s, dir := newService(t)

	info, err := s.Create(context.Background())
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if info.Path == "" {
		t.Fatalf("expected Path to be set")
	}
	if info.Size <= 0 {
		t.Fatalf("expected Size > 0, got %d", info.Size)
	}
	if !strings.HasPrefix(info.Name, "datapilot-") || !strings.HasSuffix(info.Name, ".db") {
		t.Fatalf("unexpected Name %q", info.Name)
	}
	if _, err := time.Parse(time.RFC3339, info.CreatedAt); err != nil {
		t.Fatalf("CreatedAt not RFC3339: %v", err)
	}

	if _, err := os.Stat(info.Path); err != nil {
		t.Fatalf("backup file should exist: %v", err)
	}
	if !strings.HasPrefix(info.Path, filepath.Join(dir, "backups")+string(os.PathSeparator)) {
		t.Fatalf("backup path %q should be inside %q/backups", info.Path, dir)
	}
}

func TestListEmpty(t *testing.T) {
	s, _ := newService(t)
	got, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got == nil {
		t.Fatalf("expected non-nil empty slice")
	}
	if len(got) != 0 {
		t.Fatalf("expected 0, got %d", len(got))
	}
}

func TestListReturnsCreatedBackups(t *testing.T) {
	s, _ := newService(t)
	ctx := context.Background()

	if _, err := s.Create(ctx); err != nil {
		t.Fatalf("Create: %v", err)
	}

	got, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1, got %d", len(got))
	}
	if !strings.HasSuffix(got[0].Name, ".db") {
		t.Fatalf("unexpected backup name %q", got[0].Name)
	}
}

func TestDeleteRemovesFile(t *testing.T) {
	s, _ := newService(t)
	ctx := context.Background()

	info, err := s.Create(ctx)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := s.Delete(info.Path); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := os.Stat(info.Path); !os.IsNotExist(err) {
		t.Fatalf("file should be removed, stat err = %v", err)
	}
}

func TestDeleteRejectsPathOutsideBackupDir(t *testing.T) {
	s, _ := newService(t)

	outside := filepath.Join(t.TempDir(), "evil.db")
	if err := os.WriteFile(outside, []byte("x"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}

	err := s.Delete(outside)
	if err == nil {
		t.Fatalf("expected Delete to reject path outside backup dir")
	}
	if !strings.Contains(err.Error(), "outside backup dir") {
		t.Fatalf("unexpected error %v", err)
	}
	if _, err := os.Stat(outside); err != nil {
		t.Fatalf("outside file should still exist: %v", err)
	}
}

func TestArchiveAuditRejectsZeroOrNegativeDays(t *testing.T) {
	s, _ := newService(t)
	for _, d := range []int{0, -1, -100} {
		if _, err := s.ArchiveAudit(context.Background(), d); err == nil {
			t.Fatalf("expected error for beforeDays=%d", d)
		}
	}
}

func TestArchiveAuditDeletesOnlyOldRows(t *testing.T) {
	s, dir := newService(t)
	ctx := context.Background()

	meta, err := metadata.Open(dir)
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	defer meta.Close()

	old := time.Now().UTC().AddDate(0, 0, -10).Format(time.RFC3339)
	recent := time.Now().UTC().Format(time.RFC3339)

	// SQL audit: 1 old + 1 recent
	if _, err := meta.DB.ExecContext(ctx,
		`INSERT INTO sql_audit_events (connection_id, sql_text, risk_level, created_at) VALUES ('c', 'a', 'none', ?), ('c', 'b', 'none', ?)`,
		old, recent); err != nil {
		t.Fatalf("seed sql_audit: %v", err)
	}
	// AI audit: 1 old
	if _, err := meta.DB.ExecContext(ctx,
		`INSERT INTO ai_audit_events (action, provider, model, created_at) VALUES ('x', 'p', 'm', ?)`,
		old); err != nil {
		t.Fatalf("seed ai_audit: %v", err)
	}
	// Export audit: 1 recent
	if _, err := meta.DB.ExecContext(ctx,
		`INSERT INTO export_audit_events (connection_id, format, row_count, created_at) VALUES ('c', 'csv', 10, ?)`,
		recent); err != nil {
		t.Fatalf("seed export_audit: %v", err)
	}

	res, err := s.ArchiveAudit(ctx, 5)
	if err != nil {
		t.Fatalf("ArchiveAudit: %v", err)
	}
	if res.SQLDeleted != 1 {
		t.Fatalf("SQLDeleted = %d, want 1", res.SQLDeleted)
	}
	if res.AIDeleted != 1 {
		t.Fatalf("AIDeleted = %d, want 1", res.AIDeleted)
	}
	if res.ExportDeleted != 0 {
		t.Fatalf("ExportDeleted = %d, want 0", res.ExportDeleted)
	}

	var sqlRemaining, exportRemaining int
	_ = meta.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM sql_audit_events`).Scan(&sqlRemaining)
	_ = meta.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM export_audit_events`).Scan(&exportRemaining)
	if sqlRemaining != 1 {
		t.Fatalf("expected 1 sql_audit row remaining, got %d", sqlRemaining)
	}
	if exportRemaining != 1 {
		t.Fatalf("expected 1 export_audit row remaining, got %d", exportRemaining)
	}
}
