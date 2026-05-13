import { useSyncExternalStore } from 'react';

export interface StatusSlot {
  id: string;
  text: string;
  position: 'left' | 'right';
  priority?: number;
  onClick?: () => void;
}

const slots = new Map<string, StatusSlot>();
const listeners = new Set<() => void>();
let snapshot: StatusSlot[] = [];

function rebuild() {
  snapshot = Array.from(slots.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

function emit() {
  rebuild();
  for (const fn of listeners) fn();
}

export function setStatus(slot: StatusSlot) {
  slots.set(slot.id, slot);
  emit();
}

export function removeStatus(id: string) {
  slots.delete(id);
  emit();
}

function getSnapshot(): StatusSlot[] {
  return snapshot;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStatusSlots(): StatusSlot[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
