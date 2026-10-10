import type { Progress } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Avancée dans le niveau en cours, en cases (le motif slice) : la dernière case se remplit partiellement. */
export function XpBar({
  progress,
  cells = 10,
  size = 'md',
  className,
}: {
  progress: Progress
  cells?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const span = Math.max(1, progress.next_level_xp - progress.level_floor_xp)
  const into = Math.max(0, progress.xp - progress.level_floor_xp)
  const filled = (Math.min(into, span) / span) * cells
  const cell = { sm: 'h-2 w-2.5', md: 'h-2.5 w-4', lg: 'h-3.5 w-6' }[size]

  return (
    <div
      className={cn('flex gap-[3px]', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={span}
      aria-valuenow={into}
      aria-label={`Niveau ${progress.level} : ${into} XP sur ${span}`}
    >
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={cn(cell, 'overflow-hidden rounded-[2px] bg-cell-empty')}>
          <span
            className="block h-full bg-accent transition-[width] duration-(--dur-slow) ease-(--ease-out)"
            style={{ width: `${Math.max(0, Math.min(1, filled - i)) * 100}%`, transitionDelay: `${i * 40}ms` }}
          />
        </span>
      ))}
    </div>
  )
}

/** Tuile de niveau : la même forme que les étapes de la carte du cours. */
export function LevelTile({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center border-2 border-accent bg-surface font-read font-semibold text-accent tabular-nums',
        {
          sm: 'size-8 rounded-lg text-base',
          md: 'size-12 rounded-xl text-2xl',
          lg: 'size-20 rounded-2xl text-4xl',
        }[size],
      )}
      aria-hidden="true"
    >
      {level}
    </span>
  )
}
