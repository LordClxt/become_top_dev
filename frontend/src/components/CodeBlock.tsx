import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { highlightLines } from '@/lib/highlight'
import { cn } from '@/lib/utils'

type Props = {
  code: string
  language?: string
  /** Barre de titre (nom de fichier). */
  title?: string
  /** Lignes surlignées (1-based). */
  highlight?: Set<number>
  /** Atténue les lignes non surlignées (pas à pas). */
  dim?: boolean
  /** Bouton « copier » (désactivable dans les colonnes étroites). */
  copy?: boolean
  /** Fait défiler la première ligne surlignée dans le bloc quand elle change. */
  follow?: boolean
  className?: string
}

export function CodeBlock({ code, language = 'go', title, highlight, dim, copy = true, follow, className }: Props) {
  const trimmed = code.replace(/\n$/, '')
  const lines = highlightLines(trimmed, language)
  const preRef = useRef<HTMLPreElement>(null)
  const first = highlight && highlight.size > 0 ? Math.min(...highlight) : 0

  useEffect(() => {
    if (!follow || !first) return
    const pre = preRef.current
    const line = pre?.querySelector<HTMLElement>(`[data-line="${first}"]`)
    if (!pre || !line) return
    // Défilement interne au bloc uniquement : la page ne doit pas sauter.
    const top = line.offsetTop - pre.clientHeight / 3
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    pre.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
  }, [follow, first])

  return (
    <div className={cn('code-frame group/code', title && 'has-title', className)}>
      {title && (
        <div className="code-title">
          <span className="code-title-dots" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </div>
      )}
      {copy && <CopyButton text={trimmed} />}
      <pre ref={preRef} className={cn('code-block', dim && highlight && highlight.size > 0 && 'is-dimmed')}>
        <code>
          {lines.map((l, i) => (
            <span key={i} data-line={i + 1} className={cn('code-line', highlight?.has(i + 1) && 'is-hl')}>
              {l.length ? l : ' '}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(t)
  }, [done])
  return (
    <button
      type="button"
      className="code-copy"
      aria-label={done ? 'Code copié' : 'Copier le code'}
      title={done ? 'Copié' : 'Copier'}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setDone(true))
      }}
    >
      {done ? <Check className="size-3.5 text-pass" /> : <Copy className="size-3.5" />}
    </button>
  )
}
