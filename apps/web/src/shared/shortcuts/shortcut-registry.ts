import type { Modifier } from './use-shortcut';

export interface ShortcutEntry {
  id: string;
  key: string;
  modifiers: Modifier[];
  label: string;
  group: string;
}

const registry = new Map<string, ShortcutEntry>();

export function registerShortcut(entry: ShortcutEntry) {
  const conflict = findConflict(entry);
  if (conflict) {
    console.warn(
      `Shortcut conflict: "${entry.id}" collides with "${conflict.id}" (${formatShortcut(conflict)})`,
    );
  }
  registry.set(entry.id, entry);
}

export function unregisterShortcut(id: string) {
  registry.delete(id);
}

export function getRegisteredShortcuts(): ShortcutEntry[] {
  return Array.from(registry.values());
}

export function findConflict(entry: ShortcutEntry): ShortcutEntry | undefined {
  const key = fingerprint(entry);
  for (const existing of registry.values()) {
    if (existing.id !== entry.id && fingerprint(existing) === key) {
      return existing;
    }
  }
  return undefined;
}

function fingerprint(entry: Pick<ShortcutEntry, 'key' | 'modifiers'>): string {
  const mods = [...entry.modifiers].sort().join('+');
  return `${mods}:${entry.key.toLowerCase()}`;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function formatShortcut(entry: Pick<ShortcutEntry, 'key' | 'modifiers'>): string {
  const symbols: string[] = entry.modifiers.map((m) => {
    if (m === 'meta' || m === 'ctrl') return isMac ? '⌘' : 'Ctrl';
    if (m === 'alt') return isMac ? '⌥' : 'Alt';
    if (m === 'shift') return isMac ? '⇧' : 'Shift';
    return m;
  });
  symbols.push(entry.key.length === 1 ? entry.key.toUpperCase() : entry.key);
  return symbols.join(isMac ? '' : '+');
}
