import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { type Connection, type ConnectionType, addConnection, updateConnection } from './connection-store';
import { backend, isDesktop } from '@/lib/backend';

interface Props {
  connection?: Connection;
  onClose: () => void;
}

interface FormState {
  name: string;
  type: ConnectionType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  filePath: string;
  readOnly: boolean;
}

const DEFAULT_PORTS: Record<ConnectionType, number> = { sqlite: 0, postgres: 5432, mysql: 3306 };

function defaultForm(conn?: Connection): FormState {
  return {
    name: conn?.name ?? '',
    type: conn?.type ?? 'postgres',
    host: conn?.host ?? 'localhost',
    port: String(conn?.port ?? DEFAULT_PORTS[conn?.type ?? 'postgres']),
    database: conn?.database ?? '',
    username: conn?.username ?? '',
    password: '',
    filePath: conn?.filePath ?? '',
    readOnly: conn?.readOnly ?? false,
  };
}

export function ConnectionDialog({ connection, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => defaultForm(connection));
  const [testing, setTesting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onTypeChange(type: ConnectionType) {
    setForm((prev) => ({ ...prev, type, port: String(DEFAULT_PORTS[type]) }));
  }

  async function onTest() {
    setTesting(true);
    try {
      if (isDesktop()) {
        await backend.testConnection({
          name: form.name,
          type: form.type,
          host: form.host,
          port: parseInt(form.port) || DEFAULT_PORTS[form.type],
          database: form.database,
          username: form.username,
          password: form.password,
          filePath: form.filePath,
          readOnly: form.readOnly,
        });
        toast.success('连接测试成功');
      } else {
        await new Promise((r) => setTimeout(r, 800));
        toast.success('连接测试成功（模拟）');
      }
    } catch (e: unknown) {
      toast.error(`连接失败: ${String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  async function onSave() {
    if (!form.name.trim()) { toast.error('请填写连接名称'); return; }
    if (form.type === 'sqlite' && !form.filePath.trim()) { toast.error('请填写 SQLite 文件路径'); return; }
    if (form.type !== 'sqlite' && !form.database.trim()) { toast.error('请填写数据库名'); return; }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      host: form.host,
      port: parseInt(form.port) || DEFAULT_PORTS[form.type],
      database: form.database,
      username: form.username,
      password: form.password,
      filePath: form.filePath,
      readOnly: form.readOnly,
    };

    try {
      if (connection) {
        await updateConnection({ ...connection, ...payload });
        toast.success('连接已更新');
      } else {
        await addConnection(payload);
        toast.success('连接已添加');
      }
      onClose();
    } catch (e: unknown) {
      toast.error(String(e));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-dp-border bg-dp-bg-subtle shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dp-border px-5 py-4">
          <h2 className="text-[0.95rem] font-bold">{connection ? '编辑连接' : '新建连接'}</h2>
          <button className="rounded-md p-1 text-dp-text-muted hover:text-dp-text" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-4 px-5 py-5">
          {/* Name */}
          <label className="grid gap-1.5">
            <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">连接名称</span>
            <input
              ref={firstInputRef}
              className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
              placeholder="My Database"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </label>

          {/* Type */}
          <div className="grid gap-1.5">
            <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">类型</span>
            <div className="flex gap-2">
              {(['postgres', 'mysql', 'sqlite'] as ConnectionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    'flex-1 rounded-md border py-2 text-[0.82rem] font-semibold transition-colors',
                    form.type === t
                      ? 'border-dp-border-accent bg-dp-accent-hover text-dp-accent-light'
                      : 'border-dp-border text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary',
                  )}
                  onClick={() => onTypeChange(t)}
                >
                  {t === 'postgres' ? 'PostgreSQL' : t === 'mysql' ? 'MySQL' : 'SQLite'}
                </button>
              ))}
            </div>
          </div>

          {/* SQLite fields */}
          {form.type === 'sqlite' && (
            <label className="grid gap-1.5">
              <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">文件路径</span>
              <input
                className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                placeholder="/path/to/database.db"
                value={form.filePath}
                onChange={(e) => set('filePath', e.target.value)}
              />
            </label>
          )}

          {/* Network DB fields */}
          {form.type !== 'sqlite' && (
            <>
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">主机</span>
                  <input
                    className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                    placeholder="localhost"
                    value={form.host}
                    onChange={(e) => set('host', e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">端口</span>
                  <input
                    className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                    placeholder="5432"
                    value={form.port}
                    onChange={(e) => set('port', e.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">数据库</span>
                <input
                  className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                  placeholder="mydb"
                  value={form.database}
                  onChange={(e) => set('database', e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">用户名</span>
                  <input
                    className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                    placeholder="root"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[0.76rem] font-semibold uppercase tracking-wider text-dp-text-dimmed">密码</span>
                  <input
                    type="password"
                    className="rounded-md border border-dp-border bg-dp-surface-solid px-3 py-2 text-[0.88rem] text-dp-text outline-none focus:border-dp-border-accent"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          {/* Read only */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-dp-accent"
              checked={form.readOnly}
              onChange={(e) => set('readOnly', e.target.checked)}
            />
            <span className="text-[0.88rem] text-dp-text-secondary">只读模式</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-dp-border px-5 py-4">
          <button
            className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:border-dp-border-accent hover:text-dp-text-secondary disabled:opacity-50"
            type="button"
            disabled={testing}
            onClick={onTest}
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-dp-border px-3 py-2 text-[0.82rem] font-semibold text-dp-text-muted hover:text-dp-text-secondary"
              type="button"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="rounded-md border border-dp-border-success bg-dp-success px-4 py-2 text-[0.82rem] font-bold text-dp-success-text"
              type="button"
              onClick={onSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
