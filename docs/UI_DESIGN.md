# DataPilot UI Design

## Product Positioning

DataPilot is a desktop-first database client with native AI SQL assistance.

**Target users:**

| Role | Core need |
|---|---|
| Backend / full-stack developer | Fast query iteration, keyboard-driven, multi-connection |
| Data analyst | Browse data, AI-assisted SQL, CSV export |
| DBA | Connection management, execution plans, structure compare |
| Enterprise admin | Permission control, audit log, SQL policy |

**Differentiators vs. competitors:**
- TablePlus: lightweight + beautiful — DataPilot adds AI + enterprise audit
- Navicat: feature-complete but heavy — DataPilot is faster and privacy-first
- DBeaver: open-source but ugly — DataPilot is design-first

---

## Information Architecture

```
DataPilot
├── Connections (Activity #1)
│   ├── Connection list
│   ├── New / Edit connection dialog
│   └── Test connection
├── Search (Activity #2) — full-text across connections / tables / history
├── History (Activity #3)
│   └── Query history with replay
├── Saved (Activity #4)
│   └── Saved queries
├── Audit (Activity #5) — enterprise
│   └── SQL execution audit log
└── Settings (bottom of Activity Bar)
    ├── AI provider configuration
    ├── Keyboard shortcuts
    ├── Appearance (theme, font size)
    └── Export / import preferences

Main Workspace (center panel):
├── Empty state (no connections) — guided onboarding
└── SQL Workspace (connections exist)
    ├── Database object tree (left sidebar, context panel)
    │   ├── Databases
    │   ├── Schemas
    │   ├── Tables / Views / Functions
    │   └── Indexes
    ├── Tab area
    │   ├── SQL Console (editor + results)
    │   └── Table data browser (grid)
    └── Context AI panel (right sidebar)
```

---

## Shell Layout

4-panel layout (VS Code inspired):

```
┌──────┬──────────────────┬───────────────────────┬────────────────┐
│ Act  │  Context Panel   │   Main Workspace       │  AI Panel      │
│ Bar  │  (resizable)     │   (Tab area)           │  (collapsible) │
│ 72px │  260–320px       │   flex-1               │  280–340px     │
└──────┴──────────────────┴───────────────────────┴────────────────┘
│                          Status Bar (34px)                        │
└───────────────────────────────────────────────────────────────────┘
```

**Behavior rules:**

- Activity Bar click → switches Context Panel content
- `⌘\` toggles AI Panel (collapses / expands)
- Context Panel and AI Panel are user-resizable via drag handles
- Tab strip sits at the top of Main Workspace; tabs persist across connection switches
- Status Bar: left = app name / active connection / env; right = AI status / server status

---

## Component Inventory

| Component | Status | Technology |
|---|---|---|
| Shell / layout | Rebuild | react-resizable-panels + Tailwind flex |
| Activity Bar | Rebuild | lucide-react icons + activity store |
| Command Palette | Done | cmdk |
| Status Bar | Done | custom store |
| Keyboard shortcuts | Done | custom registry |
| **Context Panel router** | Build | activity store |
| **Connections panel** | Build | connection store |
| **Connection Dialog** | Build | controlled form |
| **Database object tree** | Phase B | custom tree |
| **SQL Editor** | Phase B | CodeMirror 6 |
| **Results table** | Phase B | TanStack Table + Virtual |
| **Resizable panels** | Build | react-resizable-panels |
| Toast notifications | Build | sonner |
| Empty state | Build | custom |
| AI chat panel | Phase D | custom |
| Settings panel | Phase D | custom |

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Layout model | 4-panel resizable | Matches complexity; proven for dev tools |
| SQL editor | CodeMirror 6 | 10× lighter than Monaco; good SQL support |
| Results table | TanStack Table + Virtual | Best-in-class; handles 100k+ rows |
| Panel resize | react-resizable-panels | Lightweight; keyboard accessible |
| Toasts | sonner | Minimal; shadcn-compatible |
| Connection type selector | Styled buttons (not Select) | Clearer visual affordance for 3 options |
| Password storage | Credential store only — never in DataSource | Security: passwords go to OS keychain |

---

## Visual Design Tokens

Dark-mode-first. All tokens defined in `styles.css` `@theme` block:

- **Background**: `dp-bg` `dp-bg-subtle` `dp-bg-muted`
- **Surface**: `dp-surface` `dp-surface-raised` `dp-surface-overlay` `dp-surface-solid`
- **Border**: `dp-border` `dp-border-subtle` `dp-border-accent`
- **Text**: `dp-text` `dp-text-secondary` `dp-text-muted` `dp-text-dimmed`
- **Accent**: `dp-accent` `dp-accent-light` `dp-accent-lighter` `dp-accent-hover`
- **Semantic**: `dp-success` `dp-warning` `dp-error`

---

## Implementation Phases

### Phase A — UI Skeleton (current)

1. Install react-resizable-panels + sonner
2. Rebuild Shell with resizable panels
3. Activity Bar state + Context Panel switching
4. Connection management Dialog (in-memory, no backend)
5. Empty state onboarding page

### Phase B — SQL Workspace

6. CodeMirror 6 SQL editor
7. TanStack Table results table + pagination
8. Database object tree (static data first)

### Phase C — Data Layer (M2 backend)

9. Wire connection dialog to Go backend (Wails bindings)
10. Real SQLite driver
11. Connection test API
12. Query execution + results streaming

### Phase D — AI Panel

13. AI provider configuration
14. SQL explain / generate / optimize
15. Risk detection UI

### Phase E — Advanced (M4–M5)

16. Table data browser with editing
17. ER diagram
18. Query plan visualization
19. Structure compare
