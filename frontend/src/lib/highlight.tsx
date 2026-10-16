import { goLanguage } from '@codemirror/lang-go'
import { StreamLanguage } from '@codemirror/language'
import { java } from '@codemirror/legacy-modes/mode/clike'
import { groovy } from '@codemirror/legacy-modes/mode/groovy'
import { typescript } from '@codemirror/legacy-modes/mode/javascript'
import { classHighlighter, highlightCode } from '@lezer/highlight'
import type { ReactNode } from 'react'

export const javaLanguage = StreamLanguage.define(java)
export const groovyLanguage = StreamLanguage.define(groovy)
export const typescriptLanguage = StreamLanguage.define(typescript)

const PARSERS: Record<string, Pick<typeof javaLanguage.parser, 'parse'>> = {
  go: goLanguage.parser,
  java: javaLanguage.parser,
  groovy: groovyLanguage.parser,
  typescript: typescriptLanguage.parser,
  ts: typescriptLanguage.parser,
  js: typescriptLanguage.parser,
  javascript: typescriptLanguage.parser,
}

/** Colore du code (Go, Java, Groovy, TypeScript) avec le même analyseur et les mêmes classes que l'éditeur. */
export function highlight(code: string, language: string): ReactNode[] | string {
  const parser = PARSERS[language]
  if (!parser) return code
  const out: ReactNode[] = []
  highlightCode(
    code,
    parser.parse(code),
    classHighlighter,
    (text, classes) => {
      out.push(classes ? <span key={out.length} className={classes}>{text}</span> : text)
    },
    () => out.push('\n'),
  )
  return out
}
