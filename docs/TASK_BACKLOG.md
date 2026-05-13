# Task Backlog

Use this backlog as the execution queue. Complete tasks in order unless the user changes priority.

## M1: Desktop Foundation

- [x] Confirm language and platform choices in `docs/TECH_STACK.md`.
- [x] Define repository structure in `docs/PROJECT_STRUCTURE.md`.
- [x] Define GitHub repository setup in `docs/GITHUB_SETUP.md`.
- [x] Define GitHub Wiki plan in `docs/WIKI_PLAN.md`.
- [x] Verify Wails CLI availability and document setup requirements.
- [x] Fix Wails dev/build configuration for `apps/desktop`.
- [x] Make `apps/desktop` consume the shared `apps/web` React UI.
- [x] Add desktop-first shell layout: activity bar, resource tree, workspace, context AI, status bar.

### Batch 1: UI Design System Foundation (DONE)

- [x] Install Tailwind CSS 4 + @tailwindcss/vite and configure @/ path alias.
- [x] Init shadcn/ui utilities (clsx, cva, tailwind-merge) + lucide-react + cmdk.
- [x] Define dark-mode-first design tokens via Tailwind @theme.
- [x] Migrate Shell layout from hand-written CSS to Tailwind utility classes.

### Batch 2: Interaction Layer (DONE)

- [x] Add keyboard shortcut registry.
- [x] Add Command Palette foundation (cmdk integration).
- [x] Add tab workspace model.
- [x] Add status bar model.
- [x] Replace hardcoded App.tsx UI with real interactive components.

### Batch 3: Desktop Data Layer (DONE)

- [x] Add local app data directory resolver.
- [x] Add local SQLite metadata storage foundation.
- [x] Add SQLite schema migration foundation.
- [x] Add credential storage abstraction.
- [x] Spike macOS Keychain / Windows Credential Manager / Linux Secret Service (go-keyring).

### Batch 4: Preferences & Workspace Persistence (DONE)

- [x] Add user preferences storage.
- [x] Add workspace restore model.
- [x] Add configuration export/import format, excluding secret values.

### Batch 5: Validation (DONE)

- [x] Add desktop performance baseline script or checklist.

## UI Phase A — Skeleton (Done)

- [x] Write UI_DESIGN.md
- [x] Install react-resizable-panels + sonner
- [x] Rebuild Shell with resizable panels
- [x] Activity Bar state + Context Panel switching
- [x] Connection management Dialog
- [x] Empty state onboarding page

## UI Phase B — SQL Workspace (Done)

- [x] Install codemirror + @codemirror/lang-sql + @tanstack/react-table
- [x] SqlEditor component (CodeMirror 6, custom dark theme matching design tokens)
- [x] ResultsTable component (TanStack Table, pagination, export button)
- [x] ObjectTree component (static DB/schema/table tree, expand/collapse)
- [x] SqlWorkspace assembled with editor + results
- [x] ObjectTree wired into ConnectionsPanel under active connection

## M2: Database Workspace MVP

- [x] Define database driver port and adapter interfaces.
- [x] Define data source configuration model.
- [x] Implement SQLite driver.
- [x] Implement PostgreSQL driver.
- [x] Implement MySQL driver.
- [x] Add connection test API.
- [x] Add database object tree API.
- [x] Add SQL execution API.
- [x] Add result pagination.
- [x] Add long query cancellation.
- [x] Add query history persistence.
- [x] Add saved query persistence.
- [x] Add readonly connection mode.
- [x] Add SQL risk detection foundation.

## M3: AI SQL Foundation

- [x] Define AI Provider port.
- [x] Implement OpenAI-compatible provider.
- [x] Implement Ollama provider.
- [x] Add schema context builder.
- [x] Add SQL generation action.
- [x] Add SQL explanation action.
- [x] Add SQL optimization action.
- [x] Add SQL error repair action.
- [x] Add AI request audit event.
- [x] Add context AI side panel.

## M3.5: Admin Console and Audit

- [x] Define audit event model.
- [x] Persist SQL execution audit events.
- [x] Persist export audit events.
- [x] Persist AI request audit events.
- [x] Define user, role, and permission model.
- [x] Add data source authorization model.
- [x] Add SQL policy configuration model.
- [x] Add `/admin` route in Web UI.
- [x] Add audit log list and filters.
- [x] Add audit export.

## M4: Database Objects and Import/Export

- [x] Add schema/table/view/index metadata browser.
- [x] Add table data editor foundation.
- [x] Add CSV export.
- [x] Add JSON export.
- [x] Add CSV import.
- [x] Add DDL generation.
- [x] Add data dictionary generation.

## M5: Navicat-Class Enhancements

- [x] Add ER diagram.
- [x] Add query plan visualization.
- [x] Add structure compare.
- [x] Add data compare.
- [x] Add dashboard foundation.
- [x] Add plugin driver management.
- [x] Add plugin disable and capability probing.
- [x] Add backup and audit archive foundation.

## M6: Flutter Mobile

- [ ] Create `apps/mobile` Flutter application.
- [ ] Add connection list.
- [ ] Add readonly query.
- [ ] Add query history and favorites.
- [ ] Add AI SQL assistant.
- [ ] Add mobile safety restrictions.
