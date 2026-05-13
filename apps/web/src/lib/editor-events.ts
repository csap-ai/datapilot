type Listener = (sql: string) => void;
const listeners = new Set<Listener>();

export function emitLoadSQL(sql: string) {
  for (const fn of listeners) fn(sql);
}

export function onLoadSQL(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
