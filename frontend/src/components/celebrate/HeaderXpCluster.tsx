import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { StreakFlame } from '@/components/StreakFlame'
import { LevelTile, XpBar } from '@/components/XpBar'
import { onHeaderHit } from '@/features/juice/celebrate'
import { useCountUp } from '@/features/juice/useCountUp'
import { rankFor } from '@/features/xp/ranks'
import type { Progress } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Le cluster XP / niveau / série de l'en-tête : il réagit à chaque gain (la tuile reçoit la pastille,
 * le compteur défile, les cases pulsent) et la flamme s'embrase quand la série augmente.
 * Dimensions fixes : aucun décalage de mise en page pendant les animations.
 */
export function HeaderXpCluster({ progress }: { progress: Progress }) {
  const [hit, setHit] = useState(0)
  useEffect(() => onHeaderHit(() => setHit((n) => n + 1)), [])

  const span = progress.next_level_xp - progress.level_floor_xp
  const into = useCountUp(progress.xp - progress.level_floor_xp)
  const toNext = progress.next_level_xp - progress.xp
  const streak = progress.streak_days
  const rank = rankFor(progress.level)

  const lastStreak = useRef(streak)
  const [ignite, setIgnite] = useState(0)
  useEffect(() => {
    if (streak > lastStreak.current) setIgnite((n) => n + 1)
    lastStreak.current = streak
  }, [streak])

  return (
    <>
      <Link
        to="/profile"
        className="group relative flex items-center gap-3 rounded-lg py-1 pr-3 pl-1 transition-colors duration-(--dur-fast) hover:bg-surface-2"
        aria-label={`Niveau ${progress.level}, ${rank}. ${progress.xp} XP au total, encore ${toNext} XP avant le niveau ${progress.level + 1}.`}
      >
        <span key={`tile-${hit}`} data-xp-target className={cn('rounded-lg', hit > 0 && 'juice-hit')}>
          <LevelTile level={progress.level} size="sm" />
        </span>
        <span className="hidden flex-col gap-1 md:flex">
          <span key={`cells-${hit}`} className={cn(hit > 0 && 'juice-cells-pulse')}>
            <XpBar progress={progress} size="sm" />
          </span>
          <span className="font-code text-[11px] leading-none text-muted tabular-nums">
            <span className={cn(hit > 0 && into !== progress.xp - progress.level_floor_xp && 'text-accent')}>{into}</span>/
            {span} XP
          </span>
        </span>
        {/* Infobulle : rang et chemin vers le niveau suivant. */}
        <span
          className="juice-tip pointer-events-none absolute hidden md:block top-full left-0 z-50 mt-2 w-max max-w-[260px] rounded-lg border border-line bg-surface px-3 py-2 text-left shadow-lg"
          aria-hidden="true"
        >
          <span className="block font-read text-base font-semibold">
            Niveau {progress.level} · <span className="text-accent italic">{rank}</span>
          </span>
          <span className="block text-xs text-muted">
            {progress.xp} XP au total. Encore {toNext} XP avant le niveau {progress.level + 1}.
          </span>
        </span>
      </Link>
      <Link
        to="/profile"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors duration-(--dur-fast) hover:bg-surface-2',
          streak > 0 ? 'text-text' : 'text-muted',
        )}
        title={
          streak > 0
            ? `${streak} jour${streak > 1 ? 's' : ''} d’affilée avec au moins une activité`
            : 'Aucune série en cours : une leçon, un TP ou un quiz aujourd’hui la démarre'
        }
      >
        <span key={`flame-${ignite}`} className={cn('inline-flex', ignite > 0 && 'juice-ignite')}>
          <StreakFlame lit={streak > 0} />
        </span>
        <span className="font-medium tabular-nums">{streak}</span>
        <span className="sr-only">{streak > 1 ? 'jours de série' : 'jour de série'}</span>
      </Link>
    </>
  )
}
