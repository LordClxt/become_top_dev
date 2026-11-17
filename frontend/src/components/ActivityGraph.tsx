import { useQuery } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type ActivityDay, api } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Part d'accent mélangée à la case vide, par niveau d'intensité 0–4. */
const MIX = [0, 30, 55, 78, 100]
const cellColor = (level: number) =>
  level === 0 ? 'var(--cell-empty)' : `color-mix(in oklab, var(--accent) ${MIX[level]}%, var(--cell-empty))`

const DAY_LABELS = ['lun.', '', 'mer.', '', 'ven.', '', '']

const parse = (iso: string) => new Date(`${iso}T12:00:00`)
const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

function describe(d: ActivityDay): string {
  const parts = [
    d.lessons && `${d.lessons} leçon${d.lessons > 1 ? 's' : ''} terminée${d.lessons > 1 ? 's' : ''}`,
    d.runs && `${d.runs} exécution${d.runs > 1 ? 's' : ''} de TP (${d.runs_passed} réussie${d.runs_passed > 1 ? 's' : ''})`,
    d.answers && `${d.answers} réponse${d.answers > 1 ? 's' : ''} de quiz`,
    d.xp && `+${d.xp} XP`,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Aucune activité'
}

/**
 * Graphe d'activité façon GitHub : une colonne par semaine (du lundi au dimanche),
 * une case par jour, plus foncée quand il s'est passé plus de choses.
 */
export function ActivityGraph({
  weeks,
  selected,
  onSelect,
  className,
  fill,
}: {
  weeks: number
  /** Les cases s'élargissent pour remplir la largeur disponible (carrées, bornées en taille). */
  fill?: boolean
  selected?: string | null
  onSelect?: (date: string | null) => void
  className?: string
}) {
  const { data } = useQuery({ queryKey: ['activity', weeks], queryFn: () => api.activity(weeks) })
  const days = data ?? []
  const columns: ActivityDay[][] = []
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7))

  const activeDays = days.filter((d) => d.level > 0).length
  const span = weeks >= 52 ? 'sur la dernière année' : `sur les ${Math.round(weeks / 4.35)} derniers mois`

  return (
    <div className={className}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div
          className={cn('grid shrink-0 gap-[3px] text-[10px] leading-[11px] text-muted', fill ? 'grid-rows-[14px_repeat(7,minmax(0,1fr))] items-center' : 'grid-rows-[14px_repeat(7,11px)]')}
        >
          <span />
          {DAY_LABELS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className={cn('flex gap-[3px]', fill && 'min-w-[520px] flex-1')} role="grid" aria-label={`Activité ${span}`}>
          {columns.map((col, c) => {
            const first = parse(col[0]!.date)
            const prev = columns[c - 1]?.[0]
            const newMonth = !prev || parse(prev.date).getMonth() !== first.getMonth()
            return (
              <div
                key={col[0]!.date}
                className={cn('grid gap-[3px]', fill ? 'flex max-w-4 min-w-0 flex-1 flex-col content-start' : 'grid-rows-[14px_repeat(7,11px)]')}
                role="row"
              >
                {/* Le libellé déborde à droite sans élargir la colonne : les semaines restent régulières. */}
                <span className={cn('relative w-[11px]', fill && 'h-[14px] shrink-0')}>
                  <span className="absolute left-0 text-[10px] leading-[11px] whitespace-nowrap text-muted">
                    {newMonth && c < columns.length - 2 ? monthFmt.format(first) : ''}
                  </span>
                </span>
                {col.map((d) => (
                  <Tooltip key={d.date}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="gridcell"
                        aria-label={`${dayFmt.format(parse(d.date))} : ${describe(d)}`}
                        aria-pressed={onSelect ? selected === d.date : undefined}
                        onClick={onSelect ? () => onSelect(selected === d.date ? null : d.date) : undefined}
                        className={cn(
                          fill ? 'aspect-square w-full rounded-[3px]' : 'size-[11px] rounded-[3px]',
                          onSelect ? 'cursor-pointer' : 'cursor-default',
                          selected === d.date && 'ring-2 ring-text ring-offset-1 ring-offset-ink',
                        )}
                        style={{ background: cellColor(d.level) }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="block font-medium first-letter:uppercase">{dayFmt.format(parse(d.date))}</span>
                      {describe(d)}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {data
            ? `${activeDays} jour${activeDays > 1 ? 's' : ''} actif${activeDays > 1 ? 's' : ''} ${span}`
            : 'Chargement de l’activité…'}
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Moins
          {MIX.map((_, level) => (
            <span key={level} className="size-[11px] rounded-[3px]" style={{ background: cellColor(level) }} />
          ))}
          Plus
        </span>
      </div>
    </div>
  )
}
