import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, RefreshCw, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { backend, isDesktop, type DashboardWidget, type QueryResult } from '@/lib/backend';
import { useConnections } from '@/shared/connections';
import { BarChart, LineChart, NumberChart, TableChart } from './charts';
import { WidgetEditor } from './WidgetEditor';

export function DashboardView() {
  const { connections } = useConnections();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<DashboardWidget | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const runWidget = useCallback(async (id: string) => {
    setLoading((l) => ({ ...l, [id]: true }));
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      const r = await backend.runDashboardWidget(id);
      setResults((rs) => ({ ...rs, [id]: r }));
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: String(err) }));
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isDesktop()) return;
    setListLoading(true);
    try {
      const list = await backend.listDashboardWidgets();
      setWidgets(list);
      for (const w of list) {
        runWidget(w.id);
      }
    } catch (err) {
      toast.error(`加载失败：${String(err)}`);
    } finally {
      setListLoading(false);
    }
  }, [runWidget]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onDelete(w: DashboardWidget) {
    if (!confirm(`删除卡片 "${w.title}"?`)) return;
    try {
      await backend.deleteDashboardWidget(w.id);
      toast.success('已删除');
      refresh();
    } catch (err) {
      toast.error(`删除失败：${String(err)}`);
    }
  }

  function openNew() { setEditing(undefined); setEditorOpen(true); }
  function openEdit(w: DashboardWidget) { setEditing(w); setEditorOpen(true); }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-dp-accent">Dashboard</p>
            <p className="mt-0.5 text-[0.84rem] font-bold">{widgets.length} 个卡片</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-dp-border bg-dp-surface-solid px-2.5 py-1.5 text-[0.78rem] font-semibold text-dp-text-secondary hover:border-dp-border-accent"
              onClick={refresh}
              disabled={listLoading}
            >
              <RefreshCw size={11} className={listLoading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-dp-border-accent bg-dp-accent/20 px-2.5 py-1.5 text-[0.78rem] font-bold text-dp-accent-light hover:bg-dp-accent/30"
              onClick={openNew}
            >
              <Plus size={11} />
              新建卡片
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {widgets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <LayoutDashboard size={32} className="text-dp-text-dimmed" />
            <p className="text-[0.86rem] text-dp-text-muted">还没有卡片</p>
            <button
              type="button"
              className="rounded-md border border-dp-border-accent bg-dp-accent-hover px-3 py-2 text-[0.82rem] font-semibold text-dp-accent-light"
              onClick={openNew}
            >
              新建第一个卡片
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {widgets.map((w) => (
              <WidgetCard
                key={w.id}
                widget={w}
                result={results[w.id]}
                error={errors[w.id]}
                loading={loading[w.id]}
                connectionName={connections.find((c) => c.id === w.connectionId)?.name ?? w.connectionId}
                onRefresh={() => runWidget(w.id)}
                onEdit={() => openEdit(w)}
                onDelete={() => onDelete(w)}
              />
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <WidgetEditor widget={editing} onClose={() => setEditorOpen(false)} onSaved={refresh} />
      )}
    </div>
  );
}

function WidgetCard({
  widget, result, error, loading, connectionName, onRefresh, onEdit, onDelete,
}: {
  widget: DashboardWidget;
  result?: QueryResult;
  error?: string;
  loading?: boolean;
  connectionName: string;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-[260px] flex-col overflow-hidden rounded-lg border border-dp-border bg-dp-surface-raised">
      <div className="shrink-0 border-b border-dp-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.86rem] font-bold">{widget.title}</p>
            <p className="truncate text-[0.7rem] text-dp-text-dimmed">{connectionName} · {widget.chartType}</p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <IconBtn title="刷新" onClick={onRefresh}><RefreshCw size={11} className={loading ? 'animate-spin' : ''} /></IconBtn>
            <IconBtn title="编辑" onClick={onEdit}><Pencil size={11} /></IconBtn>
            <IconBtn title="删除" onClick={onDelete}><Trash2 size={11} /></IconBtn>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {loading && !result ? (
          <div className="flex h-full items-center justify-center"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-3"><p className="text-[0.76rem] text-dp-error">{error}</p></div>
        ) : result ? (
          renderChart(widget.chartType, result)
        ) : (
          <div className="flex h-full items-center justify-center"><p className="text-[0.76rem] text-dp-text-dimmed">未运行</p></div>
        )}
      </div>
    </div>
  );
}

function renderChart(type: DashboardWidget['chartType'], result: QueryResult) {
  switch (type) {
    case 'number': return <NumberChart result={result} />;
    case 'bar': return <BarChart result={result} />;
    case 'line': return <LineChart result={result} />;
    case 'table': return <TableChart result={result} />;
  }
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="rounded p-1 text-dp-text-dimmed hover:bg-dp-surface-overlay hover:text-dp-text-secondary"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
