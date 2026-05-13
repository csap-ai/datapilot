package appdata

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDir(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	t.Setenv("XDG_DATA_HOME", filepath.Join(tmp, "xdg"))
	t.Setenv("LOCALAPPDATA", filepath.Join(tmp, "local"))

	dir, err := Dir()
	if err != nil {
		t.Fatalf("Dir() error: %v", err)
	}
	if dir == "" {
		t.Fatal("Dir() returned empty string")
	}

	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("Dir() did not create directory: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("Dir() path is not a directory")
	}
}
