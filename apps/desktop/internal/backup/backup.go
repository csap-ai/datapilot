package backup

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type Info struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Size      int64  `json:"size"`
	CreatedAt string `json:"createdAt"`
}

type Service struct {
	dataDir string
	db      *sql.DB
}

func New(dataDir string, db *sql.DB) *Service {
	return &Service{dataDir: dataDir, db: db}
}

func (s *Service) backupDir() (string, error) {
	dir := filepath.Join(s.dataDir, "backups")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return dir, nil
}

func (s *Service) Create(ctx context.Context) (*Info, error) {
	dir, err := s.backupDir()
	if err != nil {
		return nil, err
	}
	src := filepath.Join(s.dataDir, "metadata.db")
	ts := time.Now().UTC().Format("20060102-150405")
	dst := filepath.Join(dir, fmt.Sprintf("datapilot-%s.db", ts))

	if _, err := s.db.ExecContext(ctx, "VACUUM INTO ?", dst); err != nil {
		if copyErr := copyFile(src, dst); copyErr != nil {
			return nil, fmt.Errorf("backup: %w (vacuum: %v)", copyErr, err)
		}
	}

	st, err := os.Stat(dst)
	if err != nil {
		return nil, err
	}
	return &Info{
		Path:      dst,
		Name:      st.Name(),
		Size:      st.Size(),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *Service) List() ([]*Info, error) {
	dir, err := s.backupDir()
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := []*Info{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".db") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, &Info{
			Path:      filepath.Join(dir, e.Name()),
			Name:      e.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt > out[j].CreatedAt })
	return out, nil
}

func (s *Service) Delete(path string) error {
	dir, err := s.backupDir()
	if err != nil {
		return err
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(abs, absDir+string(os.PathSeparator)) {
		return fmt.Errorf("path outside backup dir")
	}
	return os.Remove(abs)
}

type ArchiveResult struct {
	SQLDeleted    int64 `json:"sqlDeleted"`
	AIDeleted     int64 `json:"aiDeleted"`
	ExportDeleted int64 `json:"exportDeleted"`
}

func (s *Service) ArchiveAudit(ctx context.Context, beforeDays int) (*ArchiveResult, error) {
	if beforeDays <= 0 {
		return nil, fmt.Errorf("beforeDays must be > 0")
	}
	cutoff := time.Now().UTC().AddDate(0, 0, -beforeDays).Format(time.RFC3339)

	res := &ArchiveResult{}
	for _, t := range []struct {
		table string
		out   *int64
	}{
		{"sql_audit_events", &res.SQLDeleted},
		{"ai_audit_events", &res.AIDeleted},
		{"export_audit_events", &res.ExportDeleted},
	} {
		r, err := s.db.ExecContext(ctx, fmt.Sprintf("DELETE FROM %s WHERE created_at < ?", t.table), cutoff)
		if err != nil {
			return nil, fmt.Errorf("archive %s: %w", t.table, err)
		}
		n, _ := r.RowsAffected()
		*t.out = n
	}
	return res, nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}
