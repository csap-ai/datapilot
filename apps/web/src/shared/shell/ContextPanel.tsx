import { useActivity } from '@/shared/activity';
import { AuditPanel } from '@/shared/audit';
import { ConnectionsPanel } from '@/shared/connections';
import { HistoryPanel } from '@/shared/history';
import { SavedQueriesPanel } from '@/shared/saved';

export function ContextPanel() {
  const { active } = useActivity();

  if (active === 'connections') return <ConnectionsPanel />;
  if (active === 'history') return <HistoryPanel />;
  if (active === 'saved') return <SavedQueriesPanel />;
  if (active === 'audit') return <AuditPanel />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[0.82rem] text-dp-text-dimmed capitalize">{active}</p>
      <p className="text-[0.76rem] text-dp-text-dimmed">Coming soon</p>
    </div>
  );
}
