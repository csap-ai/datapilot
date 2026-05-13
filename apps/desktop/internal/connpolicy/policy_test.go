package connpolicy_test

import (
	"context"
	"testing"
	"time"

	"github.com/csap-ai/datapilot/apps/desktop/internal/connpolicy"
	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
)

func newStore(t *testing.T) *connpolicy.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return connpolicy.NewStore(meta.DB)
}

func TestGetDefaultsToPermissive(t *testing.T) {
	s := newStore(t)
	p, err := s.Get(context.Background(), "conn-unknown")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if p.ConnectionID != "conn-unknown" {
		t.Fatalf("ConnectionID = %q", p.ConnectionID)
	}
	if !p.AllowDDL || !p.AllowDML || !p.AllowExport {
		t.Fatalf("expected all permissive defaults, got %+v", p)
	}
}

func TestSetAndGet(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	in := &connpolicy.Policy{
		ConnectionID: "conn-1",
		AllowDDL:     false,
		AllowDML:     true,
		AllowExport:  false,
	}
	if err := s.Set(ctx, in); err != nil {
		t.Fatalf("Set: %v", err)
	}
	if in.UpdatedAt == "" {
		t.Fatalf("expected UpdatedAt to be set after Set")
	}
	if _, err := time.Parse(time.RFC3339, in.UpdatedAt); err != nil {
		t.Fatalf("UpdatedAt should be RFC3339, got %q: %v", in.UpdatedAt, err)
	}

	got, err := s.Get(ctx, "conn-1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.AllowDDL {
		t.Fatalf("AllowDDL should be false")
	}
	if !got.AllowDML {
		t.Fatalf("AllowDML should be true")
	}
	if got.AllowExport {
		t.Fatalf("AllowExport should be false")
	}
	if got.UpdatedAt != in.UpdatedAt {
		t.Fatalf("UpdatedAt mismatch: stored %q vs in-mem %q", got.UpdatedAt, in.UpdatedAt)
	}
}

func TestSetUpsert(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	if err := s.Set(ctx, &connpolicy.Policy{
		ConnectionID: "c1",
		AllowDDL:     false,
		AllowDML:     true,
		AllowExport:  true,
	}); err != nil {
		t.Fatalf("first Set: %v", err)
	}
	if err := s.Set(ctx, &connpolicy.Policy{
		ConnectionID: "c1",
		AllowDDL:     true,
		AllowDML:     false,
		AllowExport:  false,
	}); err != nil {
		t.Fatalf("second Set: %v", err)
	}

	got, err := s.Get(ctx, "c1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if !got.AllowDDL {
		t.Fatalf("AllowDDL should be true after upsert")
	}
	if got.AllowDML {
		t.Fatalf("AllowDML should be false after upsert")
	}
	if got.AllowExport {
		t.Fatalf("AllowExport should be false after upsert")
	}
}

func TestGetIsolatesByConnectionID(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	if err := s.Set(ctx, &connpolicy.Policy{ConnectionID: "a", AllowDDL: false, AllowDML: false, AllowExport: false}); err != nil {
		t.Fatalf("Set a: %v", err)
	}
	if err := s.Set(ctx, &connpolicy.Policy{ConnectionID: "b", AllowDDL: true, AllowDML: true, AllowExport: true}); err != nil {
		t.Fatalf("Set b: %v", err)
	}

	a, err := s.Get(ctx, "a")
	if err != nil {
		t.Fatalf("Get a: %v", err)
	}
	if a.AllowDDL || a.AllowDML || a.AllowExport {
		t.Fatalf("expected a to be all-false, got %+v", a)
	}

	b, err := s.Get(ctx, "b")
	if err != nil {
		t.Fatalf("Get b: %v", err)
	}
	if !b.AllowDDL || !b.AllowDML || !b.AllowExport {
		t.Fatalf("expected b to be all-true, got %+v", b)
	}
}
