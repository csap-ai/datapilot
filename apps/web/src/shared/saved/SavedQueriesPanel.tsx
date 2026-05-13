import { useEffect, useRef, useState } from 'react';
import { Bookmark, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type SavedQuery } from '@/lib/backend';
import { emitLoadSQL } from '@/lib/editor-events';
import { useConnections } from '@/shared/connections';

export function SavedQueriesPanel() {
  const { activeId, connections } = useConnections();
  const [records, setRecords] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);

  const activeName = connections.find((c) => c.id === activeId)?.name ?? '';

  function reload() {
    if (!activeId || !isDesktop()) {
      setRecords([]);
      return;
    }
    setLoading(true);
    backend
      .listSavedQueries(activeId)
      .then((list) => setRecords(list))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, [activeId]);

  async function handleDelete(id: string) {
    try {
      await backend.deleteSavedQuery(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await backend.renameSavedQuery(id, name);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
    } catch {
      toast.error('重命名失败');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-4">
        <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-dp-accent">Saved</p>
        <h1 className="text-[1.05rem] font-bold">保存的查询</h1>
        {activeName && (
          <p className="mt-0.5 text-[0.78rem] text-dp-text-dimmed truncate">{activeName}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {!activeId ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bookmark size={24} className="text-dp-text-dimmed" />
            <p className="text-[0.82rem] text-dp-text-muted">请先选择一个连接</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={16} className="animate-spin text-dp-text-dimmed" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bookmark size={24} className="text-dp-text-dimmed" />
            <p className="text-[0.82rem] text-dp-text-muted">暂无保存的查询</p>
            <p className="text-[0.76rem] text-dp-text-dimmed">在编辑器中点击"保存"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {records.map((r) => (
              <SavedItem
                key={r.id}
                record={r}
                onLoad={() => emitLoadSQL(r.sql)}
                onDelete={() => handleDelete(r.id)}
                onRename={(name) => handleRename(r.id, name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedItem({
  record,
  onLoad,
  onDelete,
  onRename,
}: {
  record: SavedQuery;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(record.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== record.name) onRename(trimmed);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(record.name);
    setEditing(false);
  }

  return (
    <div
      className="group rounded-lg border border-dp-border bg-dp-surface-raised p-3 transition-colors hover:border-dp-border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onClick={onLoad}
          title="点击加载到编辑器"
        >
          {editing ? (
            <input
              ref={inputRef}
              className="w-full rounded border border-dp-border-accent bg-dp-surface px-1.5 py-0.5 text-[0.82rem] font-semibold text-dp-text-primary focus:outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="mb-1 truncate text-[0.82rem] font-semibold text-dp-text-primary">
              {record.name}
            </p>
          )}
          <pre className={cn(
            'truncate whitespace-nowrap text-[0.74rem] font-mono',
            editing ? 'hidden' : 'text-dp-text-secondary',
          )}>
            {record.sql}
          </pre>
        </button>

        <div className={cn(
          'flex shrink-0 items-center gap-0.5',
          editing ? 'flex' : 'opacity-0 group-hover:opacity-100',
        )}>
          {editing ? (
            <>
              <button
                className="rounded p-1 text-dp-success-muted hover:text-dp-success"
                type="button"
                onClick={commitEdit}
                title="确认"
              >
                <Check size={13} />
              </button>
              <button
                className="rounded p-1 text-dp-text-dimmed hover:text-dp-text-secondary"
                type="button"
                onClick={cancelEdit}
                title="取消"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                className="rounded p-1 text-dp-text-dimmed hover:text-dp-text-secondary"
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit(); }}
                title="重命名"
              >
                <Pencil size={13} />
              </button>
              <button
                className="rounded p-1 text-dp-text-dimmed hover:text-dp-error"
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="删除"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
