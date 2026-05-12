import { useSyncExternalStore } from 'react';

let currentSQL = '';
const listeners = new Set<() => void>();

export function setCurrentSQL(sql: string) {
  currentSQL = sql;
  for (const fn of listeners) fn();
}

function getSnapshot() {
  return currentSQL;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCurrentSQL(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
