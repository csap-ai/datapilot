# Tech Stack

This document is the source of truth for DataPilot language and platform choices.

## Confirmed Stack

| Area | Choice | Status |
| --- | --- | --- |
| API | Go, standard library first | Confirmed |
| Web UI | React + TypeScript + Vite | Confirmed |
| Desktop | Wails + Go + shared React UI | Confirmed |
| Mobile | Flutter | Confirmed, later phase |
| Package manager | pnpm workspace | Confirmed |
| Go workspace | `go.work` | Confirmed |
| License | Apache-2.0 | Confirmed |
| UI style | shadcn/Radix/Tailwind-inspired | Confirmed |
| SQL editor | Monaco Editor | Planned |
| Data table | TanStack Table | Planned |
| Local metadata | SQLite | Planned |
| Desktop secrets | System secure storage | Planned |

## Root `package.json`

The root `package.json` is intentionally kept. It is not a publishable product package. It is the monorepo command hub for:

- Web development and build scripts.
- Go API run/build scripts.
- Wails desktop run/build scripts.
- Shared pnpm workspace metadata.

The root package must remain `private: true`.

## Not Allowed Unless Re-decided

- Java / Spring Boot.
- Electron as default desktop runtime.
- GPL/AGPL or custom non-open-source license.
- Storing secrets in plain SQLite or plain config files.

## Future Re-evaluation Points

- Introduce `chi` only if Go routing and middleware complexity justify it.
- Use Electron only if Wails fails validated desktop spike criteria.
- Add PostgreSQL as metadata database for enterprise server mode.
- Add Flutter mobile after desktop and Web core workflows are stable.
