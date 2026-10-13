import { go, goLanguage } from '@codemirror/lang-go'
import { indentUnit, LanguageSupport, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { groovy } from '@codemirror/legacy-modes/mode/groovy'
import { EditorView, keymap } from '@codemirror/view'
import { classHighlighter } from '@lezer/highlight'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'
import { goCompletion } from '@/lib/completion/go'
import { useSettings } from '@/lib/settings'
import { groovyCompletion } from '@/lib/completion/groovy'

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

const groovyLanguage = StreamLanguage.define(groovy)

/** Langage de l'éditeur : extension du fichier d'abord, sinon langage du TP. */
export function editorLanguage(file: string, fallback: string): 'go' | 'groovy' {
  if (/\.(groovy|gradle|gsp|gvy)$/.test(file)) return 'groovy'
  if (file.endsWith('.go')) return 'go'
  return fallback === 'groovy' ? 'groovy' : 'go'
}

function languageSupport(language: 'go' | 'groovy', otherFiles: string[]) {
  if (language === 'groovy') {
    return [
      new LanguageSupport(groovyLanguage, groovyLanguage.data.of({ autocomplete: groovyCompletion(otherFiles) })),
      indentUnit.of('    '),
    ]
  }
  return [go(), goLanguage.data.of({ autocomplete: goCompletion(otherFiles) }), indentUnit.of('\t')]
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  onRun,
  language = 'go',
  otherFiles = [],
}: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  onRun?: () => void
  language?: 'go' | 'groovy'
  /** Contenu des autres fichiers du TP, dont les noms déclarés sont proposés en complétion. */
  otherFiles?: string[]
}) {
  const { autocomplete } = useSettings()
  const extensions = useMemo(
    () => [
      ...languageSupport(language, otherFiles),
      syntaxHighlighting(classHighlighter),
      theme,
      keymap.of([{ key: 'Mod-Enter', run: () => (onRun?.(), true) }]),
    ],
    [onRun, language, otherFiles],
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
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, tabSize: 4, autocompletion: autocomplete && !readOnly }}
    />
  )
}
