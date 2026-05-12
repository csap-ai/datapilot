import { useSyncExternalStore } from 'react';

export interface TabMeta {
  connectionId: string;
  schema: string;
  table: string;
  targetConnectionId?: string;
  keyColumn?: string;
}

export interface WorkspaceTab {
  id: string;
  label: string;
  type: 'sql-console' | 'table-data' | 'query-plan' | 'dashboard' | 'metadata' | 'er-diagram' | 'schema-diff' | 'data-diff';
  pinned?: boolean;
  meta?: TabMeta;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

let state: WorkspaceState = { tabs: [], activeTabId: null };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function setState(next: WorkspaceState) {
  state = next;
  emit();
}

export function openTab(tab: WorkspaceTab) {
  const exists = state.tabs.find((t) => t.id === tab.id);
  if (exists) {
    setState({ ...state, activeTabId: tab.id });
    return;
  }
  setState({ tabs: [...state.tabs, tab], activeTabId: tab.id });
}

export function closeTab(id: string) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const tabs = state.tabs.filter((t) => t.id !== id);
  let activeTabId = state.activeTabId;

  if (activeTabId === id) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    activeTabId = next?.id ?? null;
  }

  setState({ tabs, activeTabId });
}

export function activateTab(id: string) {
  if (state.tabs.some((t) => t.id === id)) {
    setState({ ...state, activeTabId: id });
  }
}

export function togglePin(id: string) {
  setState({
    ...state,
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
  });
}

export function reorderTabs(fromIndex: number, toIndex: number) {
  const tabs = [...state.tabs];
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  setState({ ...state, tabs });
}

export function getWorkspaceState(): WorkspaceState {
  return state;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(subscribe, getWorkspaceState, getWorkspaceState);
}
