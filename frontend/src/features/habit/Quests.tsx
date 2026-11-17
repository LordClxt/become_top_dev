import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, CircleCheckBig, FlaskConical, Layers, Sparkles, Target, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { Button } from '@/components/ui/button'
import { useCountUp } from '@/features/juice/useCountUp'
import { play } from '@/features/juice/sound'
import { announceXp } from '@/features/xp/xp-events'
import type { Today, TodayQuest } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useClaimChest, useClaimQuest } from './queries'

function iconFor(id: string) {
  if (id.startsWith('lesson')) return BookOpen
  if (id.startsWith('answer') || id.startsWith('quiz')) return CircleCheckBig
  if (id.startsWith('exercise') || id.startsWith('lab')) return FlaskConical
  if (id.startsWith('review')) return Layers
  if (id.startsWith('xp')) return Zap
  return Target
}

/** Les trois quêtes du jour, puis le coffre qui les couronne. */
export function Quests({ today }: { today: Today }) {
  const done = today.quests.filter((q) => q.done).length
  return (
    <section aria-labelledby="quests-title">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="quests-title" className="font-read text-2xl font-semibold tracking-tight">
          Quêtes du jour
        </h2>
        <span className="font-code text-xs text-muted tabular-nums">{done}/3</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
        <ul className="grid gap-2.5">
          {today.quests.map((q) => (
            <QuestRow key={q.id} quest={q} />
          ))}
        </ul>
        <Chest today={today} done={done} />
      </div>
    </section>
  )
}

function QuestRow({ quest: q }: { quest: TodayQuest }) {
  const claim = useClaimQuest()
  const Icon = iconFor(q.id)
  const claimable = q.done && !q.claimed
  const cells = q.need <= 10
  return (
    <motion.li
      layout
      className={cn(
        'flex items-center gap-4 rounded-2xl border bg-surface/80 p-4 backdrop-blur transition-colors duration-(--dur-base)',
        claimable ? 'habit-claimable border-accent' : 'border-line',
        q.claimed && 'opacity-75',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl border',
          q.claimed ? 'border-accent bg-accent text-accent-ink' : q.done ? 'border-accent text-accent' : 'border-line bg-ink text-muted',
        )}
      >
        {q.claimed ? <Check className="size-5" strokeWidth={3} /> : <Icon className="size-5" strokeWidth={1.75} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium leading-snug', q.claimed && 'text-muted line-through decoration-line')}>{q.title}</p>
        <div className="mt-2 flex items-center gap-3">
          {cells ? (
            <SliceMeter len={Math.min(q.have, q.need)} cap={q.need} size="sm" label={`${q.have} sur ${q.need}`} />
          ) : (
            <span className="h-2 w-32 overflow-hidden rounded-full bg-cell-empty">
              <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.min(100, (q.have / q.need) * 100)}%` }} />
            </span>
          )}
          <span className="font-code text-xs text-muted tabular-nums">
            {Math.min(q.have, q.need)}/{q.need}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        {claimable ? (
          <Button
            size="sm"
            className="rounded-lg"
            disabled={claim.isPending}
            onClick={() => {
              play('xp')
              claim.mutate({ id: q.id, title: q.title })
            }}
          >
            Récupérer +{q.xp}
          </Button>
        ) : q.claimed ? (
          <span className="font-code text-sm text-accent">+{q.xp} XP</span>
        ) : (
          <span className="rounded-lg border border-line px-2.5 py-1 font-code text-xs text-muted">+{q.xp} XP</span>
        )}
      </div>
    </motion.li>
  )
}

type Phase = 'idle' | 'opening' | 'revealed'

/** Le coffre du jour : fermé tant que les trois quêtes ne sont pas faites, puis un vrai moment d'ouverture. */
function Chest({ today, done }: { today: Today; done: number }) {
  const qc = useQueryClient()
  const claim = useClaimChest()
  const [phase, setPhase] = useState<Phase>('idle')
  const [amount, setAmount] = useState<number | null>(null)
  const { ready, claimed } = today.chest
  const open = claimed || phase !== 'idle'
  const value = amount ?? today.chest.xp ?? 0
  const shown = useCountUp(phase === 'revealed' ? value : 0, 1100)

  const onOpen = () => {
    setPhase('opening')
    play('flip')
    const t0 = Date.now()
    claim.mutate(undefined, {
      onSuccess: (res) => {
        setAmount(res.xp_awarded)
        // Laisse le couvercle s'ouvrir avant de révéler le montant.
        setTimeout(() => {
          setPhase('revealed')
          play('levelup')
          announceXp({ amount: res.xp_awarded, reason: 'Coffre du jour', kind: 'chest' })
          void qc.invalidateQueries({ queryKey: ['today'] })
        }, Math.max(0, 900 - (Date.now() - t0)))
      },
      onError: () => setPhase('idle'),
    })
  }

  return (
    <div
      className={cn(
        'relative isolate flex flex-col items-center justify-center overflow-hidden rounded-2xl border p-5 text-center',
        ready && !claimed ? 'border-accent bg-surface' : 'border-line bg-surface/60',
      )}
    >
      {(ready || claimed) && <div className="glow-accent pointer-events-none absolute -top-10 left-1/2 -z-10 size-48 -translate-x-1/2 rounded-full" aria-hidden="true" />}
      <span className={cn('block', open && 'pt-5')}>
        <ChestArt state={!ready && !claimed ? 'locked' : open ? 'open' : 'ready'} opening={phase === 'opening'} />
      </span>
      <div className="mt-3 min-h-[68px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {phase === 'revealed' || claimed ? (
            <motion.div key="won" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
              <p className="flex items-center justify-center gap-1.5 font-code text-2xl font-semibold text-accent tabular-nums">
                <Sparkles className="size-4" />+{phase === 'revealed' ? shown : value} XP
              </p>
              <p className="mt-1 text-xs text-muted">Reviens demain pour de nouvelles quêtes.</p>
            </motion.div>
          ) : ready ? (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button className="rounded-lg" onClick={onOpen} disabled={phase === 'opening'}>
                {phase === 'opening' ? 'Ouverture…' : 'Ouvrir le coffre'}
              </Button>
              <p className="mt-2 text-xs text-muted">Entre 20 et 60 XP</p>
            </motion.div>
          ) : (
            <motion.div key="locked">
              <p className="text-sm font-medium">Coffre du jour</p>
              <p className="mt-1 text-xs text-muted tabular-nums">
                {done} quête{done > 1 ? 's' : ''} sur 3 · 20 à 60 XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Le coffre dessiné en SVG : corps, couvercle bombé articulé, sangles et serrure. Couleurs = jetons du thème. */
function ChestArt({ state, opening }: { state: 'locked' | 'ready' | 'open'; opening: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      viewBox="0 0 120 100"
      className={cn('habit-chest h-24 w-32 overflow-visible', `habit-chest-${state}`, opening && 'habit-chest-opening')}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${uid}-lid`}>
          <path d="M16 50 V34 Q16 14 60 14 Q104 14 104 34 V50 Z" />
        </clipPath>
        <clipPath id={`${uid}-body`}>
          <rect x="16" y="50" width="88" height="42" rx="6" />
        </clipPath>
      </defs>
      {/* Lumière qui s'échappe du coffre ouvert */}
      <g className="habit-chest-rays" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
        <line x1="60" y1="44" x2="60" y2="4" />
        <line x1="52" y1="44" x2="32" y2="12" />
        <line x1="68" y1="44" x2="88" y2="12" />
        <line x1="46" y1="46" x2="14" y2="30" />
        <line x1="74" y1="46" x2="106" y2="30" />
      </g>
      <ellipse className="habit-chest-inner" cx="60" cy="50" rx="40" ry="5" fill="var(--accent)" />
      {/* Corps */}
      <g clipPath={`url(#${uid}-body)`}>
        <rect x="16" y="50" width="88" height="42" fill="var(--surface-2)" />
        <rect x="16" y="50" width="88" height="7" fill="var(--cell-empty)" />
        <rect x="30" y="50" width="9" height="42" fill="var(--accent)" />
        <rect x="81" y="50" width="9" height="42" fill="var(--accent)" />
        {/* Planches et pieds : il se lit comme un coffre, pas comme un sac */}
        <path d="M16 71 H104" stroke="var(--line)" strokeWidth="1.5" />
        <rect x="16" y="86" width="88" height="6" fill="var(--line)" />
      </g>
      <rect x="16" y="50" width="88" height="42" rx="6" fill="none" stroke="var(--line)" strokeWidth="2" />
      {/* Couvercle : pivote autour de sa charnière arrière */}
      <g className="habit-chest-lid">
        <g clipPath={`url(#${uid}-lid)`}>
          <rect x="16" y="14" width="88" height="36" fill="var(--surface-2)" />
          <rect x="16" y="14" width="88" height="10" fill="var(--surface)" opacity="0.6" />
          <rect x="30" y="14" width="9" height="36" fill="var(--accent)" />
          <rect x="81" y="14" width="9" height="36" fill="var(--accent)" />
          {/* Lèvre du couvercle */}
          <rect x="16" y="45" width="88" height="5" fill="var(--line)" />
        </g>
        <path d="M16 50 V34 Q16 14 60 14 Q104 14 104 34 V50 Z" fill="none" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" />
        {/* Serrure */}
        <rect x="51" y="42" width="18" height="16" rx="4" fill="var(--ink)" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="60" cy="48.5" r="2.4" fill="var(--accent)" />
        <path d="M60 49 V53" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
