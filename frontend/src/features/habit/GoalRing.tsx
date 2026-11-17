import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from '@/features/juice/motion'
import { play } from '@/features/juice/sound'
import { useCountUp } from '@/features/juice/useCountUp'
import { cn } from '@/lib/utils'

/** Anneau d'objectif quotidien : la part d'XP du jour, en arc. `size` en pixels. */
export function Ring({
  have,
  goal,
  size,
  stroke,
  className,
  children,
}: {
  have: number
  goal: number
  size: number
  stroke: number
  className?: string
  children?: React.ReactNode
}) {
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const k = goal > 0 ? Math.min(1, have / goal) : 0
  const met = k >= 1
  return (
    <span className={cn('relative inline-grid place-items-center', met && 'habit-ring-met', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--cell-empty)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - k) }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  )
}

/** Grand anneau de la page « Aujourd'hui », avec ses trois états et la fête quand il se ferme sous les yeux. */
export function GoalRingCard({ have, goal, met, className }: { have: number; goal: number; met: boolean; className?: string }) {
  const shown = useCountUp(have)
  const titleId = useId()
  const box = useRef<HTMLElement>(null)
  const wasMet = useRef(met)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (met && !wasMet.current) {
      setBurst((n) => n + 1)
      // Deux exemplaires (mobile / bureau) : seul celui qui est affiché joue le son.
      if (box.current?.offsetParent) play('complete')
    }
    wasMet.current = met
  }, [met])

  const left = Math.max(0, goal - have)
  const stretch = goal * 2
  return (
    <section ref={box} aria-labelledby={titleId} className={cn('relative isolate overflow-hidden rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur', className)}>
      {met && <div className="glow-accent pointer-events-none absolute -top-20 -right-16 -z-10 size-60 rounded-full" aria-hidden="true" />}
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-sm font-medium">
          Objectif du jour
        </h2>
        <span className="font-code text-xs text-muted tabular-nums">{goal} XP</span>
      </div>
      <div className="mt-5 flex items-center gap-6">
        <span key={burst} className={cn('relative', burst > 0 && 'habit-burst')}>
          <Ring have={have} goal={goal} size={132} stroke={12}>
            <span className="text-center">
              <span className="block font-code text-3xl font-semibold tabular-nums">{shown}</span>
              <span className="block font-code text-xs text-muted tabular-nums">/ {goal} XP</span>
            </span>
          </Ring>
        </span>
        <div className="min-w-0" aria-live="polite">
          {met ? (
            <>
              <p className="font-read text-xl font-semibold text-accent">Objectif atteint</p>
              <p className="mt-1 text-sm text-muted">
                {have >= stretch
                  ? 'Double objectif. Belle journée.'
                  : `Bonus : pousse jusqu'à ${stretch} XP pour un double objectif.`}
              </p>
            </>
          ) : have === 0 ? (
            <>
              <p className="font-read text-xl font-semibold">Pas encore lancé</p>
              <p className="mt-1 text-sm text-muted">Une leçon suffit pour lancer la journée.</p>
            </>
          ) : (
            <>
              <p className="font-read text-xl font-semibold">
                encore <span className="font-code tabular-nums">{left}</span> XP
              </p>
              <p className="mt-1 text-sm text-muted">Un TP ou une leçon de plus et c'est bouclé.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
