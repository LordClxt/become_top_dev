import { go } from '@codemirror/lang-go'
import { indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorView, keymap } from '@codemirror/view'
import { classHighlighter } from '@lezer/highlight'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' },
  '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: '1.65' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '12px 0' },
  '.cm-gutters': { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 7%, transparent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent) !important',
  },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused': { outline: 'none' },
})

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  onRun,
}: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  onRun?: () => void
}) {
  const extensions = useMemo(
    () => [
      go(),
      indentUnit.of('\t'),
      syntaxHighlighting(classHighlighter),
      theme,
      keymap.of([{ key: 'Mod-Enter', run: () => (onRun?.(), true) }]),
    ],
    [onRun],
  )
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      theme="none"
      height="100%"
      className="h-full"
      extensions={extensions}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, tabSize: 4 }}
    />
  )
}
