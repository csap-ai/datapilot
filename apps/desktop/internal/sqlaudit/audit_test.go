package sqlaudit_test

import (
	"context"
	"strings"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/sqlaudit"
)

func newStore(t *testing.T) *sqlaudit.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return sqlaudit.NewStore(meta.DB)
}

func TestLogAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	in := &sqlaudit.Event{
		ConnectionID:   "c1",
		ConnectionName: "Local PG",
		SQL:            "SELECT 1",
		DurationMs:     42,
		RowsAffected:   1,
		RiskLevel:      "none",
	}
	if err := s.Log(ctx, in); err != nil {
		t.Fatalf("Log: %v", err)
	}

	got, err := s.List(ctx, sqlaudit.ListFilter{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	e := got[0]
	if e.SQL != "SELECT 1" || e.ConnectionID != "c1" || e.DurationMs != 42 || e.RiskLevel != "none" {
		t.Fatalf("event mismatch: %+v", e)
	}
	if e.Error != "" {
		t.Fatalf("expected empty Error, got %q", e.Error)
	}
	if e.CreatedAt == "" {
		t.Fatalf("expected CreatedAt to be set")
	}
}

func TestListEmptyReturnsNonNilSlice(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background(), sqlaudit.ListFilter{})
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

func TestListFilterByConnection(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "a", SQL: "x", RiskLevel: "none"})
	_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "b", SQL: "y", RiskLevel: "none"})
	_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "a", SQL: "z", RiskLevel: "none"})

	got, err := s.List(ctx, sqlaudit.ListFilter{ConnectionID: "a"})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 events for conn=a, got %d", len(got))
	}
	for _, e := range got {
		if e.ConnectionID != "a" {
			t.Fatalf("unexpected ConnectionID %q in filtered list", e.ConnectionID)
		}
	}
}

func TestListFilterErrorOnly(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "a", SQL: "ok", RiskLevel: "none"})
	_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "a", SQL: "fail", Error: "boom", RiskLevel: "none"})

	got, err := s.List(ctx, sqlaudit.ListFilter{ErrorOnly: true})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 error event, got %d", len(got))
	}
	if got[0].Error != "boom" {
		t.Fatalf("Error = %q", got[0].Error)
	}
}

func TestListLimitDefaultsTo100(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "c", SQL: "x", RiskLevel: "none"})
	}
	got, err := s.List(ctx, sqlaudit.ListFilter{Limit: 0})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 5 {
		t.Fatalf("expected 5 with default limit, got %d", len(got))
	}
}

func TestListLimitExplicit(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		_ = s.Log(ctx, &sqlaudit.Event{ConnectionID: "c", SQL: "x", RiskLevel: "none"})
	}
	got, err := s.List(ctx, sqlaudit.ListFilter{Limit: 2})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 with explicit limit, got %d", len(got))
	}
}

func TestExportCSVContainsHeaderAndRows(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Log(ctx, &sqlaudit.Event{
		ConnectionID:   "c1",
		ConnectionName: "Local",
		SQL:            "SELECT 1",
		DurationMs:     10,
		RowsAffected:   1,
		RiskLevel:      "none",
	})

	csv, err := s.ExportCSV(ctx, sqlaudit.ListFilter{})
	if err != nil {
		t.Fatalf("ExportCSV: %v", err)
	}
	if !strings.Contains(csv, "id,connection_id,connection_name,sql,duration_ms,rows_affected,error,risk_level,created_at") {
		t.Fatalf("missing header in CSV:\n%s", csv)
	}
	if !strings.Contains(csv, "SELECT 1") {
		t.Fatalf("missing SQL row in CSV:\n%s", csv)
	}
	if !strings.Contains(csv, "Local") {
		t.Fatalf("missing connection name in CSV:\n%s", csv)
	}
}

func TestExportCSVEmptyHasOnlyHeader(t *testing.T) {
	s := newStore(t)
	csv, err := s.ExportCSV(context.Background(), sqlaudit.ListFilter{})
	if err != nil {
		t.Fatalf("ExportCSV: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(csv), "\n")
	if len(lines) != 1 {
		t.Fatalf("expected only header line, got %d lines:\n%s", len(lines), csv)
	}
}
