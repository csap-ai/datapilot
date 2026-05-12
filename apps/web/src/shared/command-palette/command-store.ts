import type { Modifier } from '@/shared/shortcuts';

export interface CommandAction {
  id: string;
  label: string;
  group: string;
  shortcut?: { key: string; modifiers: Modifier[] };
  handler: () => void;
}

const commands = new Map<string, CommandAction>();
const listeners = new Set<() => void>();
let snapshot: CommandAction[] = [];

function rebuild() {
  snapshot = Array.from(commands.values());
}

function notify() {
  rebuild();
  for (const fn of listeners) fn();
}

export function registerCommand(action: CommandAction) {
  commands.set(action.id, action);
  notify();
}

export function unregisterCommand(id: string) {
  commands.delete(id);
  notify();
}

export function getCommands(): CommandAction[] {
  return snapshot;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
