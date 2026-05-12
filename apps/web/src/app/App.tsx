import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Shell } from '@/shared/shell';
import { registerCommand } from '@/shared/command-palette';
import { setStatus } from '@/shared/status-bar';
import { openTab, useWorkspace, EmptyWorkspace, SqlWorkspace, TabStrip } from '@/shared/workspace';
import { useConnections, loadConnections } from '@/shared/connections';
import { MetadataView } from '@/shared/metadata';
import { ERDiagram } from '@/shared/erdiagram';
import { SchemaDiffView } from '@/shared/schemadiff';
import { DataDiffView } from '@/shared/datadiff';
import { DashboardView } from '@/shared/dashboard';

function WorkspaceArea() {
  const { connections } = useConnections();
  const workspace = useWorkspace();

  if (connections.length === 0) return <EmptyWorkspace />;

  if (!workspace.activeTabId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[0.86rem] text-dp-text-dimmed">打开一个 Tab 开始工作</p>
      </div>
    );
  }

  const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId);
  if (activeTab?.type === 'metadata' && activeTab.meta) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>
        <div className="min-h-0 flex-1">
          <MetadataView meta={activeTab.meta} />
        </div>
      </div>
    );
  }
  if (activeTab?.type === 'er-diagram' && activeTab.meta) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>
        <div className="min-h-0 flex-1">
          <ERDiagram connectionId={activeTab.meta.connectionId} />
        </div>
      </div>
    );
  }
  if (activeTab?.type === 'schema-diff' && activeTab.meta?.targetConnectionId) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>
        <div className="min-h-0 flex-1">
          <SchemaDiffView sourceId={activeTab.meta.connectionId} targetId={activeTab.meta.targetConnectionId} />
        </div>
      </div>
    );
  }
  if (activeTab?.type === 'dashboard') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>
        <div className="min-h-0 flex-1">
          <DashboardView />
        </div>
      </div>
    );
  }
  if (activeTab?.type === 'data-diff' && activeTab.meta?.targetConnectionId && activeTab.meta?.keyColumn) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-dp-border bg-dp-surface-overlay px-3 pt-2">
          <TabStrip />
        </div>
        <div className="min-h-0 flex-1">
          <DataDiffView
            sourceId={activeTab.meta.connectionId}
            targetId={activeTab.meta.targetConnectionId}
            schema={activeTab.meta.schema}
            table={activeTab.meta.table}
            keyColumn={activeTab.meta.keyColumn}
          />
        </div>
      </div>
    );
  }

  return <SqlWorkspace />;
}

export function App() {
  useEffect(() => {
    loadConnections();
    setStatus({ id: 'app-name', text: 'DataPilot', position: 'left', priority: 0 });

    openTab({ id: 'sql-1', label: 'SQL Console', type: 'sql-console' });

    registerCommand({
      id: 'new-sql',
      label: '新建 SQL Console',
      group: 'Workspace',
      shortcut: { key: 'n', modifiers: ['meta'] },
      handler: () => openTab({ id: `sql-${Date.now()}`, label: 'SQL Console', type: 'sql-console' }),
    });
    registerCommand({
      id: 'open-dashboard',
      label: '打开 Dashboard',
      group: 'Workspace',
      handler: () => openTab({ id: 'dashboard', label: 'Dashboard', type: 'dashboard' }),
    });
    registerCommand({ id: 'format-sql', label: '格式化 SQL', group: 'SQL', handler: () => {} });
    registerCommand({ id: 'explain-sql', label: '解释当前 SQL', group: 'AI', handler: () => {} });
    registerCommand({ id: 'optimize-sql', label: '优化慢查询', group: 'AI', handler: () => {} });
    registerCommand({ id: 'export-csv', label: '导出 CSV', group: 'Export', handler: () => {} });
  }, []);

  return (
    <>
      <Toaster position="bottom-right" theme="dark" richColors />
      <Shell>
        <WorkspaceArea />
      </Shell>
    </>
  );
}
