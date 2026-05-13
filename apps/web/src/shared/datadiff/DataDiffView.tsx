import { useEffect, useState } from 'react';
import { Loader2, Plus, Minus, Pencil, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type DataDiff, type RowDiff } from '@/lib/backend';
import { useConnections } from '@/shared/connections';

interface Props {
  sourceId: string;
  targetId: string;
  schema: string;
  table: string;
  keyColumn: string;
}

export function DataDiffView({ sourceId, targetId, schema, table, keyColumn }: Props) {
  const { connections } = useConnections();
  const [diff, setDiff] = useState<DataDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srcName = connections.find((c) => c.id === sourceId)?.name ?? sourceId;
  const dstName = connections.find((c) => c.id === targetId)?.name ?? targetId;

  useEffect(() => {
    if (!isDesktop()) return;
    setLoading(true);
    setError(null);
    backend.compareTableData(sourceId, targetId, schema, table, keyColumn, 200)
      .then(setDiff)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [sourceId, targetId, schema, table, keyColumn]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-dp-text-dimmed" /></div>;
  }
  if (error) {
    return <div className="flex h-full items-center justify-center p-6"><p className="text-[0.84rem] text-dp-error">{error}</p></div>;
  }
  if (!diff) return null;

  const empty = diff.onlyInA.length === 0 && diff.onlyInB.length === 0 && diff.changed.length === 0;
  const qualified = schema ? `${schema}.${table}` : table;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-4 py-2.5">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-dp-accent">Data Diff</p>
        <div className="mt-1 flex items-center gap-2 text-[0.84rem]">
          <span className="font-mono text-dp-text-secondary">{srcName}</span>
          <ChevronRight size={12} className="text-dp-text-dimmed" />
          <span className="font-mono text-dp-text-secondary">{dstName}</span>
          <span className="ml-2 rounded bg-dp-surface-raised px-1.5 py-0.5 text-[0.72rem] font-mono text-dp-text-dimmed">{qualified}</span>
          <span className="rounded bg-dp-surface-raised px-1.5 py-0.5 text-[0.72rem] font-mono text-dp-text-dimmed">key: {keyColumn}</span>
          {diff.truncated && <span className="rounded bg-dp-warning-bg px-1.5 py-0.5 text-[0.72rem] font-extrabold uppercase text-dp-warning">已截断</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {empty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[0.86rem] text-dp-text-dimmed">两侧数据一致</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {diff.onlyInB.length > 0 && (
              <Section title="目标新增行" count={diff.onlyInB.length} kind="added">
                <div className="flex flex-col gap-1">
                  {diff.onlyInB.map((r) => <RowCard key={r.key} row={r} columns={diff.columns} />)}
                </div>
              </Section>
            )}
            {diff.onlyInA.length > 0 && (
              <Section title="目标缺失行" count={diff.onlyInA.length} kind="removed">
                <div className="flex flex-col gap-1">
                  {diff.onlyInA.map((r) => <RowCard key={r.key} row={r} columns={diff.columns} />)}
                </div>
              </Section>
            )}
            {diff.changed.length > 0 && (
              <Section title="内容差异" count={diff.changed.length} kind="changed">
                <div className="flex flex-col gap-2">
                  {diff.changed.map((r) => <ChangedRowCard key={r.key} row={r} columns={diff.columns} />)}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, kind, children }: { title: string; count: number; kind: 'added' | 'removed' | 'changed'; children: React.ReactNode }) {
  const color = kind === 'added' ? 'text-dp-success-muted' : kind === 'removed' ? 'text-dp-error' : 'text-dp-warning';
  return (
    <div>
      <p className={cn('mb-2 text-[0.76rem] font-extrabold uppercase tracking-wider', color)}>
        {title} <span className="text-dp-text-dimmed">({count})</span>
      </p>
      {children}
    </div>
  );
}

function RowCard({ row, columns }: { row: RowDiff; columns: string[] }) {
  const data = row.after ?? row.before ?? {};
  const Icon = row.kind === 'added' ? Plus : Minus;
  const cls = row.kind === 'added'
    ? 'border-dp-success/40 bg-dp-success/10'
    : 'border-dp-error/40 bg-dp-error/10';
  return (
    <div className={cn('rounded-md border px-2.5 py-1.5 font-mono text-[0.76rem]', cls)}>
      <div className="flex items-center gap-1.5 text-dp-text-secondary">
        <Icon size={10} />
        <span className="font-bold">{row.key}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-dp-text-dimmed">
        {columns.map((c) => (
          <span key={c}><span className="text-dp-text-muted">{c}:</span> {data[c] ?? ''}</span>
        ))}
      </div>
    </div>
  );
}

function ChangedRowCard({ row, columns }: { row: RowDiff; columns: string[] }) {
  const before = row.before ?? {};
  const after = row.after ?? {};
  return (
    <div className="rounded-lg border border-dp-warning/40 bg-dp-warning-bg/40 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.78rem] font-mono text-dp-text-secondary">
        <Pencil size={10} className="text-dp-warning" />
        <span className="font-bold">{row.key}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {columns.map((c) => {
          const b = before[c] ?? '';
          const a = after[c] ?? '';
          if (b === a) return null;
          return (
            <div key={c} className="flex items-baseline gap-2 font-mono text-[0.74rem]">
              <span className="w-28 shrink-0 truncate text-dp-text-muted">{c}</span>
              <span className="truncate text-dp-error">{b}</span>
              <ChevronRight size={10} className="shrink-0 text-dp-text-dimmed" />
              <span className="truncate text-dp-success-muted">{a}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
