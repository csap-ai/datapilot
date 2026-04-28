# Decisions

This file records product and technical decisions that should guide future implementation.

## Accepted Decisions

### 2026-04-28: Root package.json is the monorepo command hub

Decision: keep root `package.json` with `private: true`.

Reason: DataPilot uses pnpm workspace for shared Web/Desktop scripts. The root package is not published to npm; it centralizes development and build commands.

### 2026-04-28: DataPilot repository standards

Decision: maintain GitHub standards in-repo through `.github/`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and docs.

Reason: public contributors and AI agents need visible, versioned project rules while local assistant config stays ignored.

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

## Pending Decisions

- Choose specific Go secure storage library or per-platform implementation.
- Choose SQLite migration library or write a minimal migration runner.
- Choose whether to introduce `chi` after API complexity increases.
- Choose table virtualization implementation for large result sets.
- Choose whether plugin loading is compile-time, local dynamic registry, or remote marketplace in later phases.
