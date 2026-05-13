package main

import (
	"strings"
	"testing"
)

func TestAssessSQLSafeSelectIsNone(t *testing.T) {
	cases := []string{
		"SELECT 1",
		"SELECT * FROM users WHERE id = 1",
		"INSERT INTO logs (msg) VALUES ('x')",
		"SELECT count(*) FROM orders",
	}
	for _, sql := range cases {
		t.Run(sql, func(t *testing.T) {
			got := assessSQL(sql)
			if got.Level != RiskNone {
				t.Fatalf("expected RiskNone, got %s for %q (msg=%s)", got.Level, sql, got.Message)
			}
		})
	}
}

func TestAssessSQLDestructiveIsDanger(t *testing.T) {
	cases := []string{
		"DROP TABLE users",
		"drop table users",
		"  DROP TABLE users  ",
		"DROP DATABASE foo",
		"DROP SCHEMA bar",
		"DROP VIEW v1",
		"TRUNCATE TABLE users",
		"TRUNCATE users",
	}
	for _, sql := range cases {
		t.Run(sql, func(t *testing.T) {
			got := assessSQL(sql)
			if got.Level != RiskDanger {
				t.Fatalf("expected RiskDanger, got %s for %q", got.Level, sql)
			}
			if got.Message == "" {
				t.Fatalf("expected non-empty Message")
			}
		})
	}
}

func TestAssessSQLDeleteWithoutWhereIsDanger(t *testing.T) {
	got := assessSQL("DELETE FROM users")
	if got.Level != RiskDanger {
		t.Fatalf("expected RiskDanger, got %s (msg=%s)", got.Level, got.Message)
	}
	if !strings.Contains(got.Message, "DELETE") {
		t.Fatalf("expected message to mention DELETE, got %q", got.Message)
	}
}

func TestAssessSQLUpdateWithoutWhereIsDanger(t *testing.T) {
	got := assessSQL("UPDATE users SET active = 0")
	if got.Level != RiskDanger {
		t.Fatalf("expected RiskDanger, got %s (msg=%s)", got.Level, got.Message)
	}
	if !strings.Contains(got.Message, "UPDATE") {
		t.Fatalf("expected message to mention UPDATE, got %q", got.Message)
	}
}

func TestAssessSQLDeleteWithWhereIsNone(t *testing.T) {
	got := assessSQL("DELETE FROM users WHERE id = 1")
	if got.Level != RiskNone {
		t.Fatalf("expected RiskNone with WHERE, got %s (msg=%s)", got.Level, got.Message)
	}
}

func TestAssessSQLUpdateWithWhereIsNone(t *testing.T) {
	got := assessSQL("UPDATE users SET active = 0 WHERE id = 1")
	if got.Level != RiskNone {
		t.Fatalf("expected RiskNone with WHERE, got %s (msg=%s)", got.Level, got.Message)
	}
}

func TestAssessSQLDDLIsWarning(t *testing.T) {
	cases := []string{
		"ALTER TABLE users ADD COLUMN x INT",
		"alter table users add column x int",
		"ALTER DATABASE foo SET ENCODING TO 'UTF8'",
		"RENAME TABLE old TO new",
	}
	for _, sql := range cases {
		t.Run(sql, func(t *testing.T) {
			got := assessSQL(sql)
			if got.Level != RiskWarning {
				t.Fatalf("expected RiskWarning, got %s for %q (msg=%s)", got.Level, sql, got.Message)
			}
		})
	}
}

func TestAssessSQLDangerWinsOverWarning(t *testing.T) {
	got := assessSQL("DROP TABLE x; ALTER TABLE y ADD COLUMN z INT")
	if got.Level != RiskDanger {
		t.Fatalf("danger should win over warning, got %s", got.Level)
	}
}

func TestAssessSQLLeadingTrailingWhitespaceAndCase(t *testing.T) {
	got := assessSQL("\n\t  drop table foo  \n")
	if got.Level != RiskDanger {
		t.Fatalf("expected RiskDanger despite leading/trailing whitespace + lowercase, got %s", got.Level)
	}
}

// Documents a known limitation: the current matcher uses Contains() against
// a fixed pattern with single spaces, so multi-space variants slip through.
// If this ever fails because the matcher was tightened, update the danger
// pattern list to handle whitespace normalization.
func TestAssessSQLMultipleSpacesBetweenKeywordsBypass(t *testing.T) {
	got := assessSQL("DROP  TABLE users")
	if got.Level == RiskDanger {
		t.Fatalf("matcher appears to have been tightened — update production callers and remove this regression-marker test")
	}
}

func TestRiskSeverityOrdering(t *testing.T) {
	if riskSeverity(RiskDanger) <= riskSeverity(RiskWarning) {
		t.Fatalf("Danger should be more severe than Warning")
	}
	if riskSeverity(RiskWarning) <= riskSeverity(RiskNone) {
		t.Fatalf("Warning should be more severe than None")
	}
}
