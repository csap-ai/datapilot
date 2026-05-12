import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';

const dpTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      fontSize: '0.9rem',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: "'SFMono-Regular', Consolas, monospace",
      lineHeight: '1.8',
    },
    '.cm-content': { caretColor: '#38bdf8' },
    '.cm-cursor': { borderLeftColor: '#38bdf8' },
    '.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'oklch(0.72 0.12 210 / 0.22)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid oklch(0.68 0.01 240 / 0.12)',
      color: '#64748b',
      minWidth: '42px',
    },
    '.cm-gutter.cm-lineNumbers .cm-gutterElement': { paddingRight: '12px' },
    '.cm-activeLineGutter': { backgroundColor: 'oklch(0.72 0.12 210 / 0.08)' },
    '.cm-activeLine': { backgroundColor: 'oklch(0.72 0.12 210 / 0.06)' },
    '.cm-matchingBracket': { backgroundColor: 'oklch(0.72 0.12 210 / 0.20)', outline: 'none' },
    '.cm-tooltip': {
      backgroundColor: '#0b1120',
      border: '1px solid oklch(0.68 0.01 240 / 0.16)',
      borderRadius: '6px',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'oklch(0.72 0.12 210 / 0.18)',
    },
  },
  { dark: true },
);

const syntaxColors = EditorView.theme({
  '.tok-keyword': { color: '#38bdf8', fontWeight: '600' },
  '.tok-name': { color: '#e5eefb' },
  '.tok-variableName': { color: '#bae6fd' },
  '.tok-string': { color: '#bbf7d0' },
  '.tok-number': { color: '#fde68a' },
  '.tok-operator': { color: '#94a3b8' },
  '.tok-comment': { color: '#64748b', fontStyle: 'italic' },
  '.tok-punctuation': { color: '#64748b' },
  '.tok-typeName': { color: '#93c5fd' },
  '.tok-propertyName': { color: '#cbd5e1' },
});

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          sql(),
          dpTheme,
          syntaxColors,
          EditorState.readOnly.of(readOnly),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newVal = update.state.doc.toString();
              valueRef.current = newVal;
              onChange?.(newVal);
            }
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === valueRef.current) return;
    valueRef.current = value;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
