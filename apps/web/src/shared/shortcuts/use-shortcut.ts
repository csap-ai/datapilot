import { useEffect, useRef } from 'react';

export type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift';

export interface Shortcut {
  key: string;
  modifiers?: Modifier[];
  handler: () => void;
  label: string;
  when?: () => boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

function matchModifiers(event: KeyboardEvent, modifiers: Modifier[] = []): boolean {
  const want = new Set(modifiers);

  const metaOrCtrl = want.has('meta') || want.has('ctrl');
  if (metaOrCtrl) {
    if (!(isMac ? event.metaKey : event.ctrlKey)) return false;
    want.delete('meta');
    want.delete('ctrl');
  } else {
    if (isMac ? event.metaKey : event.ctrlKey) return false;
  }

  if (want.has('alt') !== event.altKey) return false;
  if (want.has('shift') !== event.shiftKey) return false;

  return true;
}

function matchKey(event: KeyboardEvent, key: string): boolean {
  return event.key.toLowerCase() === key.toLowerCase();
}

export function useShortcut(shortcut: Shortcut) {
  const ref = useRef(shortcut);
  ref.current = shortcut;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const s = ref.current;
      if (!matchKey(event, s.key)) return;
      if (!matchModifiers(event, s.modifiers)) return;
      if (s.when && !s.when()) return;

      event.preventDefault();
      s.handler();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
