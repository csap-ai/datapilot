# Task Backlog

Use this backlog as the execution queue. Complete tasks in order unless the user changes priority.

## M1: Desktop Foundation

- [x] Confirm language and platform choices in `docs/TECH_STACK.md`.
- [x] Define repository structure in `docs/PROJECT_STRUCTURE.md`.
- [x] Define GitHub repository setup in `docs/GITHUB_SETUP.md`.
- [x] Define GitHub Wiki plan in `docs/WIKI_PLAN.md`.
- [x] Verify Wails CLI availability and document setup requirements.
- [x] Fix Wails dev/build configuration for `apps/desktop`.
- [ ] Make `apps/desktop` consume the shared `apps/web` React UI.
- [ ] Add desktop-first shell layout: activity bar, resource tree, workspace, context AI, status bar.
- [ ] Add dark-mode-first design tokens.
- [ ] Add Command Palette foundation.
- [ ] Add keyboard shortcut registry.
- [ ] Add tab workspace model.
- [ ] Add status bar model.
- [ ] Add local app data directory resolver.
- [ ] Add local SQLite metadata storage foundation.
- [ ] Add SQLite schema migration foundation.
- [ ] Add credential storage abstraction.
- [ ] Spike macOS Keychain / Windows Credential Manager / Linux Secret Service options.
- [ ] Add user preferences storage.
- [ ] Add workspace restore model.
- [ ] Add configuration export/import format, excluding secret values.
- [ ] Add desktop performance baseline script or checklist.

## M2: Database Workspace MVP

- [ ] Define database driver port and adapter interfaces.
- [ ] Define data source configuration model.
- [ ] Implement SQLite driver.
- [ ] Implement PostgreSQL driver.
- [ ] Implement MySQL driver.
- [ ] Add connection test API.
- [ ] Add database object tree API.
- [ ] Add SQL execution API.
- [ ] Add result pagination.
- [ ] Add long query cancellation.
- [ ] Add query history persistence.
- [ ] Add saved query persistence.
- [ ] Add readonly connection mode.
- [ ] Add SQL risk detection foundation.

## M3: AI SQL Foundation

- [ ] Define AI Provider port.
- [ ] Implement OpenAI-compatible provider.
- [ ] Implement Ollama provider.
- [ ] Add schema context builder.
- [ ] Add SQL generation action.
- [ ] Add SQL explanation action.
- [ ] Add SQL optimization action.
- [ ] Add SQL error repair action.
- [ ] Add AI request audit event.
- [ ] Add context AI side panel.

## M3.5: Admin Console and Audit

- [ ] Define audit event model.
- [ ] Persist SQL execution audit events.
- [ ] Persist export audit events.
- [ ] Persist AI request audit events.
- [ ] Define user, role, and permission model.
- [ ] Add data source authorization model.
- [ ] Add SQL policy configuration model.
- [ ] Add `/admin` route in Web UI.
- [ ] Add audit log list and filters.
- [ ] Add audit export.

## M4: Database Objects and Import/Export

- [ ] Add schema/table/view/index metadata browser.
- [ ] Add table data editor foundation.
- [ ] Add CSV export.
- [ ] Add JSON export.
- [ ] Add CSV import.
- [ ] Add DDL generation.
- [ ] Add data dictionary generation.

## M5: Navicat-Class Enhancements

- [ ] Add ER diagram.
- [ ] Add query plan visualization.
- [ ] Add structure compare.
- [ ] Add data compare.
- [ ] Add dashboard foundation.
- [ ] Add plugin driver management.
- [ ] Add plugin disable and capability probing.
- [ ] Add backup and audit archive foundation.

## M6: Flutter Mobile

- [ ] Create `apps/mobile` Flutter application.
- [ ] Add connection list.
- [ ] Add readonly query.
- [ ] Add query history and favorites.
- [ ] Add AI SQL assistant.
- [ ] Add mobile safety restrictions.
