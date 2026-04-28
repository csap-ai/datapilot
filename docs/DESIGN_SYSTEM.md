# Design System

DataPilot uses an international, minimal, dense, keyboard-first, dark-mode-first design language.

## UI Direction

- Inspired by modern developer tools such as Linear, Cursor, Raycast, Vercel, Supabase, and GitHub.
- Avoid traditional heavy enterprise admin styling.
- Prefer calm contrast, tight spacing, and clear hierarchy.
- Desktop and Web must share the same visual system.

## Recommended Stack

- shadcn/ui style components.
- Radix UI primitives.
- Tailwind CSS.
- TanStack Table for result tables.
- Monaco Editor for SQL editing.
- lucide-react for icons.
- cmdk-style Command Palette.

## Layout

- Activity Bar.
- Resource Tree.
- Multi-tab Workspace.
- Context AI panel.
- Bottom Status Bar.

## Interaction Principles

- Command Palette first.
- Keyboard shortcuts for common actions.
- Fast recovery of recent connections, queries, tabs, and drafts.
- Dangerous SQL must show clear risk context before confirmation.
- AI suggestions should appear in context, not as a detached chatbot.
