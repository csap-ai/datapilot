import { useState } from 'react';
import { Database, Plus, Pencil, Trash2, ChevronDown, BookText, GitBranch, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ObjectTree } from '@/shared/tree';
import { backend, isDesktop } from '@/lib/backend';
import { downloadText } from '@/lib/exporters';
import { openTab } from '@/shared/workspace';
import {
  type Connection,
  removeConnection,
  setActiveConnection,
  useConnections,
} from './connection-store';
import { ConnectionDialog } from './ConnectionDialog';
import { SchemaDiffDialog } from '@/shared/schemadiff';

export function ConnectionsPanel() {
  const { connections, activeId } = useConnections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | undefined>(undefined);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffSource, setDiffSource] = useState<string | undefined>(undefined);

  function openNew() { setEditing(undefined); setDialogOpen(true); }
  function openEdit(conn: Connection) { setEditing(conn); setDialogOpen(true); }

  async function onDelete(conn: Connection) {
    await removeConnection(conn.id);
    toast.success(`已删除连接 ${conn.name}`);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-dp-accent">Connections</p>
          <h1 className="text-[1.05rem] font-bold">数据资源</h1>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-md border border-dp-border bg-dp-surface-solid px-2.5 py-1.5 text-[0.78rem] font-semibold text-dp-text-secondary hover:border-dp-border-accent hover:text-dp-text"
          type="button"
          onClick={openNew}
        >
          <Plus size={13} />
          新建
        </button>
      </div>

      {/* Search */}
      <label className="flex items-center gap-2 rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-dp-text-dimmed">
        <span className="text-[0.72rem]">⌘K</span>
        <input
          className="w-full border-0 bg-transparent text-[0.86rem] text-dp-text-secondary outline-none placeholder:text-dp-text-dimmed"
          placeholder="搜索连接、库、表"
        />
      </label>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Database size={28} className="text-dp-text-dimmed" />
            <p className="text-[0.84rem] text-dp-text-muted">还没有连接</p>
            <button
              className="rounded-md border border-dp-border-accent bg-dp-accent-hover px-3 py-2 text-[0.82rem] font-semibold text-dp-accent-light"
              type="button"
              onClick={openNew}
            >
              新建连接
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {connections.map((conn) => (
              <div key={conn.id}>
                <ConnectionItem
                  conn={conn}
                  active={conn.id === activeId}
                  onActivate={() => setActiveConnection(conn.id)}
                  onEdit={() => openEdit(conn)}
                  onDelete={() => onDelete(conn)}
                />
                {conn.id === activeId && (
                  <div className="mt-1 rounded-b-lg border border-t-0 border-dp-border-accent bg-dp-surface-raised/60">
                    <div className="flex items-center justify-between gap-1.5 px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-dp-text-dimmed">
                      <span className="flex items-center gap-1.5">
                        <ChevronDown size={11} />
                        对象树
                      </span>
                      <div className="flex gap-1">
                        <button
                          className="flex items-center gap-1 normal-case tracking-normal rounded border border-dp-border px-1.5 py-0.5 text-[0.68rem] font-semibold hover:border-dp-border-accent hover:text-dp-text-secondary"
                          type="button"
                          title="打开 ER 图"
                          onClick={() => openTab({
                            id: `er-${conn.id}`,
                            label: `${conn.name} ER`,
                            type: 'er-diagram',
                            meta: { connectionId: conn.id, schema: '', table: '' },
                          })}
                        >
                          <GitBranch size={10} />
                          ER
                        </button>
                        <button
                          className="flex items-center gap-1 normal-case tracking-normal rounded border border-dp-border px-1.5 py-0.5 text-[0.68rem] font-semibold hover:border-dp-border-accent hover:text-dp-text-secondary"
                          type="button"
                          title="结构对比"
                          onClick={() => { setDiffSource(conn.id); setDiffOpen(true); }}
                        >
                          <GitCompare size={10} />
                          对比
                        </button>
                        <button
                          className="flex items-center gap-1 normal-case tracking-normal rounded border border-dp-border px-1.5 py-0.5 text-[0.68rem] font-semibold hover:border-dp-border-accent hover:text-dp-text-secondary"
                          type="button"
                          title="导出数据字典 (Markdown)"
                          onClick={async () => {
                            if (!isDesktop()) return;
                            try {
                              const md = await backend.generateDataDictionary(conn.id);
                              downloadText(`${conn.name}_dictionary.md`, md, 'text/markdown;charset=utf-8');
                              toast.success('已导出数据字典');
                            } catch {
                              toast.error('导出失败');
                            }
                          }}
                        >
                          <BookText size={10} />
                          字典
                        </button>
                      </div>
                    </div>
                    <ObjectTree connectionId={activeId!} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <ConnectionDialog connection={editing} onClose={() => setDialogOpen(false)} />
      )}
      {diffOpen && (
        <SchemaDiffDialog defaultSourceId={diffSource} onClose={() => setDiffOpen(false)} />
      )}
    </div>
  );
}

function ConnectionItem({
  conn,
  active,
  onActivate,
  onEdit,
  onDelete,
}: {
  conn: Connection;
  active: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group cursor-pointer rounded-lg border p-3 transition-colors',
        active
          ? 'border-dp-border-accent bg-dp-accent-hover'
          : 'border-dp-border bg-dp-surface-raised hover:border-dp-border-accent hover:bg-dp-accent-hover/50',
      )}
      onClick={onActivate}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="truncate text-[0.88rem]">{conn.name}</strong>
            <span className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[0.64rem] font-extrabold uppercase',
              conn.type === 'sqlite'
                ? 'bg-dp-success/16 text-dp-success-muted'
                : conn.type === 'postgres'
                  ? 'bg-dp-accent/16 text-dp-accent-light'
                  : 'bg-amber-500/16 text-dp-warning-muted',
            )}>
              {conn.type}
            </span>
            {conn.readOnly && (
              <span className="shrink-0 rounded-full bg-dp-warning-bg px-1.5 py-0.5 text-[0.64rem] font-extrabold uppercase text-dp-warning">ro</span>
            )}
          </div>
          <p className="mt-1 truncate text-[0.78rem] text-dp-text-dimmed">
            {conn.type === 'sqlite' ? conn.filePath || '—' : `${conn.host}:${conn.port}/${conn.database}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="rounded p-1 text-dp-text-dimmed hover:text-dp-text-secondary"
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil size={13} />
          </button>
          <button
            className="rounded p-1 text-dp-text-dimmed hover:text-dp-error"
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
