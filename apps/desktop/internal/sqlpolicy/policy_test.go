package sqlpolicy_test

import (
	"context"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/sqlpolicy"
)

func newStore(t *testing.T) *sqlpolicy.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return sqlpolicy.NewStore(meta.DB)
}

func TestListEmpty(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background())
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got == nil {
		t.Fatalf("expected non-nil empty slice, got nil")
	}
	if len(got) != 0 {
		t.Fatalf("expected empty list, got %d", len(got))
	}
}

func TestCreateSetsIDAndEnabled(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	p := &sqlpolicy.Policy{
		Pattern: `DROP\s+TABLE`,
		Level:   "danger",
		Message: "禁止删表",
	}
	if err := s.Create(ctx, p); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if p.ID == 0 {
		t.Fatalf("expected ID to be set after Create")
	}
	if !p.Enabled {
		t.Fatalf("expected Enabled=true after Create")
	}
}

func TestCreateAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	p := &sqlpolicy.Policy{Pattern: `DROP\s+TABLE`, Level: "danger", Message: "x"}
	if err := s.Create(ctx, p); err != nil {
		t.Fatalf("Create: %v", err)
	}

	list, err := s.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 policy, got %d", len(list))
	}
	got := list[0]
	if got.ID != p.ID {
		t.Fatalf("ID mismatch: %d vs %d", got.ID, p.ID)
	}
	if got.Pattern != `DROP\s+TABLE` {
		t.Fatalf("Pattern = %q", got.Pattern)
	}
	if got.Level != "danger" {
		t.Fatalf("Level = %q", got.Level)
	}
	if got.Message != "x" {
		t.Fatalf("Message = %q", got.Message)
	}
	if !got.Enabled {
		t.Fatalf("expected Enabled=true")
	}
	if got.CreatedAt == "" {
		t.Fatalf("expected CreatedAt to be set")
	}
}

func TestToggle(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	p := &sqlpolicy.Policy{Pattern: "x", Level: "warning", Message: "y"}
	if err := s.Create(ctx, p); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := s.Toggle(ctx, p.ID, false); err != nil {
		t.Fatalf("Toggle off: %v", err)
	}
	list, _ := s.List(ctx)
	if list[0].Enabled {
		t.Fatalf("expected Enabled=false after Toggle off")
	}

	if err := s.Toggle(ctx, p.ID, true); err != nil {
		t.Fatalf("Toggle on: %v", err)
	}
	list, _ = s.List(ctx)
	if !list[0].Enabled {
		t.Fatalf("expected Enabled=true after Toggle on")
	}
}

func TestToggleNonExistentIsNoOp(t *testing.T) {
	s := newStore(t)
	if err := s.Toggle(context.Background(), 9999, false); err != nil {
		t.Fatalf("Toggle on unknown id should not error, got: %v", err)
	}
}

func TestDelete(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	p := &sqlpolicy.Policy{Pattern: "x", Level: "warning", Message: "y"}
	if err := s.Create(ctx, p); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := s.Delete(ctx, p.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	list, _ := s.List(ctx)
	if len(list) != 0 {
		t.Fatalf("expected 0 after Delete, got %d", len(list))
	}
}

func TestDeleteNonExistentIsNoOp(t *testing.T) {
	s := newStore(t)
	if err := s.Delete(context.Background(), 9999); err != nil {
		t.Fatalf("Delete on unknown id should not error, got: %v", err)
	}
}

func TestListReturnsAllRows(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for _, p := range []string{"a", "b", "c"} {
		if err := s.Create(ctx, &sqlpolicy.Policy{Pattern: p, Level: "warning", Message: p}); err != nil {
			t.Fatalf("Create %q: %v", p, err)
		}
	}
	list, err := s.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(list))
	}

	seen := make(map[string]bool)
	for _, p := range list {
		seen[p.Pattern] = true
	}
	for _, want := range []string{"a", "b", "c"} {
		if !seen[want] {
			t.Fatalf("missing pattern %q in list", want)
		}
	}
}
