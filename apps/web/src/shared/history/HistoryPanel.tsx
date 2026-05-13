import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type QueryHistory } from '@/lib/backend';
import { useConnections } from '@/shared/connections';

export function HistoryPanel() {
  const { activeId, connections } = useConnections();
  const [records, setRecords] = useState<QueryHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const activeName = connections.find((c) => c.id === activeId)?.name ?? '';

  useEffect(() => {
    if (!activeId || !isDesktop()) {
      setRecords([]);
      return;
    }
    setLoading(true);
    backend
      .getQueryHistory(activeId, 50)
      .then((list) => setRecords(list))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [activeId]);

  function copySQL(sql: string) {
    navigator.clipboard.writeText(sql).then(() => toast.success('已复制到剪贴板'));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-4">
        <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-dp-accent">History</p>
        <h1 className="text-[1.05rem] font-bold">查询历史</h1>
        {activeName && (
          <p className="mt-0.5 text-[0.78rem] text-dp-text-dimmed truncate">{activeName}</p>
        )}
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {!activeId ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock size={24} className="text-dp-text-dimmed" />
            <p className="text-[0.82rem] text-dp-text-muted">请先选择一个连接</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={16} className="animate-spin text-dp-text-dimmed" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock size={24} className="text-dp-text-dimmed" />
            <p className="text-[0.82rem] text-dp-text-muted">暂无查询记录</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {records.map((r) => (
              <HistoryItem key={r.id} record={r} onCopy={() => copySQL(r.sql)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ record, onCopy }: { record: QueryHistory; onCopy: () => void }) {
  const hasError = record.error !== '';
  const time = formatTime(record.createdAt);

  return (
    <div
      className={cn(
        'group rounded-lg border bg-dp-surface-raised p-3 transition-colors hover:border-dp-border-accent',
        hasError ? 'border-dp-error/30' : 'border-dp-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <pre className="mb-2 truncate whitespace-nowrap text-[0.78rem] font-mono text-dp-text-secondary">
            {record.sql}
          </pre>
          <div className="flex items-center gap-3 text-[0.72rem] text-dp-text-dimmed">
            {hasError ? (
              <span className="flex items-center gap-1 text-dp-error">
                <XCircle size={11} />
                失败
              </span>
            ) : (
              <span className="flex items-center gap-1 text-dp-success-muted">
                <CheckCircle2 size={11} />
                {record.rowCount} 行
              </span>
            )}
            <span>{record.durationMs} ms</span>
            <span>{time}</span>
          </div>
          {hasError && (
            <p className="mt-1.5 break-words text-[0.72rem] text-dp-error/80">{record.error}</p>
          )}
        </div>
        <button
          className="shrink-0 rounded p-1 text-dp-text-dimmed opacity-0 transition-opacity hover:text-dp-text-secondary group-hover:opacity-100"
          type="button"
          title="复制 SQL"
          onClick={onCopy}
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
