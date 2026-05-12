import { Command } from 'cmdk';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';
import { formatShortcut, useShortcut } from '@/shared/shortcuts';

import { getCommands, subscribe, type CommandAction } from './command-store';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useShortcut({
    key: 'k',
    modifiers: ['meta'],
    label: 'Toggle Command Palette',
    handler: () => setOpen((v) => !v),
  });

  const commands = useSyncExternalStore(subscribe, getCommands, getCommands);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const cmd of commands) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return map;
  }, [commands]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Command
          className="w-[560px] overflow-hidden rounded-lg border border-dp-border bg-dp-bg-subtle shadow-2xl"
          label="Command Palette"
        >
          <Command.Input
            className="w-full border-b border-dp-border bg-transparent px-4 py-3.5 text-sm text-dp-text outline-none placeholder:text-dp-text-dimmed"
            placeholder="输入命令..."
            autoFocus
          />
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="px-4 py-6 text-center text-sm text-dp-text-muted">
              没有匹配的命令
            </Command.Empty>
            {Array.from(grouped.entries()).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dp-text-dimmed"
              >
                {items.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => {
                      setOpen(false);
                      cmd.handler();
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm text-dp-text-secondary',
                      'data-[selected=true]:bg-dp-accent-hover data-[selected=true]:text-dp-text',
                    )}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[0.68rem] text-dp-text-dimmed">
                        {formatShortcut(cmd.shortcut)}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
