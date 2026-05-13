import { useEffect, useState } from 'react';
import {
  Settings,
  Sparkles,
  Copy,
  ArrowDownToLine,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { backend, isDesktop, type AIConfig, type AIActionRequest } from '@/lib/backend';
import { useConnections } from '@/shared/connections';
import { useCurrentSQL } from '@/lib/sql-state';
import { emitLoadSQL } from '@/lib/editor-events';

type ActionId = 'generate' | 'explain' | 'optimize' | 'repair';

const ACTIONS: { id: ActionId; label: string; needsSQL: boolean; needsPrompt: boolean }[] = [
  { id: 'generate', label: '生成 SQL', needsSQL: false, needsPrompt: true },
  { id: 'explain', label: '解释 SQL', needsSQL: true, needsPrompt: false },
  { id: 'optimize', label: '优化 SQL', needsSQL: true, needsPrompt: false },
  { id: 'repair', label: '修复错误', needsSQL: true, needsPrompt: false },
];

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'ollama', label: 'Ollama (本地)' },
  { id: 'custom', label: '自定义' },
];

export function AiPanel() {
  const { connections, activeId } = useConnections();
  const active = connections.find((c) => c.id === activeId);
  const currentSQL = useCurrentSQL();

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AIConfig>({ provider: 'openai', baseUrl: '', model: '', apiKey: '' });
  const [configLoaded, setConfigLoaded] = useState(false);

  const [selectedAction, setSelectedAction] = useState<ActionId>('explain');
  const [userPrompt, setUserPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultIsSQL, setResultIsSQL] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    backend.getAIConfig().then((cfg) => {
      if (cfg.provider) setConfig(cfg);
      setConfigLoaded(true);
      if (!cfg.provider) setShowConfig(true);
    });
  }, []);

  function handleProviderChange(provider: string) {
    setConfig((prev) => ({ ...prev, provider, baseUrl: '', model: '' }));
  }

  async function saveConfig() {
    if (!isDesktop()) return;
    try {
      await backend.setAIConfig(config);
      toast.success('AI 配置已保存');
      setShowConfig(false);
    } catch {
      toast.error('保存失败');
    }
  }

  async function runAction() {
    if (!isDesktop()) { toast.error('AI 功能仅在桌面版可用'); return; }
    if (!config.provider) { toast.error('请先配置 AI 提供商'); setShowConfig(true); return; }

    const actionDef = ACTIONS.find((a) => a.id === selectedAction)!;
    if (actionDef.needsSQL && !currentSQL.trim()) { toast.error('编辑器中没有 SQL'); return; }
    if (actionDef.needsPrompt && !userPrompt.trim()) { toast.error('请输入描述'); return; }

    const req: AIActionRequest = {
      connectionId: activeId ?? '',
      action: selectedAction,
      sql: currentSQL,
      errorMsg,
      userPrompt,
    };

    setRunning(true);
    setResult(null);
    try {
      const res = await backend.runAIAction(req);
      setResult(res.content);
      setResultIsSQL(selectedAction !== 'explain');
    } catch (e: unknown) {
      toast.error(String(e));
    } finally {
      setRunning(false);
    }
  }

  function loadResult() {
    if (result) {
      const sqlPart = extractSQL(result);
      emitLoadSQL(sqlPart);
      toast.success('已加载到编辑器');
    }
  }

  const isConfigured = Boolean(config.provider && (config.provider === 'ollama' || config.apiKey));

  return (
    <div className="flex h-full flex-col border-l border-dp-border bg-dp-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-dp-border px-4 py-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-dp-accent">Context AI</p>
          <h2 className="text-[0.9rem] font-bold">AI 助手</h2>
        </div>
        <button
          className={cn(
            'rounded-md border p-1.5 transition-colors',
            showConfig
              ? 'border-dp-border-accent bg-dp-accent-hover text-dp-sky-pale'
              : 'border-transparent text-dp-text-dimmed hover:border-dp-border hover:text-dp-text-secondary',
          )}
          type="button"
          title="配置"
          onClick={() => setShowConfig((v) => !v)}
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* Config section */}
        {showConfig && (
          <div className="border-b border-dp-border p-4">
            <p className="mb-3 text-[0.76rem] font-bold text-dp-text-secondary">AI 提供商配置</p>

            <div className="flex flex-col gap-3">
              {/* Provider */}
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  提供商
                </label>
                <select
                  className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] text-dp-text-primary focus:border-dp-border-accent focus:outline-none"
                  value={config.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Base URL — always shown, auto-filled for known providers */}
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  Base URL
                </label>
                <input
                  className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                  placeholder={defaultBaseURL(config.provider)}
                  value={config.baseUrl}
                  onChange={(e) => setConfig((p) => ({ ...p, baseUrl: e.target.value }))}
                />
              </div>

              {/* Model */}
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  模型
                </label>
                <input
                  className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                  placeholder={defaultModel(config.provider)}
                  value={config.model}
                  onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))}
                />
              </div>

              {/* API Key — not shown for Ollama */}
              {config.provider !== 'ollama' && (
                <div>
                  <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                    API Key
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-dp-border bg-dp-surface px-2.5 py-1.5 text-[0.82rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                    placeholder="sk-..."
                    value={config.apiKey}
                    onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
                  />
                </div>
              )}

              <button
                className="mt-1 w-full rounded-md border border-dp-border-accent bg-dp-accent/20 py-2 text-[0.82rem] font-bold text-dp-accent-light hover:bg-dp-accent/30"
                type="button"
                onClick={saveConfig}
              >
                保存配置
              </button>
            </div>
          </div>
        )}

        {/* Main panel */}
        {!showConfig && (
          <div className="flex flex-col gap-4 p-4">
            {/* Status / connection */}
            {active ? (
              <div className="rounded-lg border border-dp-border bg-dp-surface-raised px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.74rem] font-semibold text-dp-text-secondary truncate">{active.name}</p>
                    <p className="text-[0.7rem] text-dp-text-dimmed uppercase">{active.type}</p>
                  </div>
                  {isConfigured ? (
                    <span className="rounded-full bg-dp-success/20 px-2 py-0.5 text-[0.68rem] font-bold text-dp-success-muted">
                      已配置
                    </span>
                  ) : (
                    <button
                      className="text-[0.72rem] text-dp-accent underline"
                      type="button"
                      onClick={() => setShowConfig(true)}
                    >
                      配置 AI
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dp-border bg-dp-surface-raised px-3 py-3 text-center">
                <p className="text-[0.8rem] text-dp-text-dimmed">先选择一个连接</p>
              </div>
            )}

            {/* Action selector */}
            <div>
              <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">操作</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    className={cn(
                      'rounded-md border px-2 py-2 text-[0.78rem] font-semibold transition-colors',
                      selectedAction === a.id
                        ? 'border-dp-border-accent bg-dp-accent-hover text-dp-sky-pale'
                        : 'border-dp-border bg-dp-surface-raised text-dp-text-secondary hover:border-dp-border-accent',
                    )}
                    type="button"
                    onClick={() => setSelectedAction(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input (generate only) */}
            {selectedAction === 'generate' && (
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  描述需求
                </label>
                <textarea
                  className="w-full resize-none rounded-md border border-dp-border bg-dp-surface px-2.5 py-2 text-[0.82rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                  rows={3}
                  placeholder="例：查询最近 7 天注册的用户..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                />
              </div>
            )}

            {/* Error msg input (repair only) */}
            {selectedAction === 'repair' && (
              <div>
                <label className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
                  错误信息（可选）
                </label>
                <textarea
                  className="w-full resize-none rounded-md border border-dp-border bg-dp-surface px-2.5 py-2 text-[0.82rem] text-dp-text-primary placeholder:text-dp-text-dimmed focus:border-dp-border-accent focus:outline-none"
                  rows={2}
                  placeholder="粘贴报错信息..."
                  value={errorMsg}
                  onChange={(e) => setErrorMsg(e.target.value)}
                />
              </div>
            )}

            {/* Current SQL preview */}
            {ACTIONS.find((a) => a.id === selectedAction)?.needsSQL && currentSQL && (
              <SQLPreview sql={currentSQL} />
            )}

            {/* Run button */}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dp-border-accent bg-dp-accent/20 py-2.5 text-[0.84rem] font-bold text-dp-accent-light disabled:opacity-40 hover:bg-dp-accent/30"
              type="button"
              disabled={running || !isConfigured}
              onClick={runAction}
            >
              {running ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {running ? '思考中…' : ACTIONS.find((a) => a.id === selectedAction)?.label}
            </button>

            {/* Result */}
            {result && (
              <ResultBlock
                content={result}
                isSQL={resultIsSQL}
                onLoad={loadResult}
              />
            )}
          </div>
        )}
      </div>

      {/* Safety notice */}
      <div className="shrink-0 border-t border-dp-border px-4 py-3">
        <p className="text-[0.72rem] leading-relaxed text-dp-text-dimmed">
          AI 生成的 SQL 只进入编辑器，不会直接执行。
        </p>
      </div>
    </div>
  );
}

function SQLPreview({ sql }: { sql: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = sql.length > 120 ? sql.slice(0, 120) + '…' : sql;
  return (
    <div className="rounded-md border border-dp-border bg-dp-surface-raised p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">当前 SQL</span>
        {sql.length > 120 && (
          <button
            className="text-[0.68rem] text-dp-accent"
            type="button"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-[0.72rem] text-dp-text-secondary">
        {expanded ? sql : preview}
      </pre>
    </div>
  );
}

function ResultBlock({
  content,
  isSQL,
  onLoad,
}: {
  content: string;
  isSQL: boolean;
  onLoad: () => void;
}) {
  function copy() {
    navigator.clipboard.writeText(content).then(() => toast.success('已复制'));
  }

  return (
    <div className="rounded-md border border-dp-border bg-dp-surface-raised">
      <div className="flex items-center justify-between border-b border-dp-border px-3 py-2">
        <span className="text-[0.72rem] font-extrabold uppercase tracking-wider text-dp-text-dimmed">
          结果
        </span>
        <div className="flex items-center gap-1.5">
          {isSQL && (
            <button
              className="flex items-center gap-1 rounded border border-dp-border px-2 py-1 text-[0.72rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary"
              type="button"
              onClick={onLoad}
              title="加载到编辑器"
            >
              <ArrowDownToLine size={11} />
              加载
            </button>
          )}
          <button
            className="flex items-center gap-1 rounded border border-dp-border px-2 py-1 text-[0.72rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary"
            type="button"
            onClick={copy}
          >
            <Copy size={11} />
            复制
          </button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[0.76rem] leading-relaxed text-dp-text-secondary">
        {content}
      </pre>
    </div>
  );
}

function defaultBaseURL(provider: string): string {
  if (provider === 'openai') return 'https://api.openai.com/v1';
  if (provider === 'ollama') return 'http://localhost:11434/v1';
  return '';
}

function defaultModel(provider: string): string {
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'ollama') return 'llama3.2';
  return '';
}

function extractSQL(content: string): string {
  // Strip markdown code fences if present
  const match = content.match(/```(?:sql)?\n?([\s\S]*?)```/i);
  if (match) return match[1].trim();
  // For optimize, take only the first SQL block (before blank line + explanation)
  const blankLine = content.indexOf('\n\n');
  if (blankLine > 0) {
    const first = content.slice(0, blankLine).trim();
    if (first.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)/i)) return first;
  }
  return content;
}
