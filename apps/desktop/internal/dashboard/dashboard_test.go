package dashboard_test

import (
	"context"
	"testing"
	"time"

	"github.com/csap-ai/datapilot/apps/desktop/internal/dashboard"
	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
)

func newStore(t *testing.T) *dashboard.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return dashboard.NewStore(meta.DB)
}

func TestCreateAssignsIDAndTimestamps(t *testing.T) {
	s := newStore(t)
	w := &dashboard.Widget{
		Title:        "Total Users",
		ConnectionID: "c1",
		SQL:          "SELECT COUNT(*) FROM users",
		ChartType:    "number",
	}
	if err := s.Create(context.Background(), w); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if w.ID == "" {
		t.Fatalf("expected ID to be set")
	}
	if w.CreatedAt == "" || w.UpdatedAt == "" {
		t.Fatalf("expected timestamps, got %+v", w)
	}
}

func TestCreateAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	w := &dashboard.Widget{
		Title:        "T",
		ConnectionID: "c1",
		SQL:          "SELECT 1",
		ChartType:    "number",
		Position:     2,
	}
	if err := s.Create(ctx, w); err != nil {
		t.Fatalf("Create: %v", err)
	}

	got, err := s.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1, got %d", len(got))
	}
	if got[0].ID != w.ID || got[0].Title != "T" || got[0].Position != 2 {
		t.Fatalf("widget mismatch: %+v", got[0])
	}
}

func TestUpdate(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	w := &dashboard.Widget{Title: "old", ConnectionID: "c1", SQL: "a", ChartType: "number"}
	_ = s.Create(ctx, w)
	originalUpdatedAt := w.UpdatedAt

	time.Sleep(1100 * time.Millisecond)

	w.Title = "new"
	w.ChartType = "bar"
	w.Position = 5
	if err := s.Update(ctx, w); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if w.UpdatedAt == originalUpdatedAt {
		t.Fatalf("expected UpdatedAt to change after Update")
	}

	got, _ := s.List(ctx)
	if got[0].Title != "new" || got[0].ChartType != "bar" || got[0].Position != 5 {
		t.Fatalf("update not persisted: %+v", got[0])
	}
}

func TestDelete(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	w := &dashboard.Widget{Title: "x", ConnectionID: "c", SQL: "x", ChartType: "number"}
	_ = s.Create(ctx, w)

	if err := s.Delete(ctx, w.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	got, _ := s.List(ctx)
	if len(got) != 0 {
		t.Fatalf("expected 0 after Delete, got %d", len(got))
	}
}

func TestListOrdersByPositionAsc(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	_ = s.Create(ctx, &dashboard.Widget{Title: "c", ConnectionID: "x", SQL: "x", ChartType: "n", Position: 3})
	_ = s.Create(ctx, &dashboard.Widget{Title: "a", ConnectionID: "x", SQL: "x", ChartType: "n", Position: 1})
	_ = s.Create(ctx, &dashboard.Widget{Title: "b", ConnectionID: "x", SQL: "x", ChartType: "n", Position: 2})

	got, err := s.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
	want := []string{"a", "b", "c"}
	for i, w := range want {
		if got[i].Title != w {
			t.Fatalf("at index %d expected title=%s, got %s", i, w, got[i].Title)
		}
	}
}

func TestListEmptyReturnsNonNilSlice(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background())
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got == nil {
		t.Fatalf("expected non-nil empty slice")
	}
}
