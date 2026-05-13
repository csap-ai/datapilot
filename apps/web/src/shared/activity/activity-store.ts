import { useSyncExternalStore } from 'react';

export type ActivityId = 'connections' | 'search' | 'history' | 'saved' | 'audit' | 'settings';

interface ActivityState {
  active: ActivityId;
}

let state: ActivityState = { active: 'connections' };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function setActivity(id: ActivityId) {
  if (state.active === id) return;
  state = { active: id };
  emit();
}

function getSnapshot(): ActivityState {
  return state;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useActivity(): ActivityState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
