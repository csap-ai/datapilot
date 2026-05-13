package savedquery_test

import (
	"context"
	"testing"
	"time"

	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/savedquery"
)

func newStore(t *testing.T) *savedquery.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return savedquery.NewStore(meta.DB)
}

func TestSaveAssignsIDAndTimestamps(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	r := &savedquery.Record{
		ConnectionID: "c1",
		Name:         "report",
		SQL:          "SELECT 1",
	}
	if err := s.Save(ctx, r); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if r.ID == "" {
		t.Fatalf("expected ID to be set")
	}
	if r.CreatedAt == "" || r.UpdatedAt == "" {
		t.Fatalf("expected timestamps to be set, got %+v", r)
	}
	if _, err := time.Parse(time.RFC3339, r.CreatedAt); err != nil {
		t.Fatalf("CreatedAt not RFC3339: %v", err)
	}
}

func TestSaveAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	r := &savedquery.Record{ConnectionID: "c1", Name: "report", SQL: "SELECT 1"}
	if err := s.Save(ctx, r); err != nil {
		t.Fatalf("Save: %v", err)
	}

	got, err := s.List(ctx, "c1")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1, got %d", len(got))
	}
	if got[0].ID != r.ID || got[0].Name != "report" || got[0].SQL != "SELECT 1" {
		t.Fatalf("record mismatch: %+v", got[0])
	}
}

func TestListIncludesGlobalQueries(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Save(ctx, &savedquery.Record{ConnectionID: "c1", Name: "scoped", SQL: "a"})
	_ = s.Save(ctx, &savedquery.Record{ConnectionID: "", Name: "global", SQL: "b"})
	_ = s.Save(ctx, &savedquery.Record{ConnectionID: "c2", Name: "other", SQL: "c"})

	got, err := s.List(ctx, "c1")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 (scoped + global), got %d: %+v", len(got), got)
	}
	names := map[string]bool{}
	for _, r := range got {
		names[r.Name] = true
	}
	if !names["scoped"] || !names["global"] {
		t.Fatalf("missing scoped or global: %v", names)
	}
	if names["other"] {
		t.Fatalf("should not include other connection's query")
	}
}

func TestRename(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	r := &savedquery.Record{ConnectionID: "c1", Name: "old", SQL: "x"}
	if err := s.Save(ctx, r); err != nil {
		t.Fatalf("Save: %v", err)
	}
	originalUpdatedAt := r.UpdatedAt

	time.Sleep(1100 * time.Millisecond)

	if err := s.Rename(ctx, r.ID, "new"); err != nil {
		t.Fatalf("Rename: %v", err)
	}

	got, _ := s.List(ctx, "c1")
	if len(got) != 1 || got[0].Name != "new" {
		t.Fatalf("expected name=new, got %+v", got)
	}
	if got[0].UpdatedAt == originalUpdatedAt {
		t.Fatalf("expected UpdatedAt to change after rename")
	}
}

func TestDelete(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	r := &savedquery.Record{ConnectionID: "c1", Name: "x", SQL: "x"}
	_ = s.Save(ctx, r)

	if err := s.Delete(ctx, r.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	got, _ := s.List(ctx, "c1")
	if len(got) != 0 {
		t.Fatalf("expected 0 after Delete, got %d", len(got))
	}
}

func TestListEmptyReturnsNonNilSlice(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background(), "nonexistent")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got == nil {
		t.Fatalf("expected non-nil empty slice")
	}
}
