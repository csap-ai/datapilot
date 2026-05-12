import { useEffect, useState } from 'react';
import { X, GitCompare } from 'lucide-react';
import { backend, isDesktop, type ColumnInfo } from '@/lib/backend';
import { useConnections } from '@/shared/connections';
import { openTab } from '@/shared/workspace';

interface Props {
  defaultSourceId?: string;
  defaultSchema?: string;
  defaultTable?: string;
  onClose: () => void;
}

export function DataDiffDialog({ defaultSourceId, defaultSchema, defaultTable, onClose }: Props) {
  const { connections } = useConnections();
  const [sourceId, setSourceId] = useState(defaultSourceId ?? connections[0]?.id ?? '');
  const [targetId, setTargetId] = useState(connections.find((c) => c.id !== (defaultSourceId ?? connections[0]?.id))?.id ?? '');
  const [schema, setSchema] = useState(defaultSchema ?? '');
  const [table, setTable] = useState(defaultTable ?? '');
  const [keyColumn, setKeyColumn] = useState('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);

  useEffect(() => {
    if (!isDesktop() || !sourceId || !table) {
      setColumns([]);
      return;
    }
    backend.getTableColumns(sourceId, schema, table)
      .then((cols) => {
        setColumns(cols);
        const pk = cols.find((c) => c.primaryKey);
        if (pk) setKeyColumn((prev) => prev || pk.name);
        else if (cols[0]) setKeyColumn((prev) => prev || cols[0].name);
      })
      .catch(() => setColumns([]));
  }, [sourceId, schema, table]);

  const sameConn = sourceId && targetId && sourceId === targetId;
  const ready = sourceId && targetId && table && keyColumn && !sameConn;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    openTab({
      id: `data-diff-${sourceId}-${targetId}-${schema}-${table}`,
      label: `数据对比·${table}`,
      type: 'data-diff',
      meta: { connectionId: sourceId, targetConnectionId: targetId, schema, table, keyColumn },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-dp-border px-5 py-3">
            <p className="text-[0.92rem] font-bold">数据对比</p>
            <button type="button" className="text-dp-text-dimmed hover:text-dp-text-secondary" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-5 flex flex-col gap-3">
            <Field label="源连接">
              <select className={selectCls} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="目标连接">
              <select className={selectCls} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Schema (可选)">
              <input className={inputCls} value={schema} onChange={(e) => setSchema(e.target.value)} placeholder="例如 public" />
            </Field>
            <Field label="表名">
              <input className={inputCls} value={table} onChange={(e) => setTable(e.target.value)} placeholder="例如 users" />
            </Field>
            <Field label="主键列">
              {columns.length > 0 ? (
                <select className={selectCls} value={keyColumn} onChange={(e) => setKeyColumn(e.target.value)}>
                  {columns.map((c) => <option key={c.name} value={c.name}>{c.name}{c.primaryKey ? ' (PK)' : ''}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={keyColumn} onChange={(e) => setKeyColumn(e.target.value)} placeholder="例如 id" />
              )}
            </Field>
            {sameConn && <p className="text-[0.74rem] text-dp-warning">源和目标必须是不同连接</p>}
            <p className="text-[0.72rem] text-dp-text-dimmed">每侧最多读取 200 行，超过会标记"已截断"</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
            <button type="button" className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary" onClick={onClose}>取消</button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-dp-border-accent bg-dp-accent/20 px-4 py-2 text-[0.82rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              disabled={!ready}
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

const inputCls = 'w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.84rem] focus:outline-none focus:border-dp-border-accent';
const selectCls = inputCls;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">{label}</label>
      {children}
    </div>
  );
}
