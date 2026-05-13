package aiaudit_test

import (
	"context"
	"testing"

	"github.com/csap-ai/datapilot/apps/desktop/internal/aiaudit"
	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
)

func newStore(t *testing.T) *aiaudit.Store {
	t.Helper()
	meta, err := metadata.Open(t.TempDir())
	if err != nil {
		t.Fatalf("metadata.Open: %v", err)
	}
	t.Cleanup(func() { meta.Close() })
	return aiaudit.NewStore(meta.DB)
}

func TestLogAndList(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	in := &aiaudit.Event{
		Action:     "generate",
		Provider:   "openai",
		Model:      "gpt-4o-mini",
		InputLen:   100,
		OutputLen:  200,
		DurationMs: 500,
	}
	if err := s.Log(ctx, in); err != nil {
		t.Fatalf("Log: %v", err)
	}

	got, err := s.List(ctx, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	e := got[0]
	if e.Action != "generate" || e.Provider != "openai" || e.Model != "gpt-4o-mini" {
		t.Fatalf("event fields mismatch: %+v", e)
	}
	if e.InputLen != 100 || e.OutputLen != 200 || e.DurationMs != 500 {
		t.Fatalf("event metrics mismatch: %+v", e)
	}
	if e.Error != "" {
		t.Fatalf("expected empty Error, got %q", e.Error)
	}
}

func TestLogWithError(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	if err := s.Log(ctx, &aiaudit.Event{
		Action:   "explain",
		Provider: "openai",
		Model:    "gpt-4o",
		Error:    "rate limited",
	}); err != nil {
		t.Fatalf("Log: %v", err)
	}

	got, _ := s.List(ctx, 10)
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	if got[0].Error != "rate limited" {
		t.Fatalf("Error = %q", got[0].Error)
	}
}

func TestListEmptyReturnsNonNilSlice(t *testing.T) {
	s := newStore(t)
	got, err := s.List(context.Background(), 10)
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

func TestListLimitDefaultsTo50(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_ = s.Log(ctx, &aiaudit.Event{Action: "x", Provider: "p", Model: "m"})
	}
	got, err := s.List(ctx, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
}

func TestListLimitExplicit(t *testing.T) {
	s := newStore(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		_ = s.Log(ctx, &aiaudit.Event{Action: "x", Provider: "p", Model: "m"})
	}
	got, err := s.List(ctx, 2)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2, got %d", len(got))
	}
}
