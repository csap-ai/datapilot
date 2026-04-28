# Agent Instructions

DataPilot uses a traceable, desktop-first delivery process.

## Always Follow

- Read `README.md`, `ROADMAP.md`, and the docs under `docs/` before implementation.
- Treat `docs/TECH_STACK.md` as the source of truth for language and framework choices.
- Treat `docs/PROJECT_STRUCTURE.md` as the source of truth for file placement.
- Treat `docs/GITHUB_SETUP.md` and `docs/WIKI_PLAN.md` as the source of truth for repository operations.
- Use `docs/TASK_BACKLOG.md` as the execution queue.
- Update `docs/EXECUTION_PROGRESS.md` after every implementation session.
- Update `docs/DECISIONS.md` when making lasting product or technical decisions.
- Keep `.cursor/`, `.claude/`, and `.codex/` local-only and untracked.

## Product Direction

- Product name: DataPilot.
- Repository: `csap-ai/datapilot`.
- Description: AI-native database workspace for developers, analysts, and teams.
- Desktop-first with Wails.
- Web uses the same React UI source.
- Flutter mobile is planned later.
- Keep Chat2DB as reference only. Do not copy its code, assets, or license text.

## Technical Direction

- API: Go, lightweight, standard library first.
- UI: React + TypeScript + Vite.
- Desktop: Wails + React.
- License: Apache-2.0.
- Secrets must not be stored in plain SQLite or plain config files.
- AI-generated SQL must not execute automatically.
