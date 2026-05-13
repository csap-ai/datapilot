package metadata

import (
	"testing"
)

func TestOpenAndClose(t *testing.T) {
	dir := t.TempDir()

	store, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	// Verify tables exist.
	tables := []string{"preferences", "workspace_state", "query_history", "schema_migrations"}
	for _, name := range tables {
		var found string
		err := store.DB.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, name).Scan(&found)
		if err != nil {
			t.Errorf("table %s not found: %v", name, err)
		}
	}
}

func TestOpenIdempotent(t *testing.T) {
	dir := t.TempDir()

	s1, err := Open(dir)
	if err != nil {
		t.Fatalf("first Open: %v", err)
	}
	s1.Close()

	s2, err := Open(dir)
	if err != nil {
		t.Fatalf("second Open: %v", err)
	}
	s2.Close()
}
