import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Coffee, Layers, NotebookPen, Pause, Play, SkipForward, Square, Timer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { play } from '@/features/juice/sound'
import { continueLink, todayQuery } from '@/features/habit/queries'
import { cn } from '@/lib/utils'
import {
  formatClock,
  PHASE_HINT,
  PHASE_LABEL,
  type PhaseKind,
  type SessionView,
  skipPhase,
  startSession,
  stopSession,
  suggestedTemplate,
  TEMPLATES,
  type TemplateId,
  togglePause,
  totalMin,
  useSession,
} from './timer'

const PHASE_ICON: Record<PhaseKind, typeof Timer> = { review: Layers, work: Timer, break: Coffee, recap: NotebookPen }

/** Pastille de l'en-tête : la phase en cours et le temps qui lui reste ; un clic ouvre le détail. */
export function SessionPill() {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!session) return null
  const kind = session.phase?.kind
  const Icon = kind ? PHASE_ICON[kind] : Timer
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={
          session.ended
            ? 'Séance terminée'
            : `Séance ${session.template.label} : ${PHASE_LABEL[kind!]}, encore ${formatClock(session.remainingMs)}${session.paused ? ', en pause' : ''}`
        }
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors duration-(--dur-fast) hover:bg-surface-2',
          kind === 'break' ? 'border-pass/50 text-pass' : 'border-line',
          session.paused && 'opacity-70',
        )}
      >
        <Icon className={cn('size-3.5', kind !== 'break' && 'text-accent')} aria-hidden="true" />
        <span className="hidden sm:inline">{session.ended ? 'Terminée' : PHASE_LABEL[kind!]}</span>
        {!session.ended && <span className="font-code text-xs tabular-nums">{formatClock(session.remainingMs)}</span>}
        {session.paused && <Pause className="size-3" aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.6)]">
          <SessionDetail session={session} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

/** Le plan de la séance, la consigne de la phase et les commandes. */
function SessionDetail({ session, onNavigate }: { session: SessionView; onNavigate?: () => void }) {
  const { data: today } = useQuery(todayQuery)
  const kind = session.phase?.kind
  const next = today?.continue
  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-code text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          Séance {session.template.label} · {totalMin(session.template)} min
        </p>
        <span className="font-code text-xs text-muted tabular-nums">
          {Math.min(totalMin(session.template), Math.floor(session.elapsedMs / 60_000))} min
        </span>
      </div>
      <PhaseStrip session={session} />
      {session.ended ? (
        <p className="text-sm text-muted">
          Séance terminée. Note ce que tu retiens si ce n'est pas fait, puis arrête-toi là : la suite se consolide pendant la
          pause.
        </p>
      ) : (
        <div>
          <p className="font-read text-lg font-semibold">
            {PHASE_LABEL[kind!]} <span className="font-code text-sm font-normal text-muted tabular-nums">· {formatClock(session.remainingMs)}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{PHASE_HINT[kind!]}</p>
          {kind === 'review' && (
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg">
              <Link to="/review" onClick={onNavigate}>
                Réviser{today && today.review_due > 0 ? ` (${today.review_due})` : ''} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
          {kind === 'work' && next && (
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg">
              <Link {...continueLink(next)} onClick={onNavigate}>
                {next.label} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {!session.ended && (
          <>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={togglePause}>
              {session.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {session.paused ? 'Reprendre' : 'Pause'}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={skipPhase}>
              <SkipForward className="size-3.5" /> Suivante
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="ml-auto rounded-lg text-muted" onClick={stopSession}>
          <Square className="size-3.5" /> {session.ended ? 'Fermer' : 'Arrêter'}
        </Button>
      </div>
    </div>
  )
}

/** Une case par phase, largeur proportionnelle à sa durée ; la phase en cours se remplit. */
function PhaseStrip({ session }: { session: SessionView }) {
  const phases = session.template.phases
  let before = 0
  return (
    <ol className="flex gap-1" aria-label="Plan de la séance">
      {phases.map((p, i) => {
        const startMs = before
        before += p.min * 60_000
        const fill = i < session.index ? 1 : i > session.index ? 0 : Math.min(1, (session.elapsedMs - startMs) / (p.min * 60_000))
        return (
          <li key={i} className="grid min-w-0 content-start gap-1" style={{ flex: p.min }} title={`${PHASE_LABEL[p.kind]} ${p.min} min`}>
            <span className="relative block h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className={cn('absolute inset-y-0 left-0 rounded-full', p.kind === 'break' ? 'bg-pass' : 'bg-accent')}
                style={{ width: `${fill * 100}%` }}
              />
            </span>
            {/* Les phases courtes (pause, bilan) n'ont pas la place d'un libellé : la couleur et la consigne suffisent. */}
            <span
              className={cn('truncate text-[10px]', i === session.index ? 'text-text' : 'text-muted', p.min < 10 && 'sr-only')}
            >
              {PHASE_LABEL[p.kind]} {p.min}
              <span className="sr-only"> min{i === session.index ? ', en cours' : i < session.index ? ', faite' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Carte du tableau de bord : démarrer une séance du matin ou du soir, ou suivre celle en cours. */
export function SessionCard() {
  const session = useSession()
  const [suggested, setSuggested] = useState<TemplateId>('morning')
  // L'heure du navigateur, pas celle du serveur.
  useEffect(() => setSuggested(suggestedTemplate()), [])

  if (session) {
    return (
      <section aria-label="Séance en cours" className="rounded-2xl border border-accent/40 bg-surface/80 p-6 backdrop-blur">
        <SessionDetail session={session} />
      </section>
    )
  }
  return (
    <section aria-labelledby="session-title" className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-accent bg-ink text-accent">
          <Timer className="size-4" />
        </span>
        <div>
          <h2 id="session-title" className="font-read text-lg font-semibold">
            Démarrer une séance
          </h2>
          <p className="text-sm text-muted">Révision, blocs de travail, pauses, bilan.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['morning', 'evening'] as const).map((id) => {
          const t = TEMPLATES[id]
          const works = t.phases.filter((p) => p.kind === 'work')
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                startSession(id)
                play('bell')
              }}
              className={cn(
                'grid gap-0.5 rounded-xl border p-3 text-left transition-colors duration-(--dur-fast) hover:border-accent',
                id === suggested ? 'border-accent/60 bg-accent/10' : 'border-line',
              )}
            >
              <span className="font-medium">
                {t.label} <span className="font-code text-sm text-muted tabular-nums">{totalMin(t)} min</span>
              </span>
              <span className="text-xs text-muted">
                {works.length} × {works[0]?.min ?? 0} min de travail
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const NOTICE_MS = 7000

/**
 * À monter une fois : à chaque changement de phase, une cloche douce et une carte en coin qui dit quoi faire.
 * Rien ne prend le focus ; la carte disparaît seule.
 */
export function SessionWatcher() {
  const session = useSession()
  const last = useRef<string | null>(null)
  const [notice, setNotice] = useState<{ key: number; title: string; text: string } | null>(null)
  const seq = useRef(0)

  const id = session ? `${session.template.id}:${session.index}` : null
  useEffect(() => {
    const prev = last.current
    last.current = id
    // Premier rendu ou nouvelle séance : pas d'annonce.
    if (!session || !prev || !id || prev.split(':')[0] !== id.split(':')[0] || prev === id) return
    play('bell')
    const kind = session.phase?.kind
    const key = ++seq.current
    setNotice({
      key,
      title: session.ended ? 'Séance terminée' : `${PHASE_LABEL[kind!]} · ${session.phase!.min} min`,
      text: session.ended ? 'Bravo. Arrête-toi là : la suite se consolide pendant la pause.' : PHASE_HINT[kind!],
    })
    const t = setTimeout(() => setNotice((n) => (n?.key === key ? null : n)), NOTICE_MS)
    return () => clearTimeout(t)
    // biome-ignore lint/correctness/useExhaustiveDependencies: une annonce par changement de phase
  }, [id])

  if (!notice) return null
  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[60] md:right-6 md:bottom-6" role="status" aria-live="polite">
      <div
        key={notice.key}
        className="session-notice w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-accent/60 bg-surface p-4 shadow-[0_24px_60px_-24px_var(--accent)]"
        style={{ animationDuration: `${NOTICE_MS}ms` }}
      >
        <p className="flex items-center gap-2 font-read text-lg font-semibold">
          <Timer className="size-4 text-accent" aria-hidden="true" /> {notice.title}
        </p>
        <p className="mt-1 text-sm text-muted">{notice.text}</p>
      </div>
    </div>
  )
}
