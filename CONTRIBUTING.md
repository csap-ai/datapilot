# Contributing

DataPilot uses traceable, milestone-based delivery.

## Before Starting Work

1. Read `README.md`.
2. Read `ROADMAP.md`.
3. Read `docs/EXECUTION_PROGRESS.md`.
4. Pick the next task from `docs/TASK_BACKLOG.md`.
5. Check `docs/DECISIONS.md` for existing decisions.

## Delivery Rules

- Work on one coherent task at a time.
- Keep changes small enough to validate.
- Prefer desktop-first behavior.
- Keep Web and Desktop UI shared through `apps/web`.
- Keep API dependencies lightweight.
- Do not store secrets in plain files or plain SQLite.

## After Completing Work

Update:

- `docs/EXECUTION_PROGRESS.md` with summary, validation, and next task.
- `docs/TASK_BACKLOG.md` with completed or discovered tasks.
- `docs/DECISIONS.md` if a lasting decision was made.

## Validation

Use the narrowest useful validation:

- Go API: `go test ./apps/api/...`
- Web UI: `pnpm build:web`
- Desktop: Wails dev/build validation when feasible
- Docs-only: read/lint sanity check

If validation cannot run, record the reason in `docs/EXECUTION_PROGRESS.md`.
