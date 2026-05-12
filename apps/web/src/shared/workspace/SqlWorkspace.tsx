import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertTriangle, X, Bookmark, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { SqlEditor } from '@/shared/editor';
import { ResultsTable } from '@/shared/results';
import { ExplainView } from '@/shared/explain';
import { TabStrip, useWorkspace } from '@/shared/workspace';
import { useConnections } from '@/shared/connections';
import { backend, isDesktop, type QueryResult, type RiskAssessment, type ExplainResult } from '@/lib/backend';
import { onLoadSQL } from '@/lib/editor-events';
import { setCurrentSQL } from '@/lib/sql-state';
import { cn } from '@/lib/utils';

function SaveQueryDialog({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-5">
            <p className="mb-3 text-[0.9rem] font-bold">保存查询</p>
            <input
              ref={inputRef}
              className="w-full rounded-md border border-dp-border bg-dp-surface px-3 py-2 text-[0.84rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
              placeholder="查询名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
            <button
              className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary"
              type="button"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="rounded-md border border-dp-border-accent bg-dp-accent/20 px-4 py-2 text-[0.82rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              type="submit"
              disabled={!name.trim()}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RiskConfirmDialog({
  assessment,
  onConfirm,
  onCancel,
}: {
  assessment: RiskAssessment;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDanger = assessment.level === 'danger';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-5">
          <AlertTriangle
            size={20}
            className={cn('mt-0.5 shrink-0', isDanger ? 'text-dp-error' : 'text-dp-warning')}
          />
          <div>
            <p className="mb-1 text-[0.9rem] font-bold">
              {isDanger ? '高风险操作' : '注意'}
            </p>
            <p className="text-[0.84rem] text-dp-text-secondary">{assessment.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-dp-border px-5 py-4">
          <button
            className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary"
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={cn(
              'rounded-md border px-4 py-2 text-[0.82rem] font-bold',
              isDanger
                ? 'border-dp-error/60 bg-dp-error/20 text-dp-error hover:bg-dp-error/30'
                : 'border-dp-warning/60 bg-dp-warning/20 text-dp-warning hover:bg-dp-warning/30',
            )}
            type="button"
            onClick={onConfirm}
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}

export function SqlWorkspace() {
  const workspace = useWorkspace();
  const { activeId } = useConnections();
  const [sql, setSql] = useState('SELECT 1;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [pendingRisk, setPendingRisk] = useState<RiskAssessment | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [explain, setExplain] = useState<ExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [view, setView] = useState<'result' | 'explain'>('result');

  useEffect(() => onLoadSQL((incoming) => setSql(incoming)), []);
  useEffect(() => { setCurrentSQL(sql); }, [sql]);

  async function doExecute() {
    if (!activeId || !isDesktop()) return;
    setRunning(true);
    try {
      const r = await backend.executeSQL(activeId, sql);
      setResult(r);
    } catch (e: unknown) {
      const msg = String(e);
      if (!msg.includes('cancelled')) toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  async function onRun() {
    if (!activeId) { toast.error('请先选择一个连接'); return; }
    if (!isDesktop()) { toast.error('SQL 执行仅在桌面版可用'); return; }

    const assessment = await backend.assessSQL(sql);
    if (assessment.level !== 'none') {
      setPendingRisk(assessment);
      return;
    }
    await doExecute();
  }

  async function onCancel() {
    if (!activeId || !isDesktop()) return;
    await backend.cancelExecution(activeId);
    setRunning(false);
  }

  function onConfirmRisk() {
    setPendingRisk(null);
    void doExecute();
  }

  async function onExplain() {
    if (!activeId) { toast.error('请先选择一个连接'); return; }
    if (!isDesktop()) { toast.error('仅在桌面版可用'); return; }
    setExplaining(true);
    try {
      const r = await backend.explainSQL(activeId, sql);
      setExplain(r);
      setView('explain');
    } catch (e: unknown) {
      toast.error(String(e));
    } finally {
      setExplaining(false);
    }
  }

  async function onSave(name: string) {
    if (!activeId || !isDesktop()) return;
    try {
      await backend.saveQuery(activeId, name, sql);
      toast.success(`已保存「${name}」`);
    } catch {
      toast.error('保存失败');
    } finally {
      setShowSaveDialog(false);
    }
  }

  if (!workspace.activeTabId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[0.86rem] text-dp-text-dimmed">打开一个 Tab 开始工作</p>
      </div>
    );
  }

  return (
    <>
      {pendingRisk && (
        <RiskConfirmDialog
          assessment={pendingRisk}
          onConfirm={onConfirmRisk}
          onCancel={() => setPendingRisk(null)}
        />
      )}
      {showSaveDialog && (
        <SaveQueryDialog onSave={onSave} onClose={() => setShowSaveDialog(false)} />
      )}

      <div className="flex h-full flex-col gap-0 overflow-hidden">
        {/* Tab strip */}
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>

        {/* Editor area */}
        <div className="flex shrink-0 flex-col" style={{ height: '220px' }}>
          <div className="flex items-center justify-between border-b border-dp-border-subtle px-4 py-2">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-dp-text-dimmed">
              SQL Editor
            </p>
            <div className="flex items-center gap-2">
              {running && (
                <button
                  className="flex items-center gap-1.5 rounded-md border border-dp-border px-2.5 py-1.5 text-[0.76rem] font-semibold text-dp-text-muted hover:border-dp-error/60 hover:text-dp-error"
                  type="button"
                  onClick={onCancel}
                >
                  <X size={11} />
                  取消
                </button>
              )}
              <button
                className="flex items-center gap-1.5 rounded-md border border-dp-border px-2.5 py-1.5 text-[0.76rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary disabled:opacity-50"
                type="button"
                disabled={running || explaining || !activeId}
                onClick={onExplain}
              >
                {explaining ? <Loader2 size={11} className="animate-spin" /> : <GitMerge size={11} />}
                解释计划
              </button>
              <button
                className="flex items-center gap-1.5 rounded-md border border-dp-border px-2.5 py-1.5 text-[0.76rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary disabled:opacity-50"
                type="button"
                disabled={running || !activeId}
                onClick={() => setShowSaveDialog(true)}
              >
                <Bookmark size={11} />
                保存
              </button>
              <button
                className="flex items-center gap-1.5 rounded-md border border-dp-border-success bg-dp-success px-3 py-1.5 text-[0.78rem] font-bold text-dp-success-text disabled:opacity-50"
                type="button"
                disabled={running}
                onClick={onRun}
              >
                {running ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                {running ? '执行中…' : '安全执行'}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-dp-surface-raised">
            <SqlEditor value={sql} onChange={setSql} />
          </div>
        </div>

        {/* Resize handle */}
        <div className="h-px shrink-0 bg-dp-border" />

        {/* Results / Explain switcher */}
        {(result || explain) && (
          <div className="shrink-0 flex border-b border-dp-border-subtle bg-dp-surface-overlay px-3">
            <button
              className={cn(
                'border-b-2 px-3 py-1.5 text-[0.74rem] font-semibold transition-colors',
                view === 'result'
                  ? 'border-dp-accent text-dp-accent-light'
                  : 'border-transparent text-dp-text-dimmed hover:text-dp-text-secondary',
              )}
              type="button"
              onClick={() => setView('result')}
              disabled={!result}
            >
              查询结果
            </button>
            <button
              className={cn(
                'border-b-2 px-3 py-1.5 text-[0.74rem] font-semibold transition-colors',
                view === 'explain'
                  ? 'border-dp-accent text-dp-accent-light'
                  : 'border-transparent text-dp-text-dimmed hover:text-dp-text-secondary',
              )}
              type="button"
              onClick={() => setView('explain')}
              disabled={!explain}
            >
              执行计划
            </button>
          </div>
        )}

        {/* Results / Explain area */}
        <div className="min-h-0 flex-1 bg-dp-surface-raised">
          {view === 'explain' && explain ? (
            <ExplainView result={explain} />
          ) : result ? (
            <ResultsTable columns={result.columns} rows={result.rows} durationMs={result.durationMs} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[0.82rem] text-dp-text-dimmed">选择连接后执行 SQL</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
