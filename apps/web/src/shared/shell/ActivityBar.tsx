import { Database, Search, History, Bookmark, Shield, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ActivityId, setActivity, useActivity } from '@/shared/activity';

const topItems: { id: ActivityId; label: string; icon: React.ElementType; shortcut: string }[] = [
  { id: 'connections', label: '连接', icon: Database, shortcut: '⌘1' },
  { id: 'search', label: '搜索', icon: Search, shortcut: '⌘2' },
  { id: 'history', label: '历史', icon: History, shortcut: '⌘3' },
  { id: 'saved', label: '收藏', icon: Bookmark, shortcut: '⌘4' },
  { id: 'audit', label: '审计', icon: Shield, shortcut: '⌘5' },
];

export function ActivityBar() {
  const { active } = useActivity();

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-dp-border bg-dp-surface-overlay py-3">
      {/* Logo */}
      <div className="mb-4 grid size-[38px] place-items-center rounded-md border border-dp-border-accent bg-linear-to-br from-dp-accent/22 to-indigo-500/18 text-[0.8rem] font-black tracking-wider text-dp-accent-light">
        DP
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col items-center gap-1 w-full px-2">
        {topItems.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            key={id}
            type="button"
            title={`${label} (${shortcut})`}
            className={cn(
              'flex w-full flex-col items-center gap-1 rounded-md border px-1 py-2.5 text-[0.66rem] transition-colors',
              active === id
                ? 'border-dp-border-accent bg-dp-accent-hover text-dp-sky-pale'
                : 'border-transparent text-dp-text-dimmed hover:border-dp-border-accent hover:bg-dp-accent-hover hover:text-dp-sky-pale',
            )}
            onClick={() => setActivity(id)}
          >
            <Icon size={16} strokeWidth={active === id ? 2 : 1.5} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Settings at bottom */}
      <button
        type="button"
        title="设置"
        className={cn(
          'flex flex-col items-center gap-1 rounded-md border px-1 py-2.5 text-[0.66rem] transition-colors mx-2 w-[calc(100%-16px)]',
          active === 'settings'
            ? 'border-dp-border-accent bg-dp-accent-hover text-dp-sky-pale'
            : 'border-transparent text-dp-text-dimmed hover:border-dp-border-accent hover:bg-dp-accent-hover hover:text-dp-sky-pale',
        )}
        onClick={() => setActivity('settings')}
      >
        <Settings size={16} strokeWidth={active === 'settings' ? 2 : 1.5} />
        <span>设置</span>
      </button>
    </aside>
  );
}
