import { go, goLanguage } from '@codemirror/lang-go'
import { indentUnit, LanguageSupport, syntaxHighlighting } from '@codemirror/language'
import { EditorView, keymap } from '@codemirror/view'
import { classHighlighter } from '@lezer/highlight'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'
import { goCompletion } from '@/lib/completion/go'
import { useSettings } from '@/lib/settings'
import { groovyCompletion } from '@/lib/completion/groovy'
import { javaCompletion } from '@/lib/completion/java'
import { typescriptCompletion } from '@/lib/completion/typescript'
import { groovyLanguage, javaLanguage, typescriptLanguage } from '@/lib/highlight'

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

export type EditorLanguage = 'go' | 'groovy' | 'java' | 'typescript'

/** Langage de l'éditeur : extension du fichier d'abord, sinon langage du TP. */
export function editorLanguage(file: string, fallback: string): EditorLanguage {
  if (/\.(groovy|gradle|gsp|gvy)$/.test(file)) return 'groovy'
  if (file.endsWith('.java')) return 'java'
  if (/\.(ts|mts|js|mjs)$/.test(file)) return 'typescript'
  if (file.endsWith('.go')) return 'go'
  if (fallback === 'nestjs') return 'typescript'
  return fallback === 'groovy' || fallback === 'java' || fallback === 'typescript' ? fallback : 'go'
}

function languageSupport(language: EditorLanguage, otherFiles: string[]) {
  if (language === 'java') {
    return [
      new LanguageSupport(javaLanguage, javaLanguage.data.of({ autocomplete: javaCompletion(otherFiles) })),
      indentUnit.of('    '),
    ]
  }
  if (language === 'typescript') {
    return [
      new LanguageSupport(typescriptLanguage, typescriptLanguage.data.of({ autocomplete: typescriptCompletion(otherFiles) })),
      indentUnit.of('  '),
    ]
  }
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
  language?: EditorLanguage
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
