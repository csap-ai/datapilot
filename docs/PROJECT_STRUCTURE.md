# Project Structure

This document defines where files belong in DataPilot.

## Root

```text
datapilot/
  apps/
  docs/
  .github/
  AGENTS.md
  README.md
  ROADMAP.md
  package.json
  pnpm-workspace.yaml
  go.work
```

The root is for workspace configuration, public project documents, GitHub configuration, and cross-app scripts.

## Applications

```text
apps/api/
```

Go API service for Web/server mode. It owns HTTP APIs, database orchestration, AI provider orchestration, audit APIs, and shared service logic.

```text
apps/web/
```

Shared React UI source for both Web and Wails desktop. Web routes, workspace layout, Admin Console, Command Palette, result tables, and Context AI live here.

```text
apps/desktop/
```

Wails desktop shell. It owns native window behavior, desktop bindings, local capabilities, and packaging. UI should still come from `apps/web`.

```text
apps/mobile/
```

Reserved for future Flutter mobile app. Do not create it before desktop and Web core workflows are stable.

## Documentation

```text
docs/
```

Planning and execution docs. Keep them current:

- Product and UX planning.
- Architecture and non-functional requirements.
- Technical decisions.
- Task backlog and execution progress.
- GitHub and Wiki plans.

## GitHub Configuration

```text
.github/
```

Public GitHub workflows, issue templates, pull request template, and dependency automation.

## Local-only Configuration

These directories must stay untracked:

- `.cursor/`
- `.claude/`
- `.codex/`

Use `AGENTS.md` for GitHub-visible agent instructions instead.

## Build Outputs

Do not commit generated outputs:

- `node_modules/`
- `apps/web/dist/`
- `apps/web/tsconfig.tsbuildinfo`
- `apps/desktop/build/`
- `apps/desktop/frontend/wailsjs/`
- `apps/desktop/frontend/dist/assets/`
- `bin/`
- `.data/`
- `.cache/`

Exception: `apps/desktop/frontend/dist/index.html` may exist as a tiny Wails embed placeholder until the desktop build pipeline is finalized.
