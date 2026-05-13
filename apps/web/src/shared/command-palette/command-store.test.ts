import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCommands,
  registerCommand,
  subscribe,
  unregisterCommand,
  type CommandAction,
} from './command-store';

function clearAll() {
  for (const c of getCommands()) {
    unregisterCommand(c.id);
  }
}

const noop = () => {};

const sample = (id: string, label = id): CommandAction => ({
  id,
  label,
  group: 'Test',
  handler: noop,
});

describe('command-store', () => {
  beforeEach(() => clearAll());

  it('registers a command and exposes it via getCommands', () => {
    registerCommand(sample('a'));
    const all = getCommands();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('a');
  });

  it('replaces a command when the same id is registered twice', () => {
    registerCommand(sample('a', 'first'));
    registerCommand(sample('a', 'second'));
    const all = getCommands();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe('second');
  });

  it('unregister removes the command', () => {
    registerCommand(sample('a'));
    registerCommand(sample('b'));
    unregisterCommand('a');
    const ids = getCommands().map((c) => c.id);
    expect(ids).toEqual(['b']);
  });

  it('notifies subscribers on register and unregister', () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    registerCommand(sample('a'));
    registerCommand(sample('b'));
    unregisterCommand('a');
    unsub();
    registerCommand(sample('c'));
    expect(calls).toBe(3);
  });

  it('subscribe returns an unsubscribe function', () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    registerCommand(sample('a'));
    expect(calls).toBe(1);
    unsub();
    registerCommand(sample('b'));
    expect(calls).toBe(1);
  });

  it('getCommands returns a stable reference until state changes', () => {
    registerCommand(sample('a'));
    const first = getCommands();
    const second = getCommands();
    expect(first).toBe(second);
    registerCommand(sample('b'));
    expect(getCommands()).not.toBe(first);
  });
});
