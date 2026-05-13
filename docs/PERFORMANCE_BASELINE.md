# Performance Baseline — M1 Desktop Foundation

Recorded: 2026-05-08

## Web Build

| Metric | Value |
|---|---|
| Vite build time | ~170 ms |
| JS bundle (gzip) | 88.21 kB |
| CSS bundle (gzip) | 5.02 kB |
| Total dist size | 304 kB |
| TypeScript check | pass, zero errors |

## Desktop Binary (darwin/arm64)

| Metric | Value |
|---|---|
| App bundle size | 7.9 MB |
| Binary (MacOS/DataPilot) | 7.7 MB |

Note: this binary was built before Batch 3 Go additions. A fresh `wails build` will include SQLite and keyring dependencies.

## Source Files

| Area | Files |
|---|---|
| apps/web/src | 18 |
| apps/desktop/internal | 12 |

## Dependencies

| Layer | Key Dependencies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, cmdk, lucide-react, clsx, cva, tailwind-merge |
| Desktop | Wails 2.12, go-sqlite3, go-keyring |

## Next Baseline

After M2 (Database Workspace MVP): re-measure with Monaco Editor, TanStack Table, and database driver dependencies.
