import { useEffect, useState } from 'react';
import { Loader2, Copy, FileDown, Eye, Database, Key } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type ColumnInfo, type IndexInfo } from '@/lib/backend';
import { downloadText } from '@/lib/exporters';
import { emitLoadSQL } from '@/lib/editor-events';
import type { TabMeta } from '@/shared/workspace';

type SubTab = 'columns' | 'indexes' | 'ddl';

export function MetadataView({ meta }: { meta: TabMeta }) {
  const [tab, setTab] = useState<SubTab>('columns');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [ddl, setDdl] = useState<string>('');
  const [loading, setLoading] = useState<Record<SubTab, boolean>>({ columns: false, indexes: false, ddl: false });

  useEffect(() => {
    if (!isDesktop()) return;
    setColumns([]); setIndexes([]); setDdl('');
    void load('columns');
  }, [meta.connectionId, meta.schema, meta.table]);

  async function load(which: SubTab) {
    setLoading((p) => ({ ...p, [which]: true }));
    try {
      if (which === 'columns') {
        const cs = await backend.getTableColumns(meta.connectionId, meta.schema, meta.table);
        setColumns(cs);
      } else if (which === 'indexes') {
        const ix = await backend.getTableIndexes(meta.connectionId, meta.schema, meta.table);
        setIndexes(ix);
      } else if (which === 'ddl') {
        const d = await backend.generateTableDDL(meta.connectionId, meta.schema, meta.table);
        setDdl(d);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading((p) => ({ ...p, [which]: false }));
    }
  }

  function switchTab(t: SubTab) {
    setTab(t);
    if (t === 'columns' && columns.length === 0) void load('columns');
    if (t === 'indexes' && indexes.length === 0) void load('indexes');
    if (t === 'ddl' && !ddl) void load('ddl');
  }

  function browse() {
    const sql = buildSelectAll(meta.schema, meta.table);
    emitLoadSQL(sql);
    toast.success('已加载到编辑器');
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between border-b border-dp-border px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-dp-accent">Table Inspector</p>
          <h2 className="truncate text-[0.92rem] font-bold">
            {meta.schema && <span className="text-dp-text-dimmed">{meta.schema}.</span>}
            {meta.table}
          </h2>
        </div>
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-dp-border-success bg-dp-success px-3 py-1.5 text-[0.78rem] font-bold text-dp-success-text"
          type="button"
          onClick={browse}
          title="将 SELECT * 加载到编辑器"
        >
          <Eye size={11} />
          浏览数据
        </button>
      </div>

      <div className="shrink-0 flex gap-1 border-b border-dp-border px-3 pb-0 pt-1">
        {([
          { id: 'columns', label: '列' },
          { id: 'indexes', label: '索引' },
          { id: 'ddl', label: 'DDL' },
        ] as { id: SubTab; label: string }[]).map((t) => (
          <button
            key={t.id}
            className={cn(
              'rounded-t-md border-b-2 px-3 py-2 text-[0.78rem] font-semibold transition-colors',
              tab === t.id
                ? 'border-dp-accent text-dp-accent-light'
                : 'border-transparent text-dp-text-dimmed hover:text-dp-text-secondary',
            )}
            type="button"
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'columns' && <ColumnsTab columns={columns} loading={loading.columns} />}
        {tab === 'indexes' && <IndexesTab indexes={indexes} loading={loading.indexes} />}
        {tab === 'ddl' && <DDLTab ddl={ddl} loading={loading.ddl} filename={`${meta.table}.sql`} />}
      </div>
    </div>
  );
}

function ColumnsTab({ columns, loading }: { columns: ColumnInfo[]; loading: boolean }) {
  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>;
  }
  if (columns.length === 0) {
    return <div className="py-10 text-center text-[0.82rem] text-dp-text-dimmed">无列信息</div>;
  }
  return (
    <table className="w-full border-collapse text-[0.82rem]">
      <thead className="sticky top-0 bg-dp-surface-solid">
        <tr>
          {['名称', '类型', '可空', 'PK', '默认值'].map((h) => (
            <th key={h} className="border-b border-dp-border-subtle px-3.5 py-2 text-left text-[0.7rem] font-extrabold uppercase tracking-wider text-dp-blue">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map((c, i) => (
          <tr key={c.name} className={cn(i % 2 === 1 && 'bg-dp-surface-raised/30')}>
            <td className="border-b border-dp-border-subtle px-3.5 py-2 font-mono text-dp-text-primary">
              {c.primaryKey && <Key size={10} className="mr-1 inline text-dp-warning" />}
              {c.name}
            </td>
            <td className="border-b border-dp-border-subtle px-3.5 py-2 font-mono text-[0.78rem] text-dp-text-secondary">{c.type}</td>
            <td className="border-b border-dp-border-subtle px-3.5 py-2 text-dp-text-dimmed">{c.nullable ? '✓' : ''}</td>
            <td className="border-b border-dp-border-subtle px-3.5 py-2 text-dp-text-dimmed">{c.primaryKey ? '✓' : ''}</td>
            <td className="border-b border-dp-border-subtle px-3.5 py-2 font-mono text-[0.78rem] text-dp-text-dimmed">{c.defaultValue || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndexesTab({ indexes, loading }: { indexes: IndexInfo[]; loading: boolean }) {
  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>;
  }
  if (indexes.length === 0) {
    return <div className="py-10 text-center text-[0.82rem] text-dp-text-dimmed">无索引</div>;
  }
  return (
    <div className="p-3 flex flex-col gap-2">
      {indexes.map((idx) => (
        <div key={idx.name} className="rounded-lg border border-dp-border bg-dp-surface-raised p-3">
          <div className="flex items-center gap-2 mb-1">
            <Database size={12} className="text-dp-accent" />
            <span className="font-mono text-[0.84rem] font-semibold text-dp-text-primary">{idx.name}</span>
            {idx.unique && <span className="rounded-full bg-dp-accent/20 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-dp-accent-light">unique</span>}
          </div>
          <p className="font-mono text-[0.78rem] text-dp-text-secondary">
            {idx.columns.join(', ')}
          </p>
        </div>
      ))}
    </div>
  );
}

function DDLTab({ ddl, loading, filename }: { ddl: string; loading: boolean; filename: string }) {
  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>;
  }
  if (!ddl) {
    return <div className="py-10 text-center text-[0.82rem] text-dp-text-dimmed">未加载</div>;
  }
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex items-center gap-2 border-b border-dp-border-subtle px-3 py-2">
        <button
          className="flex items-center gap-1 rounded border border-dp-border px-2 py-1 text-[0.74rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary"
          type="button"
          onClick={() => navigator.clipboard.writeText(ddl).then(() => toast.success('已复制'))}
        >
          <Copy size={11} />
          复制
        </button>
        <button
          className="flex items-center gap-1 rounded border border-dp-border px-2 py-1 text-[0.74rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary"
          type="button"
          onClick={() => downloadText(filename, ddl, 'text/plain;charset=utf-8')}
        >
          <FileDown size={11} />
          下载
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-[0.82rem] text-dp-text-secondary">
        {ddl}
      </pre>
    </div>
  );
}

function buildSelectAll(schema: string, table: string): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  if (schema) return `SELECT * FROM ${q(schema)}.${q(table)} LIMIT 100;`;
  return `SELECT * FROM ${q(table)} LIMIT 100;`;
}
