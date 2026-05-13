package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/csap-ai/datapilot/apps/desktop/internal/aiaudit"
	"github.com/csap-ai/datapilot/apps/desktop/internal/aiprovider"
	"github.com/csap-ai/datapilot/apps/desktop/internal/appdata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/connpolicy"
	"github.com/csap-ai/datapilot/apps/desktop/internal/credential"
	"github.com/csap-ai/datapilot/apps/desktop/internal/backup"
	"github.com/csap-ai/datapilot/apps/desktop/internal/dashboard"
	"github.com/csap-ai/datapilot/apps/desktop/internal/datasource"
	"github.com/csap-ai/datapilot/apps/desktop/internal/driver"
	mysqldrv "github.com/csap-ai/datapilot/apps/desktop/internal/driver/mysql"
	pgdrv "github.com/csap-ai/datapilot/apps/desktop/internal/driver/postgres"
	sqlitedrv "github.com/csap-ai/datapilot/apps/desktop/internal/driver/sqlite"
	"github.com/csap-ai/datapilot/apps/desktop/internal/metadata"
	"github.com/csap-ai/datapilot/apps/desktop/internal/preferences"
	"github.com/csap-ai/datapilot/apps/desktop/internal/queryhistory"
	"github.com/csap-ai/datapilot/apps/desktop/internal/savedquery"
	"github.com/csap-ai/datapilot/apps/desktop/internal/sqlaudit"
	"github.com/csap-ai/datapilot/apps/desktop/internal/sqlpolicy"
)

type App struct {
	ctx     context.Context
	meta    *metadata.Store
	ds      *datasource.SQLiteStore
	cred    credential.Store
	pref    *preferences.Service
	qh      *queryhistory.Store
	sq      *savedquery.Store
	aia     *aiaudit.Store
	sa      *sqlaudit.Store
	cp      *connpolicy.Store
	sp      *sqlpolicy.Store
	dash    *dashboard.Store
	bk      *backup.Service
	dataDir string
	connsMu sync.RWMutex
	conns   map[string]driver.Conn
	execsMu sync.Mutex
	execs   map[string]context.CancelFunc // connectionID -> cancel of in-flight query
	drivers         map[datasource.Type]driver.Driver
	disabledDrivers map[datasource.Type]bool
}

func NewApp() *App {
	return &App{
		conns: make(map[string]driver.Conn),
		execs: make(map[string]context.CancelFunc),
		drivers: map[datasource.Type]driver.Driver{
			datasource.TypeSQLite:   sqlitedrv.New(),
			datasource.TypePostgres: pgdrv.New(),
			datasource.TypeMySQL:    mysqldrv.New(),
		},
		disabledDrivers: make(map[datasource.Type]bool),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dir, err := appdata.Dir()
	if err != nil {
		fmt.Println("startup: appdata:", err)
		return
	}

	meta, err := metadata.Open(dir)
	if err != nil {
		fmt.Println("startup: metadata:", err)
		return
	}

	a.meta = meta
	a.ds = datasource.NewSQLiteStore(meta.DB)
	a.pref = preferences.New(meta.DB)
	a.qh = queryhistory.NewStore(meta.DB)
	a.sq = savedquery.NewStore(meta.DB)
	a.aia = aiaudit.NewStore(meta.DB)
	a.sa = sqlaudit.NewStore(meta.DB)
	a.cp = connpolicy.NewStore(meta.DB)
	a.sp = sqlpolicy.NewStore(meta.DB)
	a.dash = dashboard.NewStore(meta.DB)
	a.bk = backup.New(dir, meta.DB)
	a.dataDir = dir
	a.cred = credential.NewKeyringStore()
}

// ---- Health ----

type HealthStatus struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Runtime   string `json:"runtime"`
	Timestamp string `json:"timestamp"`
}

func (a *App) Health() HealthStatus {
	return HealthStatus{
		Status:    "ok",
		Service:   "datapilot-desktop",
		Runtime:   "wails",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// ---- Connection management ----

type ConnectionParams struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	FilePath string `json:"filePath"`
	ReadOnly bool   `json:"readOnly"`
}

func (a *App) ListConnections() ([]*datasource.DataSource, error) {
	if a.ds == nil {
		return []*datasource.DataSource{}, nil
	}
	return a.ds.List(a.ctx)
}

func (a *App) CreateConnection(p ConnectionParams) (*datasource.DataSource, error) {
	if a.ds == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	ds := paramsToDataSource(p)
	if err := a.ds.Create(a.ctx, ds); err != nil {
		return nil, err
	}
	if p.Password != "" {
		_ = a.cred.Set("datapilot", ds.ID, p.Password)
	}
	return ds, nil
}

func (a *App) UpdateConnection(p ConnectionParams) (*datasource.DataSource, error) {
	if a.ds == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	ds := paramsToDataSource(p)
	if err := a.ds.Update(a.ctx, ds); err != nil {
		return nil, err
	}
	if p.Password != "" {
		_ = a.cred.Set("datapilot", ds.ID, p.Password)
	}
	a.closeConn(ds.ID)
	return ds, nil
}

func (a *App) DeleteConnection(id string) error {
	if a.ds == nil {
		return fmt.Errorf("store not initialized")
	}
	a.closeConn(id)
	_ = a.cred.Delete("datapilot", id)
	return a.ds.Delete(a.ctx, id)
}

func (a *App) TestConnection(p ConnectionParams) error {
	d, ok := a.drivers[datasource.Type(p.Type)]
	if !ok {
		return fmt.Errorf("unsupported database type: %s", p.Type)
	}
	ds := paramsToDataSource(p)
	conn, err := d.Open(a.ctx, driver.ConnParams{
		DSN:      buildDSN(ds, p.Password),
		ReadOnly: ds.ReadOnly,
	})
	if err != nil {
		return err
	}
	return conn.Close()
}

// ---- SQL execution ----

type QueryResult struct {
	Columns      []string   `json:"columns"`
	Rows         [][]string `json:"rows"`
	RowsAffected int64      `json:"rowsAffected"`
	DurationMs   int64      `json:"durationMs"`
}

func (a *App) ExecuteSQL(id, sqlStr string) (*QueryResult, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}

	// Enforce connection policy.
	if a.cp != nil {
		if policy, err := a.cp.Get(a.ctx, id); err == nil {
			if isDDL(sqlStr) && !policy.AllowDDL {
				return nil, fmt.Errorf("此连接已禁止执行 DDL 操作")
			}
			if isDML(sqlStr) && !policy.AllowDML {
				return nil, fmt.Errorf("此连接已禁止执行 DML 操作")
			}
		}
	}

	// Replace any existing in-flight query for this connection.
	ctx, cancel := context.WithCancel(a.ctx)
	a.execsMu.Lock()
	if old, ok := a.execs[id]; ok {
		old()
	}
	a.execs[id] = cancel
	a.execsMu.Unlock()

	defer func() {
		a.execsMu.Lock()
		delete(a.execs, id)
		a.execsMu.Unlock()
		cancel()
	}()

	start := time.Now()
	var result *QueryResult
	var execErr error

	if isSelectLike(sqlStr) {
		rows, err := conn.Query(ctx, sqlStr)
		if err != nil {
			execErr = err
		} else {
			defer rows.Close()
			result, execErr = collectRows(rows, time.Since(start).Milliseconds())
		}
	} else {
		res, err := conn.Exec(ctx, sqlStr)
		if err != nil {
			execErr = err
		} else {
			result = &QueryResult{
				Columns:      []string{},
				Rows:         [][]string{},
				RowsAffected: res.RowsAffected,
				DurationMs:   time.Since(start).Milliseconds(),
			}
		}
	}

	elapsed := time.Since(start).Milliseconds()

	// Persist query history.
	if a.qh != nil {
		rec := &queryhistory.Record{
			ConnectionID: id,
			SQL:          sqlStr,
			DurationMs:   elapsed,
		}
		if result != nil {
			rec.RowCount = int64(len(result.Rows))
		}
		if execErr != nil && !errors.Is(execErr, context.Canceled) {
			rec.Error = execErr.Error()
		}
		_ = a.qh.Save(a.ctx, rec)
	}

	// Persist SQL audit event.
	if a.sa != nil {
		connName := ""
		if a.ds != nil {
			if ds, err := a.ds.Get(a.ctx, id); err == nil {
				connName = ds.Name
			}
		}
		ev := &sqlaudit.Event{
			ConnectionID:   id,
			ConnectionName: connName,
			SQL:            sqlStr,
			DurationMs:     elapsed,
			RiskLevel:      string(assessSQL(sqlStr).Level),
		}
		if result != nil {
			ev.RowsAffected = result.RowsAffected
			if ev.RowsAffected == 0 {
				ev.RowsAffected = int64(len(result.Rows))
			}
		}
		if execErr != nil && !errors.Is(execErr, context.Canceled) {
			ev.Error = execErr.Error()
		}
		_ = a.sa.Log(a.ctx, ev)
	}

	if execErr != nil {
		if errors.Is(execErr, context.Canceled) {
			return nil, fmt.Errorf("query cancelled")
		}
		return nil, execErr
	}
	return result, nil
}

func (a *App) CancelExecution(id string) {
	a.execsMu.Lock()
	if cancel, ok := a.execs[id]; ok {
		cancel()
		delete(a.execs, id)
	}
	a.execsMu.Unlock()
}

// ---- Query history ----

func (a *App) GetQueryHistory(connectionID string, limit int) ([]*queryhistory.Record, error) {
	if a.qh == nil {
		return []*queryhistory.Record{}, nil
	}
	return a.qh.List(a.ctx, connectionID, limit)
}

// ---- Saved queries ----

func (a *App) SaveQuery(connectionID, name, sql string) (*savedquery.Record, error) {
	if a.sq == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	r := &savedquery.Record{ConnectionID: connectionID, Name: name, SQL: sql}
	if err := a.sq.Save(a.ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

func (a *App) ListSavedQueries(connectionID string) ([]*savedquery.Record, error) {
	if a.sq == nil {
		return []*savedquery.Record{}, nil
	}
	return a.sq.List(a.ctx, connectionID)
}

func (a *App) RenameSavedQuery(id, name string) error {
	if a.sq == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.sq.Rename(a.ctx, id, name)
}

func (a *App) DeleteSavedQuery(id string) error {
	if a.sq == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.sq.Delete(a.ctx, id)
}

// ---- SQL risk detection ----

type RiskLevel string

const (
	RiskNone    RiskLevel = "none"
	RiskWarning RiskLevel = "warning"
	RiskDanger  RiskLevel = "danger"
)

type RiskAssessment struct {
	Level   RiskLevel `json:"level"`
	Message string    `json:"message"`
}

func (a *App) AssessSQL(sql string) RiskAssessment {
	result := assessSQL(sql)
	if result.Level == RiskDanger {
		return result
	}
	// Also check user-defined SQL policies.
	if a.sp != nil {
		policies, _ := a.sp.List(a.ctx)
		upper := strings.ToUpper(strings.TrimSpace(sql))
		for _, p := range policies {
			if !p.Enabled {
				continue
			}
			if strings.Contains(upper, strings.ToUpper(p.Pattern)) {
				candidate := RiskAssessment{Level: RiskLevel(p.Level), Message: p.Message}
				if riskSeverity(candidate.Level) > riskSeverity(result.Level) {
					result = candidate
				}
				if result.Level == RiskDanger {
					break
				}
			}
		}
	}
	return result
}

func assessSQL(sql string) RiskAssessment {
	upper := strings.TrimSpace(strings.ToUpper(sql))

	dangerPatterns := []string{
		"DROP TABLE", "DROP DATABASE", "DROP SCHEMA", "DROP VIEW",
		"TRUNCATE",
	}
	for _, p := range dangerPatterns {
		if strings.Contains(upper, p) {
			return RiskAssessment{Level: RiskDanger, Message: "检测到破坏性操作，执行后数据将无法恢复"}
		}
	}

	// DELETE / UPDATE without WHERE
	isDelete := strings.HasPrefix(upper, "DELETE")
	isUpdate := strings.HasPrefix(upper, "UPDATE")
	if (isDelete || isUpdate) && !strings.Contains(upper, "WHERE") {
		op := "DELETE"
		if isUpdate {
			op = "UPDATE"
		}
		return RiskAssessment{
			Level:   RiskDanger,
			Message: fmt.Sprintf("%s 语句未包含 WHERE 条件，将影响全表所有行", op),
		}
	}

	alterPatterns := []string{"ALTER TABLE", "ALTER DATABASE", "RENAME TABLE"}
	for _, p := range alterPatterns {
		if strings.Contains(upper, p) {
			return RiskAssessment{Level: RiskWarning, Message: "DDL 变更将修改表结构，请确认操作"}
		}
	}

	return RiskAssessment{Level: RiskNone}
}

// ---- Object tree & metadata ----

func (a *App) GetObjectTree(id string) ([]*driver.TreeNode, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return nil, fmt.Errorf("driver does not support object tree")
	}
	return intr.ObjectTree(a.ctx)
}

// ---- Explain plan ----

type ExplainNode struct {
	Op       string        `json:"op"`
	Details  string        `json:"details"`
	Children []ExplainNode `json:"children,omitempty"`
}

type ExplainResult struct {
	Nodes []ExplainNode `json:"nodes"`
	Raw   string        `json:"raw"`
}

func (a *App) ExplainSQL(id, sqlStr string) (*ExplainResult, error) {
	ds, err := a.ds.Get(a.ctx, id)
	if err != nil {
		return nil, err
	}
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}
	switch ds.Type {
	case datasource.TypeSQLite:
		return explainSQLite(a.ctx, conn, sqlStr)
	case datasource.TypePostgres:
		return explainPostgres(a.ctx, conn, sqlStr)
	case datasource.TypeMySQL:
		return explainMySQL(a.ctx, conn, sqlStr)
	}
	return nil, fmt.Errorf("explain: unsupported database type %q", ds.Type)
}

func explainSQLite(ctx context.Context, conn driver.Conn, sqlStr string) (*ExplainResult, error) {
	rows, err := conn.Query(ctx, "EXPLAIN QUERY PLAN "+sqlStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type row struct {
		id, parent int64
		detail     string
	}
	var all []row
	var raw strings.Builder

	for rows.Next() {
		dest := make([]any, 4)
		ptrs := make([]any, 4)
		for i := range dest {
			ptrs[i] = &dest[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		var r row
		r.id, _ = toInt64(dest[0])
		r.parent, _ = toInt64(dest[1])
		r.detail = fmt.Sprintf("%v", dest[3])
		all = append(all, r)
		fmt.Fprintf(&raw, "%d %d %s\n", r.id, r.parent, r.detail)
	}

	childrenOf := make(map[int64][]int64)
	detailOf := make(map[int64]string)
	for _, r := range all {
		childrenOf[r.parent] = append(childrenOf[r.parent], r.id)
		detailOf[r.id] = r.detail
	}

	var build func(id int64) ExplainNode
	build = func(id int64) ExplainNode {
		n := ExplainNode{Op: "Plan", Details: detailOf[id]}
		for _, cid := range childrenOf[id] {
			n.Children = append(n.Children, build(cid))
		}
		return n
	}

	var roots []ExplainNode
	for _, rid := range childrenOf[0] {
		roots = append(roots, build(rid))
	}
	if roots == nil {
		roots = []ExplainNode{}
	}
	return &ExplainResult{Nodes: roots, Raw: raw.String()}, nil
}

func explainPostgres(ctx context.Context, conn driver.Conn, sqlStr string) (*ExplainResult, error) {
	rows, err := conn.Query(ctx, "EXPLAIN (FORMAT JSON) "+sqlStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var raw strings.Builder
	var plans []map[string]any
	for rows.Next() {
		dest := make([]any, 1)
		ptrs := []any{&dest[0]}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		s := fmt.Sprintf("%v", dest[0])
		raw.WriteString(s)
		var arr []map[string]any
		if err := json.Unmarshal([]byte(s), &arr); err == nil {
			plans = append(plans, arr...)
		}
	}

	var nodes []ExplainNode
	for _, p := range plans {
		if plan, ok := p["Plan"].(map[string]any); ok {
			nodes = append(nodes, pgPlanToNode(plan))
		}
	}
	if nodes == nil {
		nodes = []ExplainNode{}
	}
	return &ExplainResult{Nodes: nodes, Raw: raw.String()}, nil
}

func pgPlanToNode(p map[string]any) ExplainNode {
	op, _ := p["Node Type"].(string)
	var parts []string
	if rel, ok := p["Relation Name"].(string); ok && rel != "" {
		parts = append(parts, "on "+rel)
	}
	if cost, ok := p["Total Cost"].(float64); ok {
		parts = append(parts, fmt.Sprintf("cost=%.2f", cost))
	}
	if r, ok := p["Plan Rows"].(float64); ok {
		parts = append(parts, fmt.Sprintf("rows=%.0f", r))
	}
	n := ExplainNode{Op: op, Details: strings.Join(parts, " ")}
	if subs, ok := p["Plans"].([]any); ok {
		for _, s := range subs {
			if sm, ok := s.(map[string]any); ok {
				n.Children = append(n.Children, pgPlanToNode(sm))
			}
		}
	}
	return n
}

func explainMySQL(ctx context.Context, conn driver.Conn, sqlStr string) (*ExplainResult, error) {
	rows, err := conn.Query(ctx, "EXPLAIN FORMAT=JSON "+sqlStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var raw strings.Builder
	for rows.Next() {
		dest := make([]any, 1)
		ptrs := []any{&dest[0]}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		raw.WriteString(fmt.Sprintf("%v", dest[0]))
	}

	var parsed map[string]any
	if err := json.Unmarshal([]byte(raw.String()), &parsed); err != nil {
		return &ExplainResult{Nodes: []ExplainNode{}, Raw: raw.String()}, nil
	}
	var nodes []ExplainNode
	if qb, ok := parsed["query_block"].(map[string]any); ok {
		nodes = append(nodes, mysqlBlockToNode(qb))
	}
	if nodes == nil {
		nodes = []ExplainNode{}
	}
	return &ExplainResult{Nodes: nodes, Raw: raw.String()}, nil
}

func mysqlBlockToNode(block map[string]any) ExplainNode {
	op := "query_block"
	var parts []string
	if id, ok := block["select_id"].(float64); ok {
		parts = append(parts, fmt.Sprintf("select_id=%.0f", id))
	}
	if ci, ok := block["cost_info"].(map[string]any); ok {
		if c, ok := ci["query_cost"].(string); ok {
			parts = append(parts, "cost="+c)
		}
	}
	n := ExplainNode{Op: op, Details: strings.Join(parts, " ")}
	if tbl, ok := block["table"].(map[string]any); ok {
		n.Children = append(n.Children, mysqlTableToNode(tbl))
	}
	if nested, ok := block["nested_loop"].([]any); ok {
		for _, item := range nested {
			if m, ok := item.(map[string]any); ok {
				if tbl, ok := m["table"].(map[string]any); ok {
					n.Children = append(n.Children, mysqlTableToNode(tbl))
				}
			}
		}
	}
	return n
}

func mysqlTableToNode(tbl map[string]any) ExplainNode {
	op := "table"
	if name, ok := tbl["table_name"].(string); ok {
		op = "scan " + name
	}
	var parts []string
	if at, ok := tbl["access_type"].(string); ok {
		parts = append(parts, "access="+at)
	}
	if key, ok := tbl["key"].(string); ok {
		parts = append(parts, "key="+key)
	}
	if r, ok := tbl["rows_examined_per_scan"].(float64); ok {
		parts = append(parts, fmt.Sprintf("rows=%.0f", r))
	}
	return ExplainNode{Op: op, Details: strings.Join(parts, " ")}
}

func toInt64(v any) (int64, bool) {
	switch n := v.(type) {
	case int64:
		return n, true
	case int:
		return int64(n), true
	case float64:
		return int64(n), true
	case []byte:
		if i, err := strconv.ParseInt(string(n), 10, 64); err == nil {
			return i, true
		}
	case string:
		if i, err := strconv.ParseInt(n, 10, 64); err == nil {
			return i, true
		}
	}
	return 0, false
}

// ---- Schema diff (structure compare) ----

type TableRef struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
}

type ColumnDiff struct {
	Name   string              `json:"name"`
	Kind   string              `json:"kind"` // "added" | "removed" | "changed"
	Before *driver.ColumnInfo  `json:"before,omitempty"`
	After  *driver.ColumnInfo  `json:"after,omitempty"`
}

type IndexDiff struct {
	Name   string             `json:"name"`
	Kind   string             `json:"kind"`
	Before *driver.IndexInfo  `json:"before,omitempty"`
	After  *driver.IndexInfo  `json:"after,omitempty"`
}

type TableDiff struct {
	Schema      string       `json:"schema"`
	Name        string       `json:"name"`
	ColumnDiffs []ColumnDiff `json:"columnDiffs"`
	IndexDiffs  []IndexDiff  `json:"indexDiffs"`
}

type SchemaDiff struct {
	SourceID      string      `json:"sourceId"`
	TargetID      string      `json:"targetId"`
	TablesOnlyInA []TableRef  `json:"tablesOnlyInA"`
	TablesOnlyInB []TableRef  `json:"tablesOnlyInB"`
	TablesChanged []TableDiff `json:"tablesChanged"`
}

func (a *App) CompareSchemas(srcID, dstID string) (*SchemaDiff, error) {
	srcGraph, err := a.GetSchemaGraph(srcID)
	if err != nil {
		return nil, fmt.Errorf("source: %w", err)
	}
	dstGraph, err := a.GetSchemaGraph(dstID)
	if err != nil {
		return nil, fmt.Errorf("target: %w", err)
	}

	srcTables := indexGraphTables(srcGraph)
	dstTables := indexGraphTables(dstGraph)

	diff := &SchemaDiff{
		SourceID:      srcID,
		TargetID:      dstID,
		TablesOnlyInA: []TableRef{},
		TablesOnlyInB: []TableRef{},
		TablesChanged: []TableDiff{},
	}

	for key, srcT := range srcTables {
		dstT, ok := dstTables[key]
		if !ok {
			diff.TablesOnlyInA = append(diff.TablesOnlyInA, TableRef{Schema: srcT.Schema, Name: srcT.Name})
			continue
		}
		td := compareTables(srcT, dstT, srcID, dstID, a)
		if len(td.ColumnDiffs) > 0 || len(td.IndexDiffs) > 0 {
			diff.TablesChanged = append(diff.TablesChanged, td)
		}
	}
	for key, dstT := range dstTables {
		if _, ok := srcTables[key]; !ok {
			diff.TablesOnlyInB = append(diff.TablesOnlyInB, TableRef{Schema: dstT.Schema, Name: dstT.Name})
		}
	}

	return diff, nil
}

func indexGraphTables(g *SchemaGraph) map[string]GraphTable {
	m := make(map[string]GraphTable, len(g.Tables))
	for _, t := range g.Tables {
		m[t.Schema+"."+t.Name] = t
	}
	return m
}

func compareTables(a, b GraphTable, srcID, dstID string, app *App) TableDiff {
	td := TableDiff{Schema: a.Schema, Name: a.Name}

	aCols := indexColumns(a.Columns)
	bCols := indexColumns(b.Columns)

	for name, ac := range aCols {
		ac := ac
		if bc, ok := bCols[name]; ok {
			bc := bc
			if !columnEqual(ac, bc) {
				td.ColumnDiffs = append(td.ColumnDiffs, ColumnDiff{Name: name, Kind: "changed", Before: &ac, After: &bc})
			}
		} else {
			td.ColumnDiffs = append(td.ColumnDiffs, ColumnDiff{Name: name, Kind: "removed", Before: &ac})
		}
	}
	for name, bc := range bCols {
		bc := bc
		if _, ok := aCols[name]; !ok {
			td.ColumnDiffs = append(td.ColumnDiffs, ColumnDiff{Name: name, Kind: "added", After: &bc})
		}
	}

	srcIdx, _ := app.GetTableIndexes(srcID, a.Schema, a.Name)
	dstIdx, _ := app.GetTableIndexes(dstID, b.Schema, b.Name)
	aIdx := indexIndexes(srcIdx)
	bIdx := indexIndexes(dstIdx)

	for name, ai := range aIdx {
		ai := ai
		if bi, ok := bIdx[name]; ok {
			bi := bi
			if !indexEqual(ai, bi) {
				td.IndexDiffs = append(td.IndexDiffs, IndexDiff{Name: name, Kind: "changed", Before: &ai, After: &bi})
			}
		} else {
			td.IndexDiffs = append(td.IndexDiffs, IndexDiff{Name: name, Kind: "removed", Before: &ai})
		}
	}
	for name, bi := range bIdx {
		bi := bi
		if _, ok := aIdx[name]; !ok {
			td.IndexDiffs = append(td.IndexDiffs, IndexDiff{Name: name, Kind: "added", After: &bi})
		}
	}

	return td
}

func indexColumns(cols []driver.ColumnInfo) map[string]driver.ColumnInfo {
	m := make(map[string]driver.ColumnInfo, len(cols))
	for _, c := range cols {
		m[c.Name] = c
	}
	return m
}

func indexIndexes(idx []driver.IndexInfo) map[string]driver.IndexInfo {
	m := make(map[string]driver.IndexInfo, len(idx))
	for _, i := range idx {
		m[i.Name] = i
	}
	return m
}

func columnEqual(a, b driver.ColumnInfo) bool {
	return strings.EqualFold(a.Type, b.Type) &&
		a.Nullable == b.Nullable &&
		a.PrimaryKey == b.PrimaryKey &&
		a.DefaultValue == b.DefaultValue
}

func indexEqual(a, b driver.IndexInfo) bool {
	if a.Unique != b.Unique || len(a.Columns) != len(b.Columns) {
		return false
	}
	for i := range a.Columns {
		if a.Columns[i] != b.Columns[i] {
			return false
		}
	}
	return true
}

// ---- Data compare ----

type RowDiff struct {
	Kind   string            `json:"kind"`
	Key    string            `json:"key"`
	Before map[string]string `json:"before,omitempty"`
	After  map[string]string `json:"after,omitempty"`
}

type DataDiff struct {
	SourceID  string    `json:"sourceId"`
	TargetID  string    `json:"targetId"`
	Schema    string    `json:"schema"`
	Table     string    `json:"table"`
	KeyColumn string    `json:"keyColumn"`
	Columns   []string  `json:"columns"`
	OnlyInA   []RowDiff `json:"onlyInA"`
	OnlyInB   []RowDiff `json:"onlyInB"`
	Changed   []RowDiff `json:"changed"`
	Truncated bool      `json:"truncated"`
}

func (a *App) CompareTableData(srcID, dstID, schema, table, keyCol string, limit int) (*DataDiff, error) {
	if keyCol == "" {
		return nil, errors.New("key column is required")
	}
	if limit <= 0 || limit > 1000 {
		limit = 200
	}

	srcRes, err := a.BrowseTable(srcID, schema, table, limit)
	if err != nil {
		return nil, fmt.Errorf("source: %w", err)
	}
	dstRes, err := a.BrowseTable(dstID, schema, table, limit)
	if err != nil {
		return nil, fmt.Errorf("target: %w", err)
	}

	if !sameColumns(srcRes.Columns, dstRes.Columns) {
		return nil, fmt.Errorf("columns mismatch: %v vs %v", srcRes.Columns, dstRes.Columns)
	}

	keyIdx := -1
	for i, c := range srcRes.Columns {
		if c == keyCol {
			keyIdx = i
			break
		}
	}
	if keyIdx == -1 {
		return nil, fmt.Errorf("key column %q not found", keyCol)
	}

	srcRows := indexRows(srcRes.Columns, srcRes.Rows, keyIdx)
	dstRows := indexRows(dstRes.Columns, dstRes.Rows, keyIdx)

	diff := &DataDiff{
		SourceID:  srcID,
		TargetID:  dstID,
		Schema:    schema,
		Table:     table,
		KeyColumn: keyCol,
		Columns:   srcRes.Columns,
		OnlyInA:   []RowDiff{},
		OnlyInB:   []RowDiff{},
		Changed:   []RowDiff{},
		Truncated: len(srcRes.Rows) >= limit || len(dstRes.Rows) >= limit,
	}

	for key, sRow := range srcRows {
		if dRow, ok := dstRows[key]; ok {
			if !rowEqual(sRow, dRow) {
				diff.Changed = append(diff.Changed, RowDiff{Kind: "changed", Key: key, Before: sRow, After: dRow})
			}
		} else {
			diff.OnlyInA = append(diff.OnlyInA, RowDiff{Kind: "removed", Key: key, Before: sRow})
		}
	}
	for key, dRow := range dstRows {
		if _, ok := srcRows[key]; !ok {
			diff.OnlyInB = append(diff.OnlyInB, RowDiff{Kind: "added", Key: key, After: dRow})
		}
	}

	return diff, nil
}

func sameColumns(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func indexRows(cols []string, rows [][]string, keyIdx int) map[string]map[string]string {
	m := make(map[string]map[string]string, len(rows))
	for _, row := range rows {
		if keyIdx >= len(row) {
			continue
		}
		key := row[keyIdx]
		obj := make(map[string]string, len(cols))
		for i, c := range cols {
			if i < len(row) {
				obj[c] = row[i]
			}
		}
		m[key] = obj
	}
	return m
}

func rowEqual(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if b[k] != v {
			return false
		}
	}
	return true
}

// ---- Schema graph (ER diagram) ----

type GraphTable struct {
	Schema  string              `json:"schema"`
	Name    string              `json:"name"`
	Columns []driver.ColumnInfo `json:"columns"`
}

type GraphFKEnd struct {
	Schema  string   `json:"schema"`
	Table   string   `json:"table"`
	Columns []string `json:"columns"`
}

type GraphFK struct {
	Name string     `json:"name"`
	From GraphFKEnd `json:"from"`
	To   GraphFKEnd `json:"to"`
}

type SchemaGraph struct {
	Tables      []GraphTable `json:"tables"`
	ForeignKeys []GraphFK    `json:"foreignKeys"`
}

func (a *App) GetSchemaGraph(id string) (*SchemaGraph, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return nil, fmt.Errorf("driver does not support introspection")
	}
	tree, err := intr.ObjectTree(a.ctx)
	if err != nil {
		return nil, err
	}

	graph := &SchemaGraph{Tables: []GraphTable{}, ForeignKeys: []GraphFK{}}
	for _, root := range tree {
		collectGraphTables(a.ctx, intr, root, "", graph)
	}
	return graph, nil
}

func collectGraphTables(ctx context.Context, intr driver.Introspector, n *driver.TreeNode, schemaName string, g *SchemaGraph) {
	switch n.Kind {
	case driver.NodeDatabase:
		next := ""
		if n.Name != "main" {
			next = n.Name
		}
		for _, c := range n.Children {
			collectGraphTables(ctx, intr, c, next, g)
		}
	case driver.NodeSchema:
		for _, c := range n.Children {
			collectGraphTables(ctx, intr, c, n.Name, g)
		}
	case driver.NodeTable:
		cols, err := intr.TableColumns(ctx, schemaName, n.Name)
		if err != nil {
			return
		}
		g.Tables = append(g.Tables, GraphTable{Schema: schemaName, Name: n.Name, Columns: cols})

		fks, err := intr.TableForeignKeys(ctx, schemaName, n.Name)
		if err == nil {
			for _, fk := range fks {
				g.ForeignKeys = append(g.ForeignKeys, GraphFK{
					Name: fk.Name,
					From: GraphFKEnd{Schema: schemaName, Table: n.Name, Columns: fk.Columns},
					To:   GraphFKEnd{Schema: fk.RefSchema, Table: fk.RefTable, Columns: fk.RefColumns},
				})
			}
		}
	}
}

func (a *App) GetTableColumns(id, schema, table string) ([]driver.ColumnInfo, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return nil, fmt.Errorf("driver does not support introspection")
	}
	return intr.TableColumns(a.ctx, schema, table)
}

func (a *App) GetTableIndexes(id, schema, table string) ([]driver.IndexInfo, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return nil, fmt.Errorf("driver does not support introspection")
	}
	return intr.TableIndexes(a.ctx, schema, table)
}

func (a *App) GenerateTableDDL(id, schema, table string) (string, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return "", err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return "", fmt.Errorf("driver does not support DDL generation")
	}
	return intr.GenerateDDL(a.ctx, schema, table)
}

// GenerateDataDictionary builds a Markdown document describing every table/view
// and its columns for the active connection.
func (a *App) GenerateDataDictionary(id string) (string, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return "", err
	}
	intr, ok := conn.(driver.Introspector)
	if !ok {
		return "", fmt.Errorf("driver does not support introspection")
	}
	tree, err := intr.ObjectTree(a.ctx)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	b.WriteString("# Data Dictionary\n\n")
	b.WriteString("_Generated at " + time.Now().UTC().Format(time.RFC3339) + "_\n\n")

	for _, root := range tree {
		writeDictNode(&b, intr, a.ctx, root, "")
	}
	return b.String(), nil
}

func writeDictNode(b *strings.Builder, intr driver.Introspector, ctx context.Context, n *driver.TreeNode, schemaName string) {
	switch n.Kind {
	case driver.NodeDatabase:
		fmt.Fprintf(b, "## Database: %s\n\n", n.Name)
		for _, c := range n.Children {
			writeDictNode(b, intr, ctx, c, "")
		}
	case driver.NodeSchema:
		fmt.Fprintf(b, "### Schema: %s\n\n", n.Name)
		for _, c := range n.Children {
			writeDictNode(b, intr, ctx, c, n.Name)
		}
	case driver.NodeTable, driver.NodeView:
		kind := "Table"
		if n.Kind == driver.NodeView {
			kind = "View"
		}
		fmt.Fprintf(b, "#### %s: %s\n\n", kind, n.Name)
		cols, err := intr.TableColumns(ctx, schemaName, n.Name)
		if err != nil || len(cols) == 0 {
			b.WriteString("_no columns_\n\n")
			return
		}
		b.WriteString("| Column | Type | Nullable | PK | Default |\n")
		b.WriteString("|---|---|---|---|---|\n")
		for _, col := range cols {
			fmt.Fprintf(b, "| %s | %s | %s | %s | %s |\n",
				col.Name, col.Type,
				yesNo(col.Nullable), yesNo(col.PrimaryKey),
				escapeMarkdown(col.DefaultValue),
			)
		}
		b.WriteString("\n")
	}
}

func yesNo(b bool) string {
	if b {
		return "✓"
	}
	return ""
}

func escapeMarkdown(s string) string {
	return strings.ReplaceAll(s, "|", `\|`)
}

// ---- Browse table ----

// BrowseTable runs `SELECT * FROM table LIMIT ?` and returns rows.
func (a *App) BrowseTable(id, schema, table string, limit int) (*QueryResult, error) {
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	ds, err := a.ds.Get(a.ctx, id)
	if err != nil {
		return nil, err
	}
	q := buildBrowseSQL(ds.Type, schema, table, limit)
	return a.ExecuteSQL(id, q)
}

func buildBrowseSQL(dbType datasource.Type, schema, table string, limit int) string {
	switch dbType {
	case datasource.TypePostgres:
		if schema == "" {
			schema = "public"
		}
		return fmt.Sprintf(`SELECT * FROM "%s"."%s" LIMIT %d`,
			strings.ReplaceAll(schema, `"`, `""`),
			strings.ReplaceAll(table, `"`, `""`), limit)
	case datasource.TypeMySQL:
		if schema != "" {
			return fmt.Sprintf("SELECT * FROM `%s`.`%s` LIMIT %d",
				strings.ReplaceAll(schema, "`", "``"),
				strings.ReplaceAll(table, "`", "``"), limit)
		}
		return fmt.Sprintf("SELECT * FROM `%s` LIMIT %d",
			strings.ReplaceAll(table, "`", "``"), limit)
	default: // SQLite
		return fmt.Sprintf(`SELECT * FROM "%s" LIMIT %d`,
			strings.ReplaceAll(table, `"`, `""`), limit)
	}
}

// ---- CSV import ----

type CSVImportResult struct {
	RowsImported int    `json:"rowsImported"`
	Error        string `json:"error,omitempty"`
}

func (a *App) ImportCSV(id, schema, table, csvText string, hasHeader bool) (*CSVImportResult, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return nil, err
	}

	// Policy enforcement: CSV import is DML.
	if a.cp != nil {
		if p, err := a.cp.Get(a.ctx, id); err == nil && !p.AllowDML {
			return nil, fmt.Errorf("此连接已禁止执行 DML 操作")
		}
	}

	ds, err := a.ds.Get(a.ctx, id)
	if err != nil {
		return nil, err
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	reader.FieldsPerRecord = -1

	var header []string
	if hasHeader {
		h, err := reader.Read()
		if err != nil {
			return nil, fmt.Errorf("read header: %w", err)
		}
		header = h
	}

	placeholder := makePlaceholder(ds.Type)
	qualifiedTable := qualifyTable(ds.Type, schema, table)

	var colsClause string
	if len(header) > 0 {
		quoted := make([]string, len(header))
		for i, h := range header {
			quoted[i] = quoteIdent(ds.Type, h)
		}
		colsClause = "(" + strings.Join(quoted, ", ") + ")"
	}

	count := 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return &CSVImportResult{RowsImported: count, Error: err.Error()}, nil
		}

		placeholders := make([]string, len(row))
		args := make([]any, len(row))
		for i, v := range row {
			placeholders[i] = placeholder(i + 1)
			args[i] = v
		}

		insertSQL := fmt.Sprintf("INSERT INTO %s %s VALUES (%s)",
			qualifiedTable, colsClause, strings.Join(placeholders, ", "))
		if _, execErr := conn.Exec(a.ctx, insertSQL, args...); execErr != nil {
			return &CSVImportResult{RowsImported: count, Error: execErr.Error()}, nil
		}
		count++
	}

	return &CSVImportResult{RowsImported: count}, nil
}

func makePlaceholder(t datasource.Type) func(n int) string {
	if t == datasource.TypePostgres {
		return func(n int) string { return "$" + strconv.Itoa(n) }
	}
	return func(_ int) string { return "?" }
}

func qualifyTable(t datasource.Type, schema, table string) string {
	switch t {
	case datasource.TypePostgres:
		if schema == "" {
			schema = "public"
		}
		return fmt.Sprintf(`"%s"."%s"`,
			strings.ReplaceAll(schema, `"`, `""`),
			strings.ReplaceAll(table, `"`, `""`))
	case datasource.TypeMySQL:
		if schema != "" {
			return fmt.Sprintf("`%s`.`%s`",
				strings.ReplaceAll(schema, "`", "``"),
				strings.ReplaceAll(table, "`", "``"))
		}
		return fmt.Sprintf("`%s`", strings.ReplaceAll(table, "`", "``"))
	default:
		return fmt.Sprintf(`"%s"`, strings.ReplaceAll(table, `"`, `""`))
	}
}

func quoteIdent(t datasource.Type, s string) string {
	if t == datasource.TypeMySQL {
		return "`" + strings.ReplaceAll(s, "`", "``") + "`"
	}
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}


// ---- helpers ----

func (a *App) getOrOpenConn(id string) (driver.Conn, error) {
	a.connsMu.RLock()
	conn, ok := a.conns[id]
	a.connsMu.RUnlock()
	if ok {
		return conn, nil
	}

	if a.ds == nil {
		return nil, fmt.Errorf("store not initialized")
	}

	ds, err := a.ds.Get(a.ctx, id)
	if err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	pw := ""
	if ds.Type != datasource.TypeSQLite {
		pw, err = a.cred.Get("datapilot", id)
		if err != nil && !errors.Is(err, credential.ErrNotFound) {
			return nil, err
		}
	}

	d, ok := a.drivers[ds.Type]
	if !ok {
		return nil, fmt.Errorf("no driver for type %q", ds.Type)
	}
	if a.disabledDrivers[ds.Type] {
		return nil, fmt.Errorf("driver %q is disabled", ds.Type)
	}

	conn, err = d.Open(a.ctx, driver.ConnParams{
		DSN:      buildDSN(ds, pw),
		ReadOnly: ds.ReadOnly,
	})
	if err != nil {
		return nil, err
	}

	a.connsMu.Lock()
	a.conns[id] = conn
	a.connsMu.Unlock()
	return conn, nil
}

func (a *App) closeConn(id string) {
	a.connsMu.Lock()
	if conn, ok := a.conns[id]; ok {
		_ = conn.Close()
		delete(a.conns, id)
	}
	a.connsMu.Unlock()
}

func paramsToDataSource(p ConnectionParams) *datasource.DataSource {
	return &datasource.DataSource{
		ID:       p.ID,
		Name:     p.Name,
		Type:     datasource.Type(p.Type),
		Host:     p.Host,
		Port:     p.Port,
		Database: p.Database,
		Username: p.Username,
		FilePath: p.FilePath,
		ReadOnly: p.ReadOnly,
	}
}

func buildDSN(ds *datasource.DataSource, password string) string {
	switch ds.Type {
	case datasource.TypeSQLite:
		return ds.FilePath
	case datasource.TypePostgres:
		return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable",
			ds.Username, password, ds.Host, ds.Port, ds.Database)
	case datasource.TypeMySQL:
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
			ds.Username, password, ds.Host, ds.Port, ds.Database)
	}
	return ""
}

// ---- Admin: SQL audit ----

type SQLAuditFilter struct {
	ConnectionID string `json:"connectionId"`
	ErrorOnly    bool   `json:"errorOnly"`
	Limit        int    `json:"limit"`
}

func (a *App) GetSQLAuditLog(f SQLAuditFilter) ([]*sqlaudit.Event, error) {
	if a.sa == nil {
		return []*sqlaudit.Event{}, nil
	}
	return a.sa.List(a.ctx, sqlaudit.ListFilter{
		ConnectionID: f.ConnectionID,
		ErrorOnly:    f.ErrorOnly,
		Limit:        f.Limit,
	})
}

func (a *App) ExportSQLAuditCSV(f SQLAuditFilter) (string, error) {
	if a.sa == nil {
		return "", nil
	}
	return a.sa.ExportCSV(a.ctx, sqlaudit.ListFilter{
		ConnectionID: f.ConnectionID,
		ErrorOnly:    f.ErrorOnly,
		Limit:        f.Limit,
	})
}

// ---- Admin: connection policy ----

func (a *App) GetConnectionPolicy(connectionID string) (*connpolicy.Policy, error) {
	if a.cp == nil {
		return &connpolicy.Policy{ConnectionID: connectionID, AllowDDL: true, AllowDML: true, AllowExport: true}, nil
	}
	return a.cp.Get(a.ctx, connectionID)
}

func (a *App) SetConnectionPolicy(p connpolicy.Policy) error {
	if a.cp == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.cp.Set(a.ctx, &p)
}

// ---- Admin: SQL policy ----

func (a *App) ListSQLPolicies() ([]*sqlpolicy.Policy, error) {
	if a.sp == nil {
		return []*sqlpolicy.Policy{}, nil
	}
	return a.sp.List(a.ctx)
}

func (a *App) CreateSQLPolicy(pattern, level, message string) (*sqlpolicy.Policy, error) {
	if a.sp == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	p := &sqlpolicy.Policy{Pattern: pattern, Level: level, Message: message}
	if err := a.sp.Create(a.ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (a *App) ToggleSQLPolicy(id int64, enabled bool) error {
	if a.sp == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.sp.Toggle(a.ctx, id, enabled)
}

func (a *App) DeleteSQLPolicy(id int64) error {
	if a.sp == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.sp.Delete(a.ctx, id)
}

// ---- AI provider ----

const aiConfigKey = "ai_config"

type AIConfig struct {
	Provider string `json:"provider"` // "openai" | "ollama" | "custom"
	BaseURL  string `json:"baseUrl"`
	Model    string `json:"model"`
	APIKey   string `json:"apiKey"`
}

type AIActionRequest struct {
	ConnectionID string `json:"connectionId"`
	Action       string `json:"action"` // "generate" | "explain" | "optimize" | "repair"
	SQL          string `json:"sql"`
	ErrorMsg     string `json:"errorMsg"`
	UserPrompt   string `json:"userPrompt"`
}

type AIActionResult struct {
	Content string `json:"content"`
}

func (a *App) GetAIConfig() AIConfig {
	if a.pref == nil {
		return AIConfig{}
	}
	var cfg AIConfig
	_ = a.pref.GetJSON(a.ctx, aiConfigKey, &cfg)
	return cfg
}

func (a *App) SetAIConfig(cfg AIConfig) error {
	if a.pref == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.pref.SetJSON(a.ctx, aiConfigKey, cfg)
}

func (a *App) RunAIAction(req AIActionRequest) (*AIActionResult, error) {
	if a.pref == nil {
		return nil, fmt.Errorf("store not initialized")
	}

	var cfg AIConfig
	_ = a.pref.GetJSON(a.ctx, aiConfigKey, &cfg)
	if cfg.Provider == "" {
		return nil, fmt.Errorf("AI provider not configured")
	}

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = aiprovider.DefaultBaseURL(cfg.Provider)
	}
	model := cfg.Model
	if model == "" {
		model = aiprovider.DefaultModel(cfg.Provider)
	}

	p := aiprovider.New(aiprovider.Config{
		Provider: cfg.Provider,
		BaseURL:  baseURL,
		Model:    model,
		APIKey:   cfg.APIKey,
	})

	// Build schema context if connection is active.
	var schema string
	if req.ConnectionID != "" {
		if conn, err := a.getOrOpenConn(req.ConnectionID); err == nil {
			if intr, ok := conn.(driver.Introspector); ok {
				if nodes, err := intr.ObjectTree(a.ctx); err == nil {
					schema = buildSchemaContext(nodes)
				}
			}
		}
	}

	aiReq := aiprovider.Request{
		Action:     aiprovider.Action(req.Action),
		SQL:        req.SQL,
		ErrorMsg:   req.ErrorMsg,
		Schema:     schema,
		UserPrompt: req.UserPrompt,
	}

	start := time.Now()
	resp, aiErr := p.Complete(a.ctx, aiReq)
	elapsed := time.Since(start).Milliseconds()

	// Persist audit event regardless of success/failure.
	if a.aia != nil {
		ev := &aiaudit.Event{
			Action:     req.Action,
			Provider:   cfg.Provider,
			Model:      model,
			InputLen:   len(req.SQL) + len(req.UserPrompt),
			DurationMs: elapsed,
		}
		if aiErr != nil {
			ev.Error = aiErr.Error()
		} else {
			ev.OutputLen = len(resp.Content)
		}
		_ = a.aia.Log(a.ctx, ev)
	}

	if aiErr != nil {
		return nil, aiErr
	}
	return &AIActionResult{Content: resp.Content}, nil
}

func (a *App) GetAIAuditLog(limit int) ([]*aiaudit.Event, error) {
	if a.aia == nil {
		return []*aiaudit.Event{}, nil
	}
	return a.aia.List(a.ctx, limit)
}

func buildSchemaContext(nodes []*driver.TreeNode) string {
	var tables, views []string
	for _, n := range nodes {
		collectSchemaLeaves(n, &tables, &views)
	}
	var parts []string
	if len(tables) > 0 {
		parts = append(parts, "Tables: "+strings.Join(tables, ", "))
	}
	if len(views) > 0 {
		parts = append(parts, "Views: "+strings.Join(views, ", "))
	}
	return strings.Join(parts, "\n")
}

func collectSchemaLeaves(n *driver.TreeNode, tables, views *[]string) {
	switch n.Kind {
	case driver.NodeTable:
		*tables = append(*tables, n.Name)
	case driver.NodeView:
		*views = append(*views, n.Name)
	default:
		for _, child := range n.Children {
			collectSchemaLeaves(child, tables, views)
		}
	}
}

func riskSeverity(l RiskLevel) int {
	switch l {
	case RiskDanger:
		return 2
	case RiskWarning:
		return 1
	default:
		return 0
	}
}

func isDDL(sql string) bool {
	upper := strings.TrimSpace(strings.ToUpper(sql))
	for _, prefix := range []string{"CREATE", "DROP", "ALTER", "RENAME", "TRUNCATE"} {
		if strings.HasPrefix(upper, prefix) {
			return true
		}
	}
	return false
}

func isDML(sql string) bool {
	upper := strings.TrimSpace(strings.ToUpper(sql))
	for _, prefix := range []string{"INSERT", "UPDATE", "DELETE", "REPLACE", "MERGE"} {
		if strings.HasPrefix(upper, prefix) {
			return true
		}
	}
	return false
}

func isSelectLike(sql string) bool {
	upper := strings.TrimSpace(strings.ToUpper(sql))
	for _, prefix := range []string{"SELECT", "SHOW", "EXPLAIN", "WITH", "PRAGMA", "DESCRIBE", "DESC"} {
		if strings.HasPrefix(upper, prefix) {
			return true
		}
	}
	return false
}

func collectRows(rows driver.Rows, ms int64) (*QueryResult, error) {
	cols := rows.Columns()
	colNames := make([]string, len(cols))
	for i, c := range cols {
		colNames[i] = c.Name
	}

	var result [][]string
	for rows.Next() {
		dest := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range dest {
			ptrs[i] = &dest[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make([]string, len(cols))
		for i, v := range dest {
			row[i] = fmt.Sprintf("%v", v)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = [][]string{}
	}
	return &QueryResult{
		Columns:    colNames,
		Rows:       result,
		DurationMs: ms,
	}, nil
}

// ---- Backup & archive ----

func (a *App) CreateBackup() (*backup.Info, error) {
	if a.bk == nil {
		return nil, errors.New("backup service not ready")
	}
	return a.bk.Create(a.ctx)
}

func (a *App) ListBackups() ([]*backup.Info, error) {
	if a.bk == nil {
		return []*backup.Info{}, nil
	}
	return a.bk.List()
}

func (a *App) DeleteBackup(path string) error {
	if a.bk == nil {
		return nil
	}
	return a.bk.Delete(path)
}

func (a *App) ArchiveAudit(beforeDays int) (*backup.ArchiveResult, error) {
	if a.bk == nil {
		return nil, errors.New("backup service not ready")
	}
	return a.bk.ArchiveAudit(a.ctx, beforeDays)
}

// ---- Drivers & capability probing ----

type DriverInfo struct {
	driver.Capabilities
	InUse    bool `json:"inUse"`
	Disabled bool `json:"disabled"`
}

func (a *App) ListDrivers() []DriverInfo {
	used := map[datasource.Type]bool{}
	if a.ds != nil {
		if list, err := a.ds.List(a.ctx); err == nil {
			for _, ds := range list {
				used[ds.Type] = true
			}
		}
	}
	out := make([]DriverInfo, 0, len(a.drivers))
	order := []datasource.Type{datasource.TypeSQLite, datasource.TypePostgres, datasource.TypeMySQL}
	for _, t := range order {
		d, ok := a.drivers[t]
		if !ok {
			continue
		}
		out = append(out, DriverInfo{
			Capabilities: d.Capabilities(),
			InUse:        used[t],
			Disabled:     a.disabledDrivers[t],
		})
	}
	return out
}

func (a *App) SetDriverEnabled(driverType string, enabled bool) error {
	t := datasource.Type(driverType)
	if _, ok := a.drivers[t]; !ok {
		return fmt.Errorf("unknown driver type: %q", driverType)
	}
	if !enabled && a.disabledDrivers[t] {
		return nil
	}
	if enabled {
		delete(a.disabledDrivers, t)
		return nil
	}
	// refuse to disable a driver that has active connections
	if a.ds != nil {
		if list, err := a.ds.List(a.ctx); err == nil {
			a.connsMu.RLock()
			for _, ds := range list {
				if ds.Type == t {
					if _, open := a.conns[ds.ID]; open {
						a.connsMu.RUnlock()
						return fmt.Errorf("driver %q has open connections; close them first", driverType)
					}
				}
			}
			a.connsMu.RUnlock()
		}
	}
	a.disabledDrivers[t] = true
	return nil
}

type ProbeResult struct {
	Connected bool     `json:"connected"`
	Latency   int64    `json:"latencyMs"`
	Features  []string `json:"features"`
	Errors    []string `json:"errors"`
}

func (a *App) ProbeConnection(id string) (*ProbeResult, error) {
	conn, err := a.getOrOpenConn(id)
	if err != nil {
		return &ProbeResult{Connected: false, Errors: []string{err.Error()}}, nil
	}

	res := &ProbeResult{Features: []string{}, Errors: []string{}}

	start := time.Now()
	if err := conn.Ping(a.ctx); err != nil {
		res.Errors = append(res.Errors, "ping: "+err.Error())
		return res, nil
	}
	res.Connected = true
	res.Latency = time.Since(start).Milliseconds()

	intr, ok := conn.(driver.Introspector)
	if !ok {
		res.Errors = append(res.Errors, "introspector not implemented")
		return res, nil
	}

	if _, err := intr.ObjectTree(a.ctx); err == nil {
		res.Features = append(res.Features, "object-tree")
	} else {
		res.Errors = append(res.Errors, "object-tree: "+err.Error())
	}

	return res, nil
}

// ---- Dashboard ----

func (a *App) ListDashboardWidgets() ([]*dashboard.Widget, error) {
	if a.dash == nil {
		return []*dashboard.Widget{}, nil
	}
	return a.dash.List(a.ctx)
}

func (a *App) CreateDashboardWidget(w dashboard.Widget) (*dashboard.Widget, error) {
	if a.dash == nil {
		return nil, errors.New("dashboard store not ready")
	}
	if err := a.dash.Create(a.ctx, &w); err != nil {
		return nil, err
	}
	return &w, nil
}

func (a *App) UpdateDashboardWidget(w dashboard.Widget) (*dashboard.Widget, error) {
	if a.dash == nil {
		return nil, errors.New("dashboard store not ready")
	}
	if err := a.dash.Update(a.ctx, &w); err != nil {
		return nil, err
	}
	return &w, nil
}

func (a *App) DeleteDashboardWidget(id string) error {
	if a.dash == nil {
		return nil
	}
	return a.dash.Delete(a.ctx, id)
}

func (a *App) RunDashboardWidget(id string) (*QueryResult, error) {
	if a.dash == nil {
		return nil, errors.New("dashboard store not ready")
	}
	list, err := a.dash.List(a.ctx)
	if err != nil {
		return nil, err
	}
	for _, w := range list {
		if w.ID == id {
			return a.ExecuteSQL(w.ConnectionID, w.SQL)
		}
	}
	return nil, fmt.Errorf("widget %s not found", id)
}
