import { useEffect } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { CommandPalette, registerCommand } from '@/shared/command-palette';
import { StatusBar } from '@/shared/status-bar';
import { ActivityBar } from './ActivityBar';
import { AiPanel } from './AiPanel';
import { ContextPanel } from './ContextPanel';

interface Props {
  children: React.ReactNode;
}

export function Shell({ children }: Props) {
  const aiPanelRef = usePanelRef();

  useEffect(() => {
    registerCommand({
      id: 'toggle-ai-panel',
      label: 'AI 面板：显示/隐藏',
      group: 'View',
      shortcut: { key: '\\', modifiers: ['meta'] },
      handler: () => {
        const panel = aiPanelRef.current;
        if (!panel) return;
        if (panel.isCollapsed()) panel.expand();
        else panel.collapse();
      },
    });
  }, [aiPanelRef]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <CommandPalette />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        <Group orientation="horizontal" className="flex-1">
          <Panel defaultSize={22} minSize={14} maxSize={38} className="min-h-0">
            <ContextPanel />
          </Panel>
          <Separator className="w-px bg-dp-border transition-colors data-[active]:bg-dp-accent/60 hover:bg-dp-border-accent" />
          <Panel defaultSize={55} minSize={30} className="min-h-0 bg-[oklch(0.12_0.02_260/0.62)]">
            {children}
          </Panel>
          <Separator className="w-px bg-dp-border transition-colors data-[active]:bg-dp-accent/60 hover:bg-dp-border-accent" />
          <Panel
            panelRef={aiPanelRef}
            defaultSize={23}
            minSize={18}
            maxSize={40}
            collapsible
            collapsedSize={0}
            className="min-h-0"
          >
            <AiPanel />
          </Panel>
        </Group>
      </div>
      <StatusBar />
    </div>
  );
}
