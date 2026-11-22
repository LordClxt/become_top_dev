import { useQuery } from '@tanstack/react-query'
import { Flame, Swords, Trophy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Confetti } from '@/components/celebrate/Confetti'
import { WeekDots } from '@/components/celebrate/WeekDots'
import { StreakFlame } from '@/components/StreakFlame'
import { LevelTile, XpBar } from '@/components/XpBar'
import { progressQuery } from '@/features/courses/queries'
import {
  celebrate,
  currentMoment,
  dismissMoment,
  hitHeader,
  isBigGain,
  launchPoint,
  type QueuedMoment,
  subscribeMoments,
  trackPointer,
} from '@/features/juice/celebrate'
import { useJuiceEnabled } from '@/features/juice/motion'
import { useFocusActive } from '@/features/session/focus'
import { installSoundUnlock, play } from '@/features/juice/sound'
import { rankFor } from '@/features/xp/ranks'
import { announceXp, useXpGains, type XpGain } from '@/features/xp/xp-events'
import type { Progress } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Couche de célébration, montée une fois (via XpToaster) :
 * - petits gains : la pastille « +N XP » vole vers la tuile de niveau de l'en-tête ;
 * - leçon, TP, devoir, projet, boss, niveau, série, module : un moment centré, bref, congédiable ;
 * - mouvement réduit ou célébrations coupées : une simple notification statique ;
 * - mode concentration : rien pendant le travail ; à la sortie, un seul bilan des XP gagnés, puis les moments retenus.
 * Rien ici ne capte le focus ni n'empêche une touche d'atteindre l'éditeur.
 */
export function CelebrationLayer({ onFallback }: { onFallback: (text: FallbackToast) => void }) {
  const juice = useJuiceEnabled()
  const { data: progress } = useQuery(progressQuery)
  const [flights, setFlights] = useState<Flight[]>([])
  const seq = useRef(0)
  const lastProgress = useRef<Progress | null>(null)
  // Instant du dernier « grand » gain : seul un grand gain autorise un moment centré pour la série ou le niveau.
  const lastBigAt = useRef(0)
  const [corner, setCorner] = useState<(CornerMoment & { key: number })[]>([])
  const focus = useFocusActive()
  const focusRef = useRef(focus)
  focusRef.current = focus
  const held = useRef<{ xp: number; moments: Parameters<typeof celebrate>[0][] }>({ xp: 0, moments: [] })

  useEffect(() => {
    installSoundUnlock()
    // En développement : déclencher une célébration depuis la console (`__btdAnnounce({...})`, `__btdCelebrate({...})`).
    if (import.meta.env.DEV) Object.assign(window, { __btdAnnounce: announceXp, __btdCelebrate: celebrate })
    return trackPointer()
  }, [])

  // Gains annoncés par les actions.
  const onGain = useCallback(
    (gain: XpGain) => {
      if (focusRef.current) {
        held.current.xp += Math.max(0, gain.amount)
        return
      }
      if (isBigGain(gain)) {
        lastBigAt.current = Date.now()
        if (juice) celebrate({ type: 'gain', gain })
        else {
          play('complete')
          if (gain.amount > 0) hitHeader(gain.amount)
          onFallback({ tone: gain.kind === 'boss' ? 'strong' : 'xp', amount: gain.amount, text: bigLabel(gain) })
        }
        return
      }
      if (gain.amount <= 0) return
      if (juice) {
        const from = launchPoint()
        setFlights((f) => [...f, { key: ++seq.current, amount: gain.amount, from }])
      } else {
        hitHeader(gain.amount)
        onFallback({ tone: 'xp', amount: gain.amount, text: gain.reason })
      }
    },
    [juice, onFallback],
  )
  useXpGains(onGain)

  // Ce que révèle la progression : niveau, série, module maîtrisé (jamais déduit côté client).
  useEffect(() => {
    if (!progress) return
    const prev = lastProgress.current
    lastProgress.current = progress
    if (!prev) return
    const moments: Parameters<typeof celebrate>[0][] = []
    for (const [id, m] of Object.entries(progress.chapters)) {
      if (m.mastered && prev.chapters[id] && !prev.chapters[id].mastered) moments.push({ type: 'mastered' })
    }
    if (progress.streak_days > prev.streak_days) moments.push({ type: 'streak', days: progress.streak_days })
    if (progress.level > prev.level) moments.push({ type: 'level', level: progress.level })
    if (focusRef.current) {
      held.current.moments.push(...moments)
      return
    }
    const afterBig = Date.now() - lastBigAt.current < 8000
    for (const m of moments) {
      if (juice && afterBig) celebrate(m)
      else if (juice && (m.type === 'level' || m.type === 'streak')) {
        const cm: CornerMoment = m
        // Après un petit gain : carte en coin, non bloquante, l'explication reste lisible.
        play(m.type === 'level' ? 'levelup' : 'complete')
        const key = ++seq.current
        setCorner((list) => [...list, { ...cm, key }])
        setTimeout(() => setCorner((list) => list.filter((c) => c.key !== key)), 4200)
      } else if (juice) celebrate(m)
      else {
        play(m.type === 'level' ? 'levelup' : 'complete')
        onFallback({
          tone: 'strong',
          text:
            m.type === 'level'
              ? `Niveau ${m.level} atteint · ${rankFor(m.level)}`
              : m.type === 'streak'
                ? `Série : ${m.days} jour${m.days > 1 ? 's' : ''}`
                : 'Module maîtrisé',
        })
      }
    }
  }, [progress, juice, onFallback])

  // Sortie du mode concentration : le bilan de ce qui a été retenu.
  useEffect(() => {
    if (focus) return
    const { xp, moments } = held.current
    held.current = { xp: 0, moments: [] }
    if (xp > 0) {
      play('complete')
      hitHeader(xp)
      onFallback({ tone: 'strong', amount: xp, text: 'pendant la concentration' })
    }
    for (const m of moments) {
      if (juice) celebrate(m)
      else
        onFallback({
          tone: 'strong',
          text: m.type === 'level' ? `Niveau ${m.level} atteint` : m.type === 'streak' ? `Série : ${m.days} jour${m.days > 1 ? 's' : ''}` : 'Module maîtrisé',
        })
    }
  }, [focus, juice, onFallback])

  const moment = useSyncExternalStore(subscribeMoments, currentMoment, () => null)

  return (
    <>
      {flights.map((f) => (
        <FlyingXp key={f.key} flight={f} onDone={() => setFlights((list) => list.filter((x) => x.key !== f.key))} />
      ))}
      <div className="pointer-events-none fixed right-4 bottom-20 z-[60] grid justify-items-end gap-2 md:right-6 md:bottom-6">
        {corner.map((c) => (
          <CornerCard key={c.key} moment={c} />
        ))}
      </div>
      {moment && <MomentOverlay key={moment.key} moment={moment} progress={progress ?? null} />}
    </>
  )
}

export type FallbackToast = { tone: 'xp' | 'strong'; amount?: number; text: string }

function bigLabel(gain: XpGain): string {
  const what = {
    lesson: 'Leçon terminée',
    lab: 'TP réussi',
    assignment: 'Devoir réussi',
    project: 'Projet réussi',
    boss: 'Boss vaincu',
  }[gain.kind as 'lesson'] ?? gain.reason
  return gain.title ? `${what} : ${gain.title}` : what
}

// --- Pastille volante -----------------------------------------------------------

type Flight = { key: number; amount: number; from: { x: number; y: number } }

function FlyingXp({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const el = ref.current
    const target = document.querySelector('[data-xp-target]')
    const finish = () => {
      hitHeader(flight.amount)
      play('xp')
      done.current()
    }
    if (!el || !target) {
      finish()
      return
    }
    const t = target.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (flight.from.x)
    const dy = t.top + t.height / 2 - (flight.from.y)
    // Trajectoire courbe : la pastille monte d'abord un peu, puis file vers la tuile en rétrécissant.
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, calc(-50% - 34px)) scale(1.1)', opacity: 1, offset: 0.22 },
        { transform: 'translate(-50%, calc(-50% - 40px)) scale(1)', opacity: 1, offset: 0.42 },
        {
          transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.35 - 60}px)) scale(0.8)`,
          opacity: 1,
          offset: 0.72,
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`, opacity: 0.2 },
      ],
      { duration: 1050, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' },
    )
    void r
    anim.onfinish = finish
    return () => {
      anim.onfinish = null
      anim.cancel()
    }
  }, [flight])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-[75] flex items-center gap-1.5 rounded-full border border-accent bg-surface px-3 py-1 font-code text-sm font-semibold text-accent tabular-nums shadow-[0_10px_30px_-10px_var(--accent)]"
      style={{ left: flight.from.x, top: flight.from.y, opacity: 0 }}
      aria-hidden="true"
    >
      <span className="size-1.5 rounded-[2px] bg-accent" />+{flight.amount} XP
    </div>
  )
}

// --- Moment centré ------------------------------------------------------------------

const DURATION: Record<string, number> = { gain: 2200, boss: 2900, level: 2700, streak: 2400, mastered: 2500 }

function MomentOverlay({ moment, progress }: { moment: QueuedMoment; progress: Progress | null }) {
  const [leaving, setLeaving] = useState(false)
  const boss = moment.type === 'gain' && moment.gain.kind === 'boss'
  const strong = moment.type === 'gain' && moment.gain.kind !== 'lesson'
  const life = boss ? DURATION.boss : DURATION[moment.type]

  // Barre d'XP : on part de la progression d'avant le gain pour la voir se remplir.
  const before = useRef<Progress | null>(
    progress && moment.type === 'gain'
      ? { ...progress, xp: Math.max(progress.level_floor_xp, progress.xp - moment.gain.amount) }
      : progress,
  )
  const [barProgress, setBarProgress] = useState<Progress | null>(before.current)
  useEffect(() => {
    const id = setTimeout(() => setBarProgress(progress), 280)
    return () => clearTimeout(id)
  }, [progress])

  useEffect(() => {
    if (moment.type === 'level' || boss || moment.type === 'mastered') play('levelup')
    else play('complete')
    if (moment.type === 'gain' && moment.gain.amount > 0) {
      const id = setTimeout(() => hitHeader(moment.gain.amount), 900)
      return () => clearTimeout(id)
    }
  }, [moment, boss])

  useEffect(() => {
    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      setLeaving(true)
      setTimeout(() => dismissMoment(moment.key), 220)
    }
    const timer = setTimeout(close, life)
    // Clic, Échap ou n'importe quelle touche : on ferme sans consommer l'événement (l'éditeur le reçoit toujours).
    const arm = setTimeout(() => {
      window.addEventListener('keydown', close, true)
      window.addEventListener('pointerdown', close, true)
    }, 150)
    return () => {
      clearTimeout(timer)
      clearTimeout(arm)
      window.removeEventListener('keydown', close, true)
      window.removeEventListener('pointerdown', close, true)
    }
  }, [moment.key, life])

  const confetti =
    moment.type === 'streak' ? null : boss ? (
      <Confetti count={170} bursts={3} colors={['--fail', '--pass', '--text', '--pass']} />
    ) : strong || moment.type === 'level' ? (
      <Confetti count={150} bursts={2} />
    ) : (
      <Confetti count={120} />
    )

  return (
    <div
      className={cn('juice-moment pointer-events-none fixed inset-0 z-[65] grid place-items-center px-4', leaving && 'is-leaving')}
      role="status"
      aria-live="polite"
    >
      <div className="juice-backdrop absolute inset-0" aria-hidden="true" />
      {confetti}
      <div
        className={cn(
          'juice-card relative grid w-full max-w-[420px] justify-items-center gap-3 rounded-2xl border bg-surface px-8 pt-8 pb-7 text-center',
          boss ? 'juice-boss border-fail' : 'border-accent/60',
        )}
      >
        <MomentBody moment={moment} progress={barProgress} boss={boss} />
        <p className="mt-1 text-[11px] text-muted">Une touche ou un clic pour continuer</p>
      </div>
    </div>
  )
}

function MomentBody({ moment, progress, boss }: { moment: QueuedMoment; progress: Progress | null; boss: boolean }) {
  if (moment.type === 'level') {
    return (
      <>
        <Eyebrow>Niveau supérieur</Eyebrow>
        <span className="juice-pop">
          <LevelTile level={moment.level} size="lg" />
        </span>
        <h2 className="font-read text-4xl font-semibold tracking-tight">Niveau {moment.level}</h2>
        <p className="font-read text-xl text-accent italic">{rankFor(moment.level)}</p>
      </>
    )
  }
  if (moment.type === 'streak') {
    return (
      <>
        <Eyebrow>
          <Flame className="size-3.5" /> Première activité du jour
        </Eyebrow>
        <span className="juice-pop">
          <StreakFlame lit className="size-16" />
        </span>
        <h2 className="font-read text-3xl font-semibold tracking-tight">
          Série : {moment.days} jour{moment.days > 1 ? 's' : ''}
        </h2>
        <WeekDots days={moment.days} />
        <p className="text-sm text-muted">Reviens demain pour la prolonger.</p>
      </>
    )
  }
  if (moment.type === 'mastered') {
    return (
      <>
        <Eyebrow>
          <Trophy className="size-3.5" /> Seuil de maîtrise atteint
        </Eyebrow>
        <span className="juice-pop grid size-16 place-items-center rounded-2xl border-2 border-accent text-accent">
          <Trophy className="size-8" />
        </span>
        <h2 className="font-read text-3xl font-semibold tracking-tight">Module maîtrisé</h2>
        <p className="text-sm text-muted">{moment.title ?? 'Tu as atteint le seuil de maîtrise de ce module.'}</p>
      </>
    )
  }
  const { gain } = moment
  const label = {
    lesson: 'Leçon terminée',
    lab: 'TP réussi',
    assignment: 'Devoir réussi',
    project: 'Projet réussi',
    boss: 'Boss vaincu',
  }[gain.kind as 'lesson']
  return (
    <>
      <Eyebrow boss={boss}>
        {boss && <Swords className="size-3.5" />}
        {boss ? 'Combat terminé' : label}
      </Eyebrow>
      {boss && <h2 className="juice-boss-title font-read text-4xl font-semibold tracking-tight">Boss vaincu</h2>}
      {gain.amount > 0 && (
        <p className={cn('juice-pop font-code text-6xl font-semibold tabular-nums', boss ? 'text-pass' : 'text-accent')}>
          +{gain.amount}<span className="ml-2 text-3xl">XP</span>
        </p>
      )}
      {gain.title && <p className="max-w-full font-read text-xl leading-snug text-balance">{gain.title}</p>}
      {progress && (
        <div className="mt-2 grid justify-items-center gap-1.5">
          <XpBar progress={progress} size="lg" />
          <span className="font-code text-xs text-muted tabular-nums">
            Niveau {progress.level} · {progress.xp - progress.level_floor_xp}/{progress.next_level_xp - progress.level_floor_xp} XP
          </span>
        </div>
      )}
    </>
  )
}

function Eyebrow({ children, boss }: { children: React.ReactNode; boss?: boolean }) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 font-code text-[11px] font-semibold tracking-[0.14em] uppercase',
        boss ? 'text-fail' : 'text-accent',
      )}
    >
      {children}
    </p>
  )
}

type CornerMoment = { type: 'level'; level: number } | { type: 'streak'; days: number }

/** Carte de coin : même contenu qu'un moment, en compact ; ne prend jamais le focus ni le centre de l'écran. */
function CornerCard({ moment }: { moment: CornerMoment }) {
  return (
    <div
      className="juice-corner flex w-[300px] max-w-[calc(100vw-2rem)] items-center gap-4 rounded-2xl border border-accent/60 bg-surface p-4 shadow-[0_24px_60px_-24px_var(--accent)]"
      role="status"
      aria-live="polite"
    >
      {moment.type === 'level' ? (
        <>
          <span className="juice-pop">
            <LevelTile level={moment.level} size="md" />
          </span>
          <span className="min-w-0">
            <span className="block font-code text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">Niveau supérieur</span>
            <span className="block font-read text-xl font-semibold">Niveau {moment.level}</span>
            <span className="block font-read text-accent italic">{rankFor(moment.level)}</span>
          </span>
        </>
      ) : (
        <>
          <span className="juice-pop">
            <StreakFlame lit className="size-10" />
          </span>
          <span className="grid min-w-0 gap-1.5">
            <span className="font-code text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">Première activité du jour</span>
            <span className="font-read text-lg font-semibold">
              Série : {moment.days} jour{moment.days > 1 ? 's' : ''}
            </span>
            <WeekDots days={moment.days} className="gap-1.5" />
          </span>
        </>
      )}
    </div>
  )
}
