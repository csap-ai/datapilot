package queryhistory_test

import (
	"context"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/queryhistory"
)

func newStore(t *testing.T) *queryhistory.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return queryhistory.NewStore(meta.DB)
}

func TestSaveAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	if err := s.Save(ctx, &queryhistory.Record{
		ConnectionID: "c1",
		SQL:          "SELECT 1",
		DurationMs:   42,
		RowCount:     1,
	}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	got, err := s.List(ctx, "c1", 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 record, got %d", len(got))
	}
	r := got[0]
	if r.SQL != "SELECT 1" || r.DurationMs != 42 || r.RowCount != 1 {
		t.Fatalf("record mismatch: %+v", r)
	}
	if r.Error != "" {
		t.Fatalf("expected empty Error, got %q", r.Error)
	}
}

func TestSaveWithError(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	if err := s.Save(ctx, &queryhistory.Record{
		ConnectionID: "c1",
		SQL:          "SELECT bad",
		Error:        "syntax error",
	}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	got, _ := s.List(ctx, "c1", 10)
	if len(got) != 1 || got[0].Error != "syntax error" {
		t.Fatalf("expected Error preserved, got: %+v", got)
	}
}

func TestListFiltersByConnectionID(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Save(ctx, &queryhistory.Record{ConnectionID: "a", SQL: "x"})
	_ = s.Save(ctx, &queryhistory.Record{ConnectionID: "b", SQL: "y"})
	_ = s.Save(ctx, &queryhistory.Record{ConnectionID: "a", SQL: "z"})

	got, err := s.List(ctx, "a", 10)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 records for conn=a, got %d", len(got))
	}
	for _, r := range got {
		if r.ConnectionID != "a" {
			t.Fatalf("unexpected ConnectionID %q", r.ConnectionID)
		}
	}
}

func TestListEmptyReturnsNonNilSlice(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background(), "nonexistent", 10)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got == nil {
		t.Fatalf("expected non-nil empty slice")
	}
}

func TestListLimitDefaultsTo50(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_ = s.Save(ctx, &queryhistory.Record{ConnectionID: "c", SQL: "x"})
	}
	got, _ := s.List(ctx, "c", 0)
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
}

func TestListLimitExplicit(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		_ = s.Save(ctx, &queryhistory.Record{ConnectionID: "c", SQL: "x"})
	}
	got, _ := s.List(ctx, "c", 2)
	if len(got) != 2 {
		t.Fatalf("expected 2, got %d", len(got))
	}
}
