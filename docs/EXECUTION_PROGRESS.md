# Execution Progress

This file is the traceable progress log for DataPilot. Update it after every implementation session.

## Current Milestone

**M6: Flutter Mobile** — completed 2026-05-13.

Delivered: 5 个 screen 全量实现（连接管理、SQL 查询、历史/收藏、AI 助手、设置），Postgres/MySQL/SQLite 直连 driver，SQL 风险评估与 desktop 对齐，readonly 闸门 + 生物认证 + 二次确认，AI 直连 OpenAI 兼容端点（4 个 action），Mobile CI workflow（analyze + test + build apk debug）。

## Previous Milestones

- **M1: Desktop Foundation** — completed 2026-05-08.
- **M2: Database Workspace MVP** — completed 2026-05-10.
- **M3: AI SQL Foundation** — completed 2026-05-10.
- **M3.5: Admin Console & Audit** — completed 2026-05-11.
- **M4: Database Objects & Import/Export** — completed 2026-05-11.
- **M5: Navicat-Class Enhancements** — completed 2026-05-12.

## Status

- Project direction: desktop-first.
- API: Go standard library `net/http`.
- Web UI: React + Vite.
- Desktop: Wails + React.
- Mobile: Flutter, later.
- Planning documents: complete enough to start execution.
- Public execution guidance: `AGENTS.md`.
- Local private Cursor Skill: `.cursor/skills/datapilot-delivery/SKILL.md` (ignored by git).
- Wails CLI: installed and verified as `v2.12.0`; `wails doctor` reports the system is ready.

## Latest Session

### 2026-04-28

- Created local project delivery skill.
- Added public `AGENTS.md` for GitHub-visible agent instructions.
- Added traceable progress files.
- Established execution loop: read plans, pick next backlog item, implement, validate, update progress.
- Renamed project to DataPilot and aligned repository metadata with `csap-ai/datapilot`.
- Added GitHub standard files, CI, issue templates, PR template, Dependabot, security policy, code of conduct, and contribution guide.
- Added `docs/TECH_STACK.md`, `docs/PROJECT_STRUCTURE.md`, `docs/GITHUB_SETUP.md`, and `docs/WIKI_PLAN.md`.
- Verified Wails CLI availability for Desktop Foundation. Local shell returned `wails: command not found`.
- Added `docs/DEVELOPMENT_SETUP.md` with Wails installation and validation requirements.
- Installed Wails CLI `v2.12.0` and verified `wails doctor`.
- Fixed Wails frontend build command by moving shell chaining into `apps/desktop/scripts/build-frontend.sh`.
- Updated desktop Wails dependency to `v2.12.0`.
- Validated `wails build` on `darwin/arm64`.
- Validated `wails dev` uses the shared `apps/web` React UI through the Wails frontend watcher.
- Added the first desktop-first shell layout in `apps/web`: activity bar, resource tree, SQL workspace, Context AI panel, and status bar.

Validation:

- `go test ./apps/api/...`
- `pnpm build:web`
- Naming scan shows no old `open-data-studio` references outside ignored generated artifacts.
- `wails version` check failed because Wails CLI is not installed locally.
- `wails version`
- `wails doctor`
- `wails build`
- `wails dev` started `pnpm --dir ../../web dev` and loaded `http://localhost:5173/`
- `pnpm build:web`

## Latest Session

### 2026-05-08

- Created UI_DESIGN.md: product positioning, IA, layout model, component inventory, 5-phase implementation plan.
- Phase A complete: Shell rebuilt with react-resizable-panels (Group/Panel/Separator v4 API); Activity Bar with icon + state switching; ContextPanel router; ConnectionsPanel with new/edit/delete dialog; EmptyWorkspace onboarding; sonner Toaster wired.
- Started M2 Database Workspace MVP.
- Defined driver port interfaces in `apps/desktop/internal/driver/driver.go`: `Driver`, `Conn`, `Rows`, `Column`, `Result`, `ConnParams`.
- Defined data source config model in `apps/desktop/internal/datasource/datasource.go`: `DataSource`, `Type`, `Store` interface.
- Added migration v4 `create_data_sources` table in `metadata.go`.

Validation:

- `go build ./apps/desktop/internal/driver/...` passes

## Latest Session

### 2026-05-11

- M3.5 Admin Console & Audit:
  - SQL execution audit store (`sqlaudit.Store`); persisted on every `ExecuteSQL` with success/error/duration.
  - Export audit events persisted on CSV/JSON export.
  - AI request audit retained from M3.
  - Connection policy model (`connpolicy.Store`): readonly mode, query timeout, blocked statements per connection.
  - SQL policy model (`sqlpolicy.Store`): admin-defined regex patterns with danger/warning levels.
  - Admin route inside `apps/web` via `AuditPanel` (SQL Audit / AI Audit / Export Audit / SQL Policies / Connection Policies tabs); CSV export of SQL audit; filters by connection, action, level, date.
- M4 Database Objects & Import/Export:
  - Metadata browser tab (`MetadataView`): tables/views/indexes columns with type/nullable/PK details.
  - Table data editor foundation via `BrowseTable` API.
  - CSV / JSON export with audit event.
  - CSV import with header detection (`CSVImportDialog`, `ImportCSV` API).
  - DDL generation (`GenerateTableDDL`) and data dictionary (`GenerateDataDictionary`) APIs.

### 2026-05-13

- M6 Flutter Mobile（5 个 screen 全量实现）：
  - 依赖：postgres ^3.4.5, mysql_client ^0.0.27, provider ^6.1.2, intl ^0.20.1, flutter_highlight + highlight。
  - 状态管理：`AppState`（ChangeNotifier）管 currentConnection / pendingSqlDraft / tabIndex / isUnlocked；main 用 `ChangeNotifierProvider` 包裹。
  - 数据层：`Connection` 加 `readonly` + `sslMode`；sqflite schema v1→v2 迁移；`risk_service.dart` 复刻 desktop `app.go:412-447` 的 3 级风险评估（10 个单测覆盖）。
  - Driver 层：`sqlite_driver` / `postgres_driver`（用 `as pg` 避免类名冲突，支持 sslMode require/disable/verify-full）/ `mysql_driver`；driver 层硬截断 1000 行（自动追加 LIMIT），UI 提示。
  - 5 个 screen：ConnectionsScreen 列表+新建+编辑+删除；QueryScreen 连接 dropdown + SqlEditor + 执行（带 risk 闸门：readonly 阻断写、warning/danger 走 LocalAuth + 二次确认）+ 收藏 + TSV 复制；HistoryScreen TabBar 历史/收藏 + 清空 + 回填到 Query；AiScreen SegmentedButton 4 action + 复制/发送；SettingsScreen AI 配置 + 生物认证测试 + 清除全部数据 + 关于。
  - 共用 widget：`empty_state`、`risk_confirm_dialog`、`sql_editor`、`result_table`、`connection_form_dialog`。
  - AI：`ai_service.dart` 复刻 desktop `openai.go` 的 4 个 prompt + OpenAI 兼容 POST；baseURL/model 用 FlutterSecureStorage，apiKey 走 CredentialService。
  - CI：`.github/workflows/mobile.yml`（pub get + analyze + test + build apk --debug）。

### 2026-05-12

- M5 Navicat-Class Enhancements:
  - ER diagram via `@xyflow/react`: `GetSchemaGraph` backend + `ERDiagram` view with table nodes, FK edges, MiniMap.
  - Query plan visualization: `ExplainSQL` backend (driver-specific parsers); `ExplainView` rendered inside `SqlWorkspace` results/explain switcher.
  - Structure compare: `CompareSchemas` backend (tables-only-in-A/B, column/index diffs); `SchemaDiffView` UI.
  - Data compare: `CompareTableData` backend (key-based row diff, truncation); `DataDiffView` UI.
  - Dashboard foundation: `dashboard.Store` + 5 Wails APIs (list/create/update/delete/run widget); `DashboardView` with grid of widgets and 4 chart types (number/bar/line/table); `WidgetEditor` dialog.
  - Plugin driver management: `ListDrivers/SetDriverEnabled` APIs and `DriversTab` UI; `ProbeConnection` capability probe.
  - Backup & audit archive: `backup.Service` (VACUUM INTO with copy fallback) + `ArchiveAudit` (delete N-days-old rows); `ArchiveTab` UI.
- Synced `TASK_BACKLOG.md` and `EXECUTION_PROGRESS.md` with implementation reality.

Validation:

- `go build ./apps/desktop/...` passes
- `go test ./apps/desktop/internal/...` passes
- `tsc --noEmit` clean (no errors)

## Next Recommended Task

M6 complete. Options for next milestone:

1. **手工验证 mobile** — iOS/Android 真机或模拟器跑 5 个 screen 的端到端流程（连接、查询、生物认证、AI、设置清除）。
2. **M7+ 候选**：mobile 分页/cursor、数据导出、ER 图 mobile 版、desktop 加 HTTP server 走代理 AI、i18n。
3. **Desktop polish** — ER 自动布局、Dashboard 拖拽、query plan cost 可视化。

Recommendation: 优先做 M6 手工验证（启 docker-compose 的 Postgres/MySQL demo，确认三个 driver 在真机上能跑通）。

## Progress Log

| Date | Milestone | Change | Validation | Next |
| --- | --- | --- | --- | --- |
| 2026-04-28 | M1 Desktop Foundation | Created delivery skill and progress tracking docs | Docs-only | Verify Wails desktop chain |
| 2026-04-28 | M1 Desktop Foundation | Renamed to DataPilot and completed GitHub/docs standards | `go test ./apps/api/...`; `pnpm build:web` | Verify Wails desktop chain |
| 2026-04-28 | M1 Desktop Foundation | Verified Wails CLI availability and documented setup requirements | `wails version` failed: command not found | Fix Wails dev/build configuration |
| 2026-04-28 | M1 Desktop Foundation | Installed Wails and fixed desktop build chain | `wails version`; `wails doctor`; `wails build` | Share React UI into desktop |
| 2026-04-29 | M1 Desktop Foundation | Verified desktop dev and build both consume shared `apps/web` UI | `wails dev`; `wails build` | Add desktop-first shell layout |
| 2026-04-29 | M1 Desktop Foundation | Added first desktop shell layout in shared React UI | `pnpm build:web` | Add dark-mode-first design tokens |
| 2026-05-08 | M1 Desktop Foundation | Batch 1: Tailwind CSS 4 + shadcn/ui design system, design tokens, migrated Shell layout | `pnpm build:web`; visual check | Batch 2: Interaction layer |
| 2026-05-08 | M1 Desktop Foundation | Batch 2: Keyboard shortcuts, Command Palette (cmdk), Tab workspace, Status bar | `pnpm build:web`; no `any`/`console.log` | Batch 3: Desktop data layer |
| 2026-05-08 | M1 Desktop Foundation | Batch 3: App data resolver, SQLite metadata + migration runner, credential abstraction (go-keyring) | `go test ./apps/desktop/internal/...` all pass | Batch 4: Preferences |
| 2026-05-08 | M1 Desktop Foundation | Batch 4: Preferences storage, workspace restore, config export/import (secrets stripped) | `go test` all pass | Batch 5: Validation |
| 2026-05-08 | M1 Desktop Foundation | Batch 5: Performance baseline recorded, M1 backlog complete | `pnpm build:web`; `go test` all pass | Start M2 |
| 2026-05-08 | M2 Database Workspace MVP | Defined driver port interfaces (Driver, Conn, Rows, Column, Result, ConnParams) | `go build` passes | Define data source config model |
| 2026-05-08 | M2 Database Workspace MVP | Defined data source config model (DataSource, Type, Store); added migration v4 | `go test ./internal/metadata/...` passes | Implement SQLite driver |
| 2026-05-08 | UI Phase A | Shell rebuild, Activity Bar, ContextPanel, ConnectionDialog, EmptyWorkspace, sonner | `pnpm build:web` passes; no `any`/`console.log` | Phase B: CodeMirror + TanStack Table |
| 2026-05-08 | UI Phase B | SqlEditor (CodeMirror 6), ResultsTable (TanStack Table), ObjectTree; SqlWorkspace assembled | `pnpm build:web` passes; no `any`/`console.log` | Phase C: data layer wire-up |
| 2026-05-10 | M2 Database Workspace MVP | SQLite/PostgreSQL/MySQL drivers; datasource SQLiteStore; full Wails API (ListConnections, CreateConnection, UpdateConnection, DeleteConnection, TestConnection, ExecuteSQL, GetObjectTree); frontend wired to real backend | `go test ./internal/...` all pass; `pnpm build:web` passes | Query history, cancellation, SQL risk detection |
| 2026-05-10 | M2 Database Workspace MVP | Query history persistence (queryhistory.Store); long query cancellation (context.WithCancel, CancelExecution API); SQL risk detection (AssessSQL, danger/warning levels); HistoryPanel frontend; SqlWorkspace risk confirm dialog + cancel button | `go build ./...` passes; `pnpm build:web` passes | Saved query persistence (M2 remaining) |
| 2026-05-10 | M2 Database Workspace MVP | Saved query persistence (savedquery.Store, migration v5); Wails API (SaveQuery, ListSavedQueries, RenameSavedQuery, DeleteSavedQuery); SavedQueriesPanel frontend; Save button + dialog in SqlWorkspace; editor-events event bus for loading SQL from panel | `go build ./...` passes; `pnpm build:web` passes | Start M3 AI SQL Foundation |
| 2026-05-10 | M3 AI SQL Foundation | AI Provider port (aiprovider.Provider interface); OpenAI-compatible HTTP client (works for OpenAI + Ollama); schema context builder (builds Tables/Views summary from object tree); generate/explain/optimize/repair actions with per-action prompts; AI audit event store (aiaudit.Store, migration v6); Wails API (GetAIConfig, SetAIConfig, RunAIAction, GetAIAuditLog); AiPanel full implementation (config form, action selector, prompt/error inputs, result block with load/copy); sql-state event bus for cross-component SQL sharing | `go build ./...` passes; `pnpm build:web` passes | Start M3.5 Admin Console and Audit |
| 2026-05-11 | M3.5 Admin Console & Audit | SQL/AI/Export audit stores; connection policy (readonly, timeout, blocked stmts); SQL policy (regex with levels); AuditPanel with 5 tabs + CSV export + filters | `go test ./internal/...` passes; `tsc --noEmit` clean | Start M4 |
| 2026-05-11 | M4 Database Objects & Import/Export | MetadataView (columns/indexes); BrowseTable; CSV/JSON export with audit; CSV import dialog; DDL & data dictionary generators | `go build ./...` passes; `tsc --noEmit` clean | Start M5 |
| 2026-05-12 | M5 Navicat-Class Enhancements | ER diagram (xyflow); ExplainSQL + ExplainView; Schema/Data compare; Dashboard widgets (4 chart types); Drivers tab + ProbeConnection; backup.Service + ArchiveAudit | `go build ./...` passes; `go test ./internal/...` passes; `tsc --noEmit` clean | Manual desktop walkthrough; then plan M6 |
| 2026-05-12 | Docs sync | Synced TASK_BACKLOG.md (M5 ticks) and EXECUTION_PROGRESS.md (M3.5/M4/M5 entries) with code reality | n/a | Commit + PR |
| 2026-05-13 | M6 Flutter Mobile | 5 screens 全量实现：connections/query/history/ai/settings + 3 drivers + risk + readonly 闸门 + AI 直连 + CI workflow | `flutter analyze`(0 issue); `flutter test`(11 pass) | 手工验证 + 启动 demo db 测三 driver |
