import { Database, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConnectionDialog } from '@/shared/connections';

export function EmptyWorkspace() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-dp-border-accent bg-dp-accent-hover">
        <Database size={28} className="text-dp-accent-light" />
      </div>

      <div>
        <h2 className="text-[1.1rem] font-bold">欢迎使用 DataPilot</h2>
        <p className="mt-2 text-[0.86rem] leading-relaxed text-dp-text-muted">
          连接你的第一个数据库，开始查询、分析和管理数据。
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xs">
        <button
          className="flex items-center justify-center gap-2 rounded-lg border border-dp-border-success bg-dp-success px-4 py-3 text-[0.88rem] font-bold text-dp-success-text"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} />
          新建连接
        </button>
        <p className="text-[0.76rem] text-dp-text-dimmed">
          支持 PostgreSQL · MySQL · SQLite
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
        {[
          { label: '快捷键驱动', desc: '全键盘操作，⌘K 命令面板' },
          { label: 'AI 辅助 SQL', desc: '生成、解释、优化查询' },
          { label: '安全审计', desc: '只读模式与风险检测' },
        ].map(({ label, desc }) => (
          <div key={label} className="rounded-lg border border-dp-border bg-dp-surface-raised p-3">
            <p className="text-[0.78rem] font-bold text-dp-text-secondary">{label}</p>
            <p className="mt-1 text-[0.72rem] leading-relaxed text-dp-text-dimmed">{desc}</p>
          </div>
        ))}
      </div>

      {open && <ConnectionDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
