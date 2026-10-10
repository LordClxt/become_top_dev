import { goLanguage } from '@codemirror/lang-go'
import { classHighlighter, highlightCode } from '@lezer/highlight'
import type { ReactNode } from 'react'

/** Colore du code Go avec le même analyseur et les mêmes classes que l'éditeur. */
export function highlightGo(code: string): ReactNode[] {
  const out: ReactNode[] = []
  const tree = goLanguage.parser.parse(code)
  highlightCode(
    code,
    tree,
    classHighlighter,
    (text, classes) => {
      out.push(classes ? <span key={out.length} className={classes}>{text}</span> : text)
    },
    () => out.push('\n'),
  )
  return out
}
