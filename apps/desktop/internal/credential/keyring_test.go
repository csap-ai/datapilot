package credential_test

import (
	"errors"
	"testing"

	"github.com/zalando/go-keyring"

	"github.com/csap-ai/datapilot/apps/desktop/internal/credential"
)

func TestMain(m *testing.M) {
	keyring.MockInit()
	m.Run()
}

func TestSetAndGet(t *testing.T) {
	s := credential.NewKeyringStore()
	if err := s.Set("datapilot-test", "user1", "secret-value"); err != nil {
		t.Fatalf("Set: %v", err)
	}
	got, err := s.Get("datapilot-test", "user1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != "secret-value" {
		t.Fatalf("Get returned %q", got)
	}
}

func TestSetOverwrites(t *testing.T) {
	s := credential.NewKeyringStore()
	_ = s.Set("svc", "acct", "v1")
	_ = s.Set("svc", "acct", "v2")
	got, err := s.Get("svc", "acct")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != "v2" {
		t.Fatalf("expected v2 after overwrite, got %q", got)
	}
}

func TestGetReturnsErrNotFoundForMissingKey(t *testing.T) {
	s := credential.NewKeyringStore()
	_, err := s.Get("nonexistent-service", "nobody")
	if err == nil {
		t.Fatalf("expected error for missing key")
	}
	if !errors.Is(err, credential.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestDelete(t *testing.T) {
	s := credential.NewKeyringStore()
	_ = s.Set("svc", "acct", "v")
	if err := s.Delete("svc", "acct"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	_, err := s.Get("svc", "acct")
	if !errors.Is(err, credential.ErrNotFound) {
		t.Fatalf("after Delete expected ErrNotFound, got %v", err)
	}
}

func TestDeleteReturnsErrNotFoundForMissingKey(t *testing.T) {
	s := credential.NewKeyringStore()
	err := s.Delete("nonexistent-service-del", "nobody")
	if !errors.Is(err, credential.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestKeyringIsolatesByServiceAndAccount(t *testing.T) {
	s := credential.NewKeyringStore()
	_ = s.Set("svc1", "alice", "a-secret")
	_ = s.Set("svc1", "bob", "b-secret")
	_ = s.Set("svc2", "alice", "other-secret")

	a, _ := s.Get("svc1", "alice")
	b, _ := s.Get("svc1", "bob")
	c, _ := s.Get("svc2", "alice")
	if a != "a-secret" || b != "b-secret" || c != "other-secret" {
		t.Fatalf("isolation broken: a=%q b=%q c=%q", a, b, c)
	}
}
