import { cn } from '@/lib/utils'

const LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * Les 7 jours de la semaine en cours (lundi à dimanche) : aujourd'hui s'allume,
 * les jours précédents de la série sont pleins. Dérivé de la série seule, sans appel réseau.
 */
export function WeekDots({ days, className }: { days: number; className?: string }) {
  const today = (new Date().getDay() + 6) % 7 // lundi = 0
  return (
    <ol className={cn('flex gap-2', className)} aria-label={`Série de ${days} jours`}>
      {LABELS.map((l, i) => {
        const active = i <= today && today - i < days
        const isToday = i === today
        return (
          <li key={i} className="grid justify-items-center gap-1">
            <span
              className={cn(
                'size-4 rounded-[4px]',
                active ? 'bg-accent' : 'bg-cell-empty',
                isToday && 'juice-dot-today ring-2 ring-accent/40 ring-offset-2 ring-offset-surface',
              )}
              style={active ? { animationDelay: `${i * 60}ms` } : undefined}
            />
            <span className={cn('font-code text-[10px]', isToday ? 'text-text' : 'text-muted')}>{l}</span>
          </li>
        )
      })}
    </ol>
  )
}
