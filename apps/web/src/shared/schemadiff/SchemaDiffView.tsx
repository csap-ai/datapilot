import { useEffect, useState } from 'react';
import { Loader2, Plus, Minus, Pencil, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  backend, isDesktop,
  type SchemaDiff, type TableDiff, type ColumnDiff, type IndexDiff, type ColumnInfo, type IndexInfo,
} from '@/lib/backend';
import { useConnections } from '@/shared/connections';

interface Props {
  sourceId: string;
  targetId: string;
}

export function SchemaDiffView({ sourceId, targetId }: Props) {
  const { connections } = useConnections();
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srcName = connections.find((c) => c.id === sourceId)?.name ?? sourceId;
  const dstName = connections.find((c) => c.id === targetId)?.name ?? targetId;

  useEffect(() => {
    if (!isDesktop()) return;
    setLoading(true);
    setError(null);
    backend.compareSchemas(sourceId, targetId)
      .then(setDiff)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [sourceId, targetId]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-dp-text-dimmed" /></div>;
  }
  if (error) {
    return <div className="flex h-full items-center justify-center p-6"><p className="text-[0.84rem] text-dp-error">{error}</p></div>;
  }
  if (!diff) return null;

  const empty = diff.tablesOnlyInA.length === 0 && diff.tablesOnlyInB.length === 0 && diff.tablesChanged.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-4 py-2.5">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-dp-accent">Schema Diff</p>
        <div className="mt-1 flex items-center gap-2 text-[0.84rem]">
          <span className="font-mono text-dp-text-secondary">{srcName}</span>
          <ChevronRight size={12} className="text-dp-text-dimmed" />
          <span className="font-mono text-dp-text-secondary">{dstName}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {empty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[0.86rem] text-dp-text-dimmed">两个连接的结构一致</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Only in B (added in target) */}
            {diff.tablesOnlyInB.length > 0 && (
              <Section title="目标新增表" count={diff.tablesOnlyInB.length} kind="added">
                <div className="flex flex-wrap gap-1.5">
                  {diff.tablesOnlyInB.map((t) => (
                    <TableChip key={qualified(t)} schema={t.schema} name={t.name} kind="added" />
                  ))}
                </div>
              </Section>
            )}

            {/* Only in A (removed in target) */}
            {diff.tablesOnlyInA.length > 0 && (
              <Section title="目标缺失表" count={diff.tablesOnlyInA.length} kind="removed">
                <div className="flex flex-wrap gap-1.5">
                  {diff.tablesOnlyInA.map((t) => (
                    <TableChip key={qualified(t)} schema={t.schema} name={t.name} kind="removed" />
                  ))}
                </div>
              </Section>
            )}

            {/* Changed tables */}
            {diff.tablesChanged.length > 0 && (
              <Section title="结构差异" count={diff.tablesChanged.length} kind="changed">
                <div className="flex flex-col gap-2">
                  {diff.tablesChanged.map((td) => (
                    <TableDiffCard key={qualified(td)} diff={td} />
                  ))}
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

function TableChip({ schema, name, kind }: { schema: string; name: string; kind: 'added' | 'removed' }) {
  const Icon = kind === 'added' ? Plus : Minus;
  const cls = kind === 'added'
    ? 'border-dp-success/40 bg-dp-success/10 text-dp-success-muted'
    : 'border-dp-error/40 bg-dp-error/10 text-dp-error';
  return (
    <span className={cn('flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.78rem] font-mono', cls)}>
      <Icon size={10} />
      {schema && <span className="text-dp-text-dimmed">{schema}.</span>}
      {name}
    </span>
  );
}

function TableDiffCard({ diff }: { diff: TableDiff }) {
  return (
    <div className="rounded-lg border border-dp-border bg-dp-surface-raised p-3">
      <p className="mb-2 font-mono text-[0.84rem] font-bold">
        {diff.schema && <span className="text-dp-text-dimmed">{diff.schema}.</span>}
        {diff.name}
      </p>
      {diff.columnDiffs.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">列</p>
          <div className="flex flex-col gap-0.5">
            {diff.columnDiffs.map((c) => <ColumnDiffRow key={c.name} diff={c} />)}
          </div>
        </div>
      )}
      {diff.indexDiffs.length > 0 && (
        <div>
          <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">索引</p>
          <div className="flex flex-col gap-0.5">
            {diff.indexDiffs.map((i) => <IndexDiffRow key={i.name} diff={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnDiffRow({ diff }: { diff: ColumnDiff }) {
  const Icon = diff.kind === 'added' ? Plus : diff.kind === 'removed' ? Minus : Pencil;
  const color = diff.kind === 'added' ? 'text-dp-success-muted' : diff.kind === 'removed' ? 'text-dp-error' : 'text-dp-warning';
  return (
    <div className={cn('flex items-baseline gap-2 font-mono text-[0.76rem]', color)}>
      <Icon size={10} className="shrink-0" />
      <span className="text-dp-text-primary">{diff.name}</span>
      {diff.kind === 'changed' && diff.before && diff.after && (
        <span className="text-dp-text-dimmed truncate">
          {colSummary(diff.before)} → {colSummary(diff.after)}
        </span>
      )}
      {diff.kind !== 'changed' && (
        <span className="text-dp-text-dimmed">
          {colSummary(diff.before ?? diff.after!)}
        </span>
      )}
    </div>
  );
}

function IndexDiffRow({ diff }: { diff: IndexDiff }) {
  const Icon = diff.kind === 'added' ? Plus : diff.kind === 'removed' ? Minus : Pencil;
  const color = diff.kind === 'added' ? 'text-dp-success-muted' : diff.kind === 'removed' ? 'text-dp-error' : 'text-dp-warning';
  return (
    <div className={cn('flex items-baseline gap-2 font-mono text-[0.76rem]', color)}>
      <Icon size={10} className="shrink-0" />
      <span className="text-dp-text-primary">{diff.name}</span>
      {diff.kind === 'changed' && diff.before && diff.after && (
        <span className="text-dp-text-dimmed truncate">
          {idxSummary(diff.before)} → {idxSummary(diff.after)}
        </span>
      )}
      {diff.kind !== 'changed' && (
        <span className="text-dp-text-dimmed">{idxSummary(diff.before ?? diff.after!)}</span>
      )}
    </div>
  );
}

function colSummary(c: ColumnInfo): string {
  const parts = [c.type];
  if (!c.nullable) parts.push('NOT NULL');
  if (c.primaryKey) parts.push('PK');
  if (c.defaultValue) parts.push('DEFAULT ' + c.defaultValue);
  return parts.join(' ');
}

function idxSummary(i: IndexInfo): string {
  return (i.unique ? 'UNIQUE ' : '') + '(' + i.columns.join(', ') + ')';
}

function qualified(t: { schema: string; name: string }): string {
  return t.schema ? `${t.schema}.${t.name}` : t.name;
}
