import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { backend, type DashboardWidget, type ChartType } from '@/lib/backend';
import { useConnections } from '@/shared/connections';

interface Props {
  widget?: DashboardWidget;
  onClose: () => void;
  onSaved: () => void;
}

export function WidgetEditor({ widget, onClose, onSaved }: Props) {
  const { connections } = useConnections();
  const [title, setTitle] = useState(widget?.title ?? '');
  const [connectionId, setConnectionId] = useState(widget?.connectionId ?? connections[0]?.id ?? '');
  const [sql, setSql] = useState(widget?.sql ?? '');
  const [chartType, setChartType] = useState<ChartType>(widget?.chartType ?? 'number');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!widget && !connectionId && connections[0]) setConnectionId(connections[0].id);
  }, [connections, connectionId, widget]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !connectionId || !sql) return;
    setSaving(true);
    try {
      if (widget) {
        await backend.updateDashboardWidget({ ...widget, title, connectionId, sql, chartType });
      } else {
        await backend.createDashboardWidget({
          id: '',
          title,
          connectionId,
          sql,
          chartType,
          position: 0,
          createdAt: '',
          updatedAt: '',
        });
      }
      toast.success(widget ? '已更新' : '已创建');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(`保存失败：${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <form onSubmit={save}>
          <div className="flex items-center justify-between border-b border-dp-border px-5 py-3">
            <p className="text-[0.92rem] font-bold">{widget ? '编辑卡片' : '新建卡片'}</p>
            <button type="button" className="text-dp-text-dimmed hover:text-dp-text-secondary" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-3 px-5 py-5">
            <Field label="标题">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如 用户总数" />
            </Field>
            <Field label="连接">
              <select className={inputCls} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="图表类型">
              <select className={inputCls} value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
                <option value="number">单值 (number)</option>
                <option value="bar">条形图 (bar)</option>
                <option value="line">折线图 (line)</option>
                <option value="table">表格 (table)</option>
              </select>
            </Field>
            <Field label="SQL">
              <textarea
                className={inputCls + ' min-h-[120px] font-mono'}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder={chartTypeHint(chartType)}
              />
            </Field>
            <p className="text-[0.72rem] text-dp-text-dimmed">{chartTypeHint(chartType)}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
            <button type="button" className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary" onClick={onClose}>取消</button>
            <button
              type="submit"
              className="rounded-md border border-dp-border-accent bg-dp-accent/20 px-4 py-2 text-[0.82rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              disabled={saving || !title || !connectionId || !sql}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function chartTypeHint(t: ChartType): string {
  switch (t) {
    case 'number':
      return '返回单值：SELECT COUNT(*) FROM users';
    case 'bar':
      return '返回两列 (label, value)：SELECT status, COUNT(*) FROM orders GROUP BY status';
    case 'line':
      return '返回两列 (x, y)：SELECT date, count FROM stats ORDER BY date';
    case 'table':
      return '直接展示查询结果，最多 100 行';
  }
}

const inputCls = 'w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.84rem] focus:outline-none focus:border-dp-border-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">{label}</label>
      {children}
    </div>
  );
}
