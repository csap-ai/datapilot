import { useSyncExternalStore } from 'react';
import { backend, isDesktop, type DataSource } from '@/lib/backend';

export type ConnectionType = 'sqlite' | 'postgres' | 'mysql';

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  filePath: string;
  readOnly: boolean;
}

interface ConnectionState {
  connections: Connection[];
  activeId: string | null;
}

let state: ConnectionState = { connections: [], activeId: null };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function setState(next: ConnectionState) {
  state = next;
  emit();
}

function dataSourceToConnection(ds: DataSource): Connection {
  return {
    id: ds.id,
    name: ds.name,
    type: ds.type as ConnectionType,
    host: ds.host,
    port: ds.port,
    database: ds.database,
    username: ds.username,
    filePath: ds.file_path,
    readOnly: ds.read_only,
  };
}

export async function loadConnections(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const list = await backend.listConnections();
    const connections = list.map(dataSourceToConnection);
    setState({ connections, activeId: connections[0]?.id ?? null });
  } catch {
    // keep empty state
  }
}

export async function addConnection(
  conn: Omit<Connection, 'id'> & { password: string },
): Promise<Connection> {
  if (isDesktop()) {
    const ds = await backend.createConnection({
      name: conn.name,
      type: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password,
      filePath: conn.filePath,
      readOnly: conn.readOnly,
    });
    const created = dataSourceToConnection(ds);
    setState({ connections: [...state.connections, created], activeId: state.activeId ?? created.id });
    return created;
  }
  const created: Connection = { ...conn, id: crypto.randomUUID() };
  setState({ connections: [...state.connections, created], activeId: state.activeId ?? created.id });
  return created;
}

export async function updateConnection(
  conn: Connection & { password: string },
): Promise<void> {
  if (isDesktop()) {
    await backend.updateConnection({
      id: conn.id,
      name: conn.name,
      type: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password,
      filePath: conn.filePath,
      readOnly: conn.readOnly,
    });
  }
  setState({ ...state, connections: state.connections.map((c) => (c.id === conn.id ? conn : c)) });
}

export async function removeConnection(id: string): Promise<void> {
  if (isDesktop()) {
    await backend.deleteConnection(id);
  }
  const conns = state.connections.filter((c) => c.id !== id);
  const activeId = state.activeId === id ? (conns[0]?.id ?? null) : state.activeId;
  setState({ connections: conns, activeId });
}

export function setActiveConnection(id: string) {
  if (state.connections.some((c) => c.id === id)) {
    setState({ ...state, activeId: id });
  }
}

function getSnapshot(): ConnectionState {
  return state;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useConnections(): ConnectionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
