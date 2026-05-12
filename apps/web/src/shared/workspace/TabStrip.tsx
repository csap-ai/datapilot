import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { activateTab, closeTab, useWorkspace, type WorkspaceTab } from './workspace-store';

export function TabStrip() {
  const { tabs, activeTabId } = useWorkspace();

  if (tabs.length === 0) return null;

  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={tab.id === activeTabId} />
      ))}
    </nav>
  );
}

function TabButton({ tab, active }: { tab: WorkspaceTab; active: boolean }) {
  return (
    <button
      className={cn(
        'group flex shrink-0 items-center gap-2 rounded-t-[12px] rounded-b-[4px] border border-dp-border-subtle px-3.5 py-[9px] text-sm text-dp-text-muted',
        active ? 'bg-[oklch(0.20_0.02_240/0.9)] text-white' : 'bg-[oklch(0.16_0.02_240/0.58)]',
      )}
      type="button"
      onClick={() => activateTab(tab.id)}
    >
      <span>{tab.label}</span>
      {tab.pinned ? (
        <span className="text-[0.6rem] text-dp-text-dimmed">pin</span>
      ) : (
        <span
          className="hidden rounded-sm p-0.5 text-dp-text-dimmed hover:bg-dp-border hover:text-dp-text group-hover:inline-flex"
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              closeTab(tab.id);
            }
          }}
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
}
