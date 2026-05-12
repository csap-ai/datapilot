# Decisions

This file records product and technical decisions that should guide future implementation.

## Accepted Decisions

### 2026-04-28: Root package.json is the monorepo command hub

Decision: keep root `package.json` with `private: true`.

Reason: DataPilot uses pnpm workspace for shared Web/Desktop scripts. The root package is not published to npm; it centralizes development and build commands.

### 2026-04-28: DataPilot repository standards

Decision: maintain GitHub standards in-repo through `.github/`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and docs.

Reason: public contributors and AI agents need visible, versioned project rules while local assistant config stays ignored.

### 2026-04-28: Wails CLI is required for desktop tasks

Decision: desktop development requires Wails CLI, documented in `docs/DEVELOPMENT_SETUP.md`.

Reason: Wails is the selected desktop runtime. Local verification showed `wails` is not currently available in the shell, so desktop tasks need explicit setup before dev/build validation.

### 2026-04-28: Wails frontend build uses a script

Decision: use `apps/desktop/scripts/build-frontend.sh` for Wails production frontend builds.

Reason: Wails does not run chained shell commands like `&&` as expected in `frontend:build`. A script keeps shared `apps/web` build and copy steps explicit and reliable.

### 2026-04-28: Public agent instructions use AGENTS.md

Decision: keep `.cursor/`, `.claude/`, and `.codex/` ignored, and publish durable agent instructions through `AGENTS.md` plus docs.

Reason: local AI assistant configuration should not be committed, while GitHub-visible rules still need to be traceable.

### 2026-04-28: Desktop-first delivery

Decision: prioritize Wails desktop experience before Web polish.

Reason: the product competes on database client operation quality, local performance, shortcuts, workspace restore, local credentials, and native-feeling desktop workflows.

### 2026-04-28: Wails over Electron by default

Decision: use Wails + Go + React as the default desktop stack. Keep Electron as fallback only if Wails fails desktop spike validation.

Reason: Wails aligns with lightweight goals, Go backend direction, lower memory, smaller package size, and local database tooling needs.

### 2026-04-28: Go API with minimal dependencies

Decision: start API with Go standard library `net/http`.

Reason: keep runtime small and avoid framework lock-in until routing and middleware complexity justify a dependency such as `chi`.

### 2026-04-28: React UI shared by Web and Desktop

Decision: `apps/web` is the shared React UI source for both Web and Wails desktop.

Reason: one UI system keeps desktop and Web behavior consistent and avoids duplicated product work.

Implementation: Wails dev mode starts `apps/web` through `pnpm --dir ../../web dev`, and Wails production builds run `apps/desktop/scripts/build-frontend.sh` to build and embed the same React app.

### 2026-04-29: Desktop shell starts in shared React UI

Decision: implement the first desktop shell layout directly in `apps/web`, not as a Wails-only frontend.

Reason: the product requires desktop and Web to stay visually and behaviorally aligned. Wails owns native capabilities, while the shared React UI owns activity navigation, resource tree, workspace, Context AI, and status presentation.

### 2026-04-28: Flutter for mobile later

Decision: mobile is a later phase and uses Flutter.

Reason: mobile needs native-feeling gestures, offline behavior, and system capabilities. It should not constrain desktop-first delivery.

### 2026-04-28: Admin Console as Web route

Decision: Admin Console starts as `/admin` inside `apps/web`, not a separate `apps/admin`.

Reason: reduces early complexity while preserving enterprise audit and governance planning.

### 2026-04-28: SQLite metadata storage first

Decision: use SQLite for desktop metadata and lightweight Web/server metadata first; support PostgreSQL metadata storage later for enterprise deployment.

Reason: SQLite keeps the early product lightweight and reliable while preserving a path to team deployments.

### 2026-04-28: No plaintext credentials

Decision: credentials must not be stored in plain SQLite or plain config files.

Reason: database passwords, SSH keys, and AI keys are high-value secrets and must use system secure storage or encrypted server-side storage.

### 2026-05-08: go-keyring for credential storage

Decision: use `github.com/zalando/go-keyring` as the cross-platform credential storage backend (macOS Keychain / Windows Credential Manager / Linux Secret Service).

Reason: closes the M1 pending decision; single dependency covers all three desktop targets without per-platform branching.

### 2026-05-08: Minimal in-repo migration runner

Decision: write a small migration runner in `internal/metadata/migrate` instead of introducing `golang-migrate` or similar.

Reason: migrations are append-only numbered SQL files (v1..vN); the runner is < 100 lines and avoids a heavy dependency for what the desktop product needs at this stage.

### 2026-05-10: OpenAI-compatible HTTP for AI providers

Decision: implement a single `aiprovider.openai` client that speaks OpenAI's chat-completions schema; use it for both OpenAI and Ollama by swapping `baseURL`.

Reason: Ollama supports the OpenAI-compatible endpoint; one client covers two providers and any future OpenAI-compatible gateway (Azure OpenAI, vLLM, etc.).

### 2026-05-11: Admin Console as in-app tab, not `/admin` route

Decision: render admin features (audit logs, SQL policies, connection policies, drivers, backup) as a tab inside the shared shell instead of a separate `/admin` route.

Reason: desktop-first product; users expect admin features in the same window/shell. Supersedes the 2026-04-28 `/admin` route plan. The Web deployment can still expose the same panel under `/admin` later without code split.

### 2026-05-12: @xyflow/react for ER diagram

Decision: use `@xyflow/react` (v12) for the ER diagram rendering layer.

Reason: well-maintained, accessible, supports custom node types, MiniMap, Controls; avoids hand-rolling layout/pan/zoom. Alternatives evaluated: reaflow (less active), d3 (more wiring required).

### 2026-05-12: SQLite VACUUM INTO for metadata backup

Decision: backup via `VACUUM INTO <dst>` with a plain file-copy fallback when VACUUM INTO fails (e.g., metadata.db locked).

Reason: VACUUM INTO produces a consistent, compacted copy without quiescing the app; file copy fallback keeps the feature usable when VACUUM is unavailable.

## Pending Decisions

- Choose whether to introduce `chi` after API complexity increases.
- Choose table virtualization implementation for large result sets.
- Choose whether plugin loading is compile-time, local dynamic registry, or remote marketplace in later phases.
- Decide whether ER diagram needs an auto-layout algorithm (dagre / elk) beyond the current grid placement.
- Decide whether to add dashboard widget drag-and-drop reordering and grid persistence beyond the current `position` field.
