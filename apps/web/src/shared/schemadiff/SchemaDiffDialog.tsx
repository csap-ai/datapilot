import { useState } from 'react';
import { X, GitCompare } from 'lucide-react';
import { useConnections } from '@/shared/connections';
import { openTab } from '@/shared/workspace';

interface Props {
  defaultSourceId?: string;
  onClose: () => void;
}

export function SchemaDiffDialog({ defaultSourceId, onClose }: Props) {
  const { connections } = useConnections();
  const [sourceId, setSourceId] = useState(defaultSourceId ?? connections[0]?.id ?? '');
  const [targetId, setTargetId] = useState(connections.find((c) => c.id !== (defaultSourceId ?? connections[0]?.id))?.id ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) return;
    openTab({
      id: `diff-${sourceId}-${targetId}`,
      label: '结构对比',
      type: 'schema-diff',
      meta: { connectionId: sourceId, targetConnectionId: targetId, schema: '', table: '' },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-dp-border px-5 py-3">
            <p className="text-[0.92rem] font-bold">结构对比</p>
            <button type="button" className="text-dp-text-dimmed hover:text-dp-text-secondary" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-5 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">源连接</label>
              <select
                className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.84rem] focus:outline-none focus:border-dp-border-accent"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">目标连接</label>
              <select
                className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.84rem] focus:outline-none focus:border-dp-border-accent"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {sourceId && targetId && sourceId === targetId && (
              <p className="text-[0.74rem] text-dp-warning">源和目标必须是不同连接</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
            <button
              type="button"
              className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-dp-border-accent bg-dp-accent/20 px-4 py-2 text-[0.82rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              disabled={!sourceId || !targetId || sourceId === targetId}
            >
              <GitCompare size={11} />
              对比
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
