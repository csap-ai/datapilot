import { useEffect, useRef, useState } from 'react';
import {
  Shield, XCircle, CheckCircle2, AlertTriangle, Loader2,
  Download, Trash2, Plus, ToggleLeft, ToggleRight,
  Plug, Zap, Archive, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  backend, isDesktop,
  type SQLAuditEvent, type SQLAuditFilter, type AIAuditEvent,
  type ConnectionPolicy, type SQLPolicy,
  type DriverInfo, type ProbeResult,
  type BackupInfo,
} from '@/lib/backend';
import { useConnections } from '@/shared/connections';

type Tab = 'sql' | 'ai' | 'policy' | 'rules' | 'drivers' | 'archive';

export function AuditPanel() {
  const [tab, setTab] = useState<Tab>('sql');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-4">
        <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-dp-accent">Audit</p>
        <h1 className="text-[1.05rem] font-bold">审计与策略</h1>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-0.5 border-b border-dp-border px-3 pb-0">
        {([
          { id: 'sql', label: 'SQL 审计' },
          { id: 'ai', label: 'AI 日志' },
          { id: 'policy', label: '连接策略' },
          { id: 'rules', label: 'SQL 策略' },
          { id: 'drivers', label: '驱动' },
          { id: 'archive', label: '备份归档' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            className={cn(
              'rounded-t-md border-b-2 px-2.5 py-2 text-[0.72rem] font-semibold transition-colors',
              tab === t.id
                ? 'border-dp-accent text-dp-accent-light'
                : 'border-transparent text-dp-text-dimmed hover:text-dp-text-secondary',
            )}
            type="button"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'sql' && <SQLAuditTab />}
        {tab === 'ai' && <AIAuditTab />}
        {tab === 'policy' && <ConnectionPolicyTab />}
        {tab === 'rules' && <SQLPolicyTab />}
        {tab === 'drivers' && <DriversTab />}
        {tab === 'archive' && <ArchiveTab />}
      </div>
    </div>
  );
}

// ─── SQL Audit Tab ────────────────────────────────────────────────────────────

function SQLAuditTab() {
  const { connections, activeId } = useConnections();
  const [connFilter, setConnFilter] = useState('');
  const [errorOnly, setErrorOnly] = useState(false);
  const [events, setEvents] = useState<SQLAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  function load() {
    if (!isDesktop()) return;
    setLoading(true);
    const f: SQLAuditFilter = { connectionId: connFilter, errorOnly, limit: 100 };
    backend.getSQLAuditLog(f)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [connFilter, errorOnly]);

  async function exportCSV() {
    if (!isDesktop()) return;
    try {
      const csv = await backend.exportSQLAuditCSV({ connectionId: connFilter, errorOnly, limit: 1000 });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sql_audit_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('导出失败');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filters */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-dp-border">
        <select
          className="flex-1 rounded-md border border-dp-border bg-dp-surface px-2 py-1.5 text-[0.76rem] text-dp-text-primary focus:outline-none"
          value={connFilter}
          onChange={(e) => setConnFilter(e.target.value)}
        >
          <option value="">全部连接</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          className={cn(
            'shrink-0 rounded-md border px-2 py-1.5 text-[0.72rem] font-semibold transition-colors',
            errorOnly
              ? 'border-dp-error/60 bg-dp-error/15 text-dp-error'
              : 'border-dp-border text-dp-text-dimmed hover:text-dp-text-secondary',
          )}
          type="button"
          onClick={() => setErrorOnly((v) => !v)}
        >
          仅失败
        </button>
        <button
          className="shrink-0 rounded-md border border-dp-border p-1.5 text-dp-text-dimmed hover:text-dp-text-secondary"
          type="button"
          title="导出 CSV"
          onClick={exportCSV}
        >
          <Download size={13} />
        </button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={16} className="animate-spin text-dp-text-dimmed" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Shield size={22} className="text-dp-text-dimmed" />
            <p className="text-[0.8rem] text-dp-text-muted">暂无审计记录</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {events.map((e) => <SQLAuditRow key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function SQLAuditRow({ event: e }: { event: SQLAuditEvent }) {
  const hasError = e.error !== '';
  const riskColor = e.riskLevel === 'danger' ? 'text-dp-error' : e.riskLevel === 'warning' ? 'text-dp-warning' : 'text-dp-success-muted';

  return (
    <div className={cn(
      'rounded-lg border bg-dp-surface-raised p-2.5',
      hasError ? 'border-dp-error/30' : 'border-dp-border',
    )}>
      <pre className="mb-1.5 truncate whitespace-nowrap font-mono text-[0.74rem] text-dp-text-secondary">
        {e.sql}
      </pre>
      <div className="flex items-center gap-2.5 text-[0.68rem] text-dp-text-dimmed">
        {hasError
          ? <span className="flex items-center gap-0.5 text-dp-error"><XCircle size={10} />失败</span>
          : <span className={cn('flex items-center gap-0.5', riskColor)}><CheckCircle2 size={10} />{e.rowsAffected} 行</span>
        }
        <span>{e.durationMs} ms</span>
        {e.connectionName && <span className="truncate">{e.connectionName}</span>}
        <span className="ml-auto">{formatTime(e.createdAt)}</span>
      </div>
      {hasError && <p className="mt-1 truncate text-[0.68rem] text-dp-error/80">{e.error}</p>}
    </div>
  );
}

// ─── AI Audit Tab ─────────────────────────────────────────────────────────────

function AIAuditTab() {
  const [events, setEvents] = useState<AIAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    setLoading(true);
    backend.getAIAuditLog(100)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-0 h-full overflow-auto px-3 pb-3 pt-2">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={16} className="animate-spin text-dp-text-dimmed" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Shield size={22} className="text-dp-text-dimmed" />
          <p className="text-[0.8rem] text-dp-text-muted">暂无 AI 请求记录</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {events.map((e) => (
            <div key={e.id} className={cn(
              'rounded-lg border bg-dp-surface-raised p-2.5',
              e.error ? 'border-dp-error/30' : 'border-dp-border',
            )}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[0.78rem] text-dp-text-primary">{actionLabel(e.action)}</span>
                <span className="text-[0.68rem] text-dp-text-dimmed">{e.durationMs} ms</span>
              </div>
              <div className="mt-1 flex gap-2 text-[0.68rem] text-dp-text-dimmed">
                <span>{e.provider} / {e.model}</span>
                <span className="ml-auto">{formatTime(e.createdAt)}</span>
              </div>
              {e.error && <p className="mt-1 truncate text-[0.68rem] text-dp-error/80">{e.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Connection Policy Tab ────────────────────────────────────────────────────

function ConnectionPolicyTab() {
  const { connections } = useConnections();
  const [policies, setPolicies] = useState<Record<string, ConnectionPolicy>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isDesktop() || connections.length === 0) return;
    setLoading(true);
    Promise.all(connections.map((c) => backend.getConnectionPolicy(c.id)))
      .then((list) => {
        const map: Record<string, ConnectionPolicy> = {};
        list.forEach((p) => { map[p.connectionId] = p; });
        setPolicies(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [connections.length]);

  async function toggle(connectionId: string, field: keyof Pick<ConnectionPolicy, 'allowDdl' | 'allowDml' | 'allowExport'>) {
    const current = policies[connectionId] ?? { connectionId, allowDdl: true, allowDml: true, allowExport: true, updatedAt: '' };
    const updated = { ...current, [field]: !current[field] };
    try {
      await backend.setConnectionPolicy(updated);
      setPolicies((prev) => ({ ...prev, [connectionId]: updated }));
    } catch {
      toast.error('保存失败');
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>;
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center px-3">
        <Shield size={22} className="text-dp-text-dimmed" />
        <p className="text-[0.8rem] text-dp-text-muted">暂无连接</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full px-3 pb-3 pt-2">
      <div className="flex flex-col gap-2">
        {connections.map((c) => {
          const p = policies[c.id] ?? { allowDdl: true, allowDml: true, allowExport: true };
          return (
            <div key={c.id} className="rounded-lg border border-dp-border bg-dp-surface-raised p-3">
              <p className="mb-2 truncate text-[0.8rem] font-semibold text-dp-text-primary">{c.name}</p>
              <div className="flex flex-col gap-1.5">
                {([
                  { field: 'allowDdl', label: '允许 DDL（建表/删表/改结构）' },
                  { field: 'allowDml', label: '允许 DML（增删改）' },
                  { field: 'allowExport', label: '允许导出' },
                ] as { field: keyof Pick<ConnectionPolicy, 'allowDdl' | 'allowDml' | 'allowExport'>; label: string }[]).map(({ field, label }) => (
                  <button
                    key={field}
                    className="flex items-center justify-between gap-2 text-[0.74rem] text-dp-text-secondary hover:text-dp-text-primary"
                    type="button"
                    onClick={() => toggle(c.id, field)}
                  >
                    <span>{label}</span>
                    {p[field]
                      ? <ToggleRight size={18} className="shrink-0 text-dp-success-muted" />
                      : <ToggleLeft size={18} className="shrink-0 text-dp-text-dimmed" />
                    }
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SQL Policy Tab ───────────────────────────────────────────────────────────

function SQLPolicyTab() {
  const [policies, setPolicies] = useState<SQLPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    if (!isDesktop()) return;
    setLoading(true);
    backend.listSQLPolicies()
      .then(setPolicies)
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await backend.toggleSQLPolicy(id, !enabled);
      setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !enabled } : p));
    } catch {
      toast.error('操作失败');
    }
  }

  async function handleDelete(id: number) {
    try {
      await backend.deleteSQLPolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  }

  async function handleAdd(pattern: string, level: string, message: string) {
    try {
      const p = await backend.createSQLPolicy(pattern, level, message);
      setPolicies((prev) => [...prev, p]);
      setShowAdd(false);
      toast.success('已添加');
    } catch {
      toast.error('添加失败');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-dp-border">
        <p className="text-[0.72rem] text-dp-text-dimmed">自定义风险规则</p>
        <button
          className="flex items-center gap-1 rounded-md border border-dp-border px-2 py-1.5 text-[0.72rem] font-semibold text-dp-text-dimmed hover:border-dp-border-accent hover:text-dp-text-secondary"
          type="button"
          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus size={11} />
          添加
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-2">
        {showAdd && <AddPolicyForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-dp-text-dimmed" />
          </div>
        ) : policies.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertTriangle size={22} className="text-dp-text-dimmed" />
            <p className="text-[0.8rem] text-dp-text-muted">暂无自定义规则</p>
            <p className="text-[0.74rem] text-dp-text-dimmed">内置规则仍然生效</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mt-1">
            {policies.map((p) => (
              <div key={p.id} className={cn(
                'rounded-lg border bg-dp-surface-raised p-2.5',
                p.enabled ? 'border-dp-border' : 'border-dp-border opacity-50',
              )}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase',
                        p.level === 'danger' ? 'bg-dp-error/20 text-dp-error' : 'bg-dp-warning/20 text-dp-warning',
                      )}>
                        {p.level}
                      </span>
                      <code className="font-mono text-[0.74rem] text-dp-text-secondary">{p.pattern}</code>
                    </div>
                    <p className="text-[0.72rem] text-dp-text-dimmed">{p.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="rounded p-1 text-dp-text-dimmed hover:text-dp-text-secondary"
                      type="button"
                      onClick={() => handleToggle(p.id, p.enabled)}
                      title={p.enabled ? '禁用' : '启用'}
                    >
                      {p.enabled
                        ? <ToggleRight size={15} className="text-dp-success-muted" />
                        : <ToggleLeft size={15} />
                      }
                    </button>
                    <button
                      className="rounded p-1 text-dp-text-dimmed hover:text-dp-error"
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddPolicyForm({ onAdd, onCancel }: { onAdd: (p: string, l: string, m: string) => void; onCancel: () => void }) {
  const [pattern, setPattern] = useState('');
  const [level, setLevel] = useState('warning');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim() || !message.trim()) return;
    onAdd(pattern.trim(), level, message.trim());
  }

  return (
    <form onSubmit={submit} className="mb-3 rounded-lg border border-dp-border-accent bg-dp-surface-raised p-3 flex flex-col gap-2">
      <input
        ref={inputRef}
        className="rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 font-mono text-[0.78rem] placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
        placeholder="关键字，如：TRUNCATE"
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
      />
      <select
        className="rounded-md border border-dp-border bg-dp-surface px-2 py-1.5 text-[0.78rem] focus:outline-none"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
      >
        <option value="warning">Warning（警告）</option>
        <option value="danger">Danger（危险）</option>
      </select>
      <input
        className="rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.78rem] placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
        placeholder="提示消息"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex gap-2 justify-end">
        <button className="text-[0.76rem] text-dp-text-muted hover:text-dp-text-secondary" type="button" onClick={onCancel}>取消</button>
        <button
          className="rounded-md border border-dp-border-accent bg-dp-accent/20 px-3 py-1.5 text-[0.76rem] font-bold text-dp-accent-light disabled:opacity-40"
          type="submit"
          disabled={!pattern.trim() || !message.trim()}
        >
          添加
        </button>
      </div>
    </form>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function actionLabel(action: string): string {
  const map: Record<string, string> = { generate: '生成 SQL', explain: '解释 SQL', optimize: '优化 SQL', repair: '修复错误' };
  return map[action] ?? action;
}

// ─── Drivers Tab ──────────────────────────────────────────────────────────────

function DriversTab() {
  const { connections } = useConnections();
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState<Record<string, boolean>>({});
  const [probes, setProbes] = useState<Record<string, ProbeResult>>({});

  useEffect(() => {
    if (!isDesktop()) return;
    setLoading(true);
    backend.listDrivers().then(setDrivers).catch(() => setDrivers([])).finally(() => setLoading(false));
  }, []);

  async function probe(connId: string) {
    setProbing((p) => ({ ...p, [connId]: true }));
    try {
      const r = await backend.probeConnection(connId);
      setProbes((p) => ({ ...p, [connId]: r }));
    } catch (err) {
      toast.error(`探测失败：${String(err)}`);
    } finally {
      setProbing((p) => ({ ...p, [connId]: false }));
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={18} className="animate-spin text-dp-text-dimmed" /></div>;
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-5">
        <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">已注册驱动</p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => (
            <div key={d.name} className={cn('rounded-lg border bg-dp-surface-raised p-3', d.disabled ? 'border-dp-border opacity-50' : 'border-dp-border')}>
              <div className="flex items-center gap-2">
                <Plug size={14} className={d.disabled ? 'text-dp-text-dimmed' : 'text-dp-accent'} />
                <span className="font-bold text-[0.88rem]">{d.displayName}</span>
                <span className="ml-auto rounded bg-dp-surface-overlay px-1.5 py-0.5 text-[0.66rem] font-mono text-dp-text-dimmed">{d.version}</span>
                <button
                  type="button"
                  title={d.disabled ? '启用驱动' : '禁用驱动'}
                  disabled={d.inUse && !d.disabled}
                  className="rounded px-1.5 py-0.5 text-[0.66rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
                  style={{ color: d.disabled ? 'var(--dp-success-muted)' : 'var(--dp-error)' }}
                  onClick={async () => {
                    try {
                      await backend.setDriverEnabled(d.name, d.disabled);
                      setDrivers(await backend.listDrivers());
                    } catch (err) {
                      toast.error(String(err));
                    }
                  }}
                >
                  {d.disabled ? '启用' : '禁用'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {d.features.map((f) => (
                  <span key={f} className="rounded-sm bg-dp-accent/15 px-1.5 py-0.5 font-mono text-[0.66rem] text-dp-accent-light">{f}</span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[0.7rem] text-dp-text-dimmed">
                <span>{d.builtIn ? '内置' : '插件'}</span>
                <span>{d.schemas ? '多 Schema' : '单 Schema'}</span>
                {d.inUse && <span className="text-dp-success-muted">使用中</span>}
                {d.disabled && <span className="text-dp-error">已禁用</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">连接能力探测</p>
        {connections.length === 0 ? (
          <p className="text-[0.78rem] text-dp-text-dimmed">还没有连接</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {connections.map((c) => {
              const p = probes[c.id];
              const isProbing = probing[c.id];
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border border-dp-border bg-dp-surface-raised px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.82rem] font-bold">{c.name}</span>
                      <span className="rounded bg-dp-surface-overlay px-1.5 py-0.5 text-[0.64rem] font-mono uppercase text-dp-text-dimmed">{c.type}</span>
                    </div>
                    {p && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem]">
                        {p.connected ? (
                          <span className="flex items-center gap-1 text-dp-success-muted"><CheckCircle2 size={10} />已连接 ({p.latencyMs}ms)</span>
                        ) : (
                          <span className="flex items-center gap-1 text-dp-error"><XCircle size={10} />未连接</span>
                        )}
                        {p.features.map((f) => (
                          <span key={f} className="rounded-sm bg-dp-accent/15 px-1.5 py-0.5 font-mono text-[0.62rem] text-dp-accent-light">{f}</span>
                        ))}
                        {p.errors.map((e, i) => (
                          <span key={i} className="text-dp-error" title={e}>错误</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-dp-border px-2.5 py-1.5 text-[0.74rem] font-semibold text-dp-text-secondary hover:border-dp-border-accent disabled:opacity-50"
                    onClick={() => probe(c.id)}
                    disabled={isProbing}
                  >
                    {isProbing ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                    探测
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState(30);
  const [archiving, setArchiving] = useState(false);

  function load() {
    if (!isDesktop()) return;
    setLoading(true);
    backend.listBackups().then(setBackups).catch(() => setBackups([])).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    setCreating(true);
    try {
      const b = await backend.createBackup();
      toast.success(`已创建备份 ${b.name}`);
      load();
    } catch (err) {
      toast.error(`备份失败：${String(err)}`);
    } finally {
      setCreating(false);
    }
  }

  async function remove(b: BackupInfo) {
    if (!confirm(`删除备份 ${b.name}?`)) return;
    try {
      await backend.deleteBackup(b.path);
      toast.success('已删除');
      load();
    } catch (err) {
      toast.error(`删除失败：${String(err)}`);
    }
  }

  async function archive() {
    if (days <= 0) return;
    if (!confirm(`将永久删除 ${days} 天前的所有审计记录，确定继续?`)) return;
    setArchiving(true);
    try {
      const r = await backend.archiveAudit(days);
      toast.success(`已归档：SQL ${r.sqlDeleted}，AI ${r.aiDeleted}，导出 ${r.exportDeleted}`);
    } catch (err) {
      toast.error(`归档失败：${String(err)}`);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">元数据备份</p>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-dp-border-accent bg-dp-accent/20 px-2.5 py-1.5 text-[0.78rem] font-bold text-dp-accent-light hover:bg-dp-accent/30 disabled:opacity-50"
            onClick={create}
            disabled={creating}
          >
            {creating ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            创建备份
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-dp-text-dimmed" /></div>
        ) : backups.length === 0 ? (
          <p className="text-[0.78rem] text-dp-text-dimmed">还没有备份</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {backups.map((b) => (
              <div key={b.path} className="flex items-center gap-3 rounded-md border border-dp-border bg-dp-surface-raised px-3 py-2">
                <Archive size={13} className="shrink-0 text-dp-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[0.82rem]">{b.name}</p>
                  <p className="truncate text-[0.7rem] text-dp-text-dimmed">{formatBytes(b.size)} · {b.createdAt} · {b.path}</p>
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-dp-text-dimmed hover:text-dp-error"
                  onClick={() => remove(b)}
                  title="删除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">审计归档</p>
        <p className="mb-3 text-[0.76rem] text-dp-text-dimmed">删除 N 天之前的 SQL/AI/导出 审计记录。建议先在「SQL 审计」「AI 日志」Tab 导出 CSV 后再执行。</p>
        <div className="flex items-center gap-2">
          <label className="text-[0.78rem] text-dp-text-secondary">超过</label>
          <input
            type="number"
            min={1}
            max={365}
            className="w-20 rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.84rem] focus:outline-none focus:border-dp-border-accent"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value || '0', 10) || 0)}
          />
          <span className="text-[0.78rem] text-dp-text-secondary">天</span>
          <button
            type="button"
            className="ml-2 flex items-center gap-1.5 rounded-md border border-dp-error/40 bg-dp-error/10 px-2.5 py-1.5 text-[0.78rem] font-bold text-dp-error hover:bg-dp-error/20 disabled:opacity-50"
            onClick={archive}
            disabled={archiving || days <= 0}
          >
            {archiving ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
            归档删除
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
