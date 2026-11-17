import { Check } from 'lucide-react'
import { type RefObject, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ReadingState = { progress: number; current?: string; read: Set<string> }

/** Avancement de la lecture, calculé au défilement (jamais pendant le rendu serveur). */
export function useReading(article: RefObject<HTMLElement | null>, sectionIds: string[]): ReadingState {
  const [state, setState] = useState<ReadingState>({ progress: 0, current: sectionIds[0], read: new Set() })
  const key = sectionIds.join('|')
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = article.current
      if (!el) return
      const vh = window.innerHeight
      const rect = el.getBoundingClientRect()
      const span = rect.height - vh * 0.6
      const progress = span <= 0 ? 1 : Math.min(1, Math.max(0, (vh * 0.4 - rect.top) / span))
      let currentIdx = 0
      sectionIds.forEach((id, i) => {
        const h = document.getElementById(id)
        if (h && h.getBoundingClientRect().top < vh * 0.3) currentIdx = i
      })
      const read = new Set(sectionIds.slice(0, progress >= 0.995 ? sectionIds.length : currentIdx))
      setState((s) =>
        s.progress === progress && s.current === sectionIds[currentIdx] && s.read.size === read.size
          ? s
          : { progress, current: sectionIds[currentIdx], read },
      )
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: key résume sectionIds
  }, [article, key])
  return state
}

export function ReadingBar({ progress }: { progress: number }) {
  return (
    <div
      className="read-progress"
      role="progressbar"
      aria-label="Progression de la lecture"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}

/** Sommaire collant : sections lues cochées, section en cours surlignée, points de contrôle. */
export function Toc({
  sections,
  reading,
  checkpoints,
  minutesLeft,
  done,
}: {
  sections: { id: string; title: string }[]
  reading: ReadingState
  checkpoints: { solved: number; total: number }
  minutesLeft: number
  done: boolean
}) {
  return (
    <nav className="hidden text-sm xl:sticky xl:top-20 xl:block xl:self-start" aria-label="Sommaire de la leçon">
      <p className="mb-3 flex items-baseline justify-between gap-2 font-medium text-muted">
        Dans cette leçon
        <span className="font-code text-xs text-muted">{Math.round(reading.progress * 100)} %</span>
      </p>
      <ol className="grid gap-0.5 border-l border-line">
        {sections.map((s) => {
          const read = reading.read.has(s.id)
          const current = reading.current === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  '-ml-px flex items-start gap-2 border-l-2 py-1.5 pl-3 leading-snug transition-colors',
                  current ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text',
                )}
              >
                <span className="min-w-0 flex-1">{s.title}</span>
                {read && <Check className="mt-0.5 size-3.5 shrink-0 text-pass" aria-label="lue" />}
              </a>
            </li>
          )
        })}
      </ol>
      <div className="mt-5 grid gap-3 border-t border-line pt-4">
        {checkpoints.total > 0 && (
          <div>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: checkpoints.total }, (_, i) => (
                <span
                  key={i}
                  className={cn('size-3 rounded-[3px] transition-colors', i < checkpoints.solved ? 'bg-accent' : 'bg-cell-empty')}
                />
              ))}
            </div>
            <p className="mt-1.5 text-muted">
              <span className="font-code text-text">
                {checkpoints.solved}/{checkpoints.total}
              </span>{' '}
              points de contrôle
            </p>
          </div>
        )}
        <p className="text-muted">
          {done && reading.progress < 0.05
            ? 'Déjà lue, bonne relecture'
            : minutesLeft <= 0
              ? 'Lecture terminée'
              : `encore ~${minutesLeft} min`}
        </p>
      </div>
    </nav>
  )
}
