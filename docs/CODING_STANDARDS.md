# Coding Standards

## General

- Keep the project lightweight and dependency-conscious.
- Prefer explicit boundaries over large frameworks.
- Optimize for desktop-first workflows.
- Update progress documents after implementation work.
- Never commit secrets or local AI assistant configuration.

## Go

- Use `gofmt` on changed Go files.
- Prefer the standard library until a dependency has clear value.
- Use `context.Context` for request-scoped work, database queries, AI calls, and cancellation.
- Keep integration boundaries behind small interfaces.
- Avoid logging credentials, API keys, SQL result data, or full secret-bearing configs.

## React / TypeScript

- Keep `apps/web` as the shared UI source for Web and Wails desktop.
- Prefer strict types and avoid `any`.
- Use command-style abstractions for Command Palette actions.
- Design for keyboard-first usage and dark mode first.
- Keep components small and focused.

## Documentation

- Keep docs concise, current, and actionable.
- Record lasting decisions in `docs/DECISIONS.md`.
- Keep `ROADMAP.md` aligned with `docs/TASK_BACKLOG.md`.
