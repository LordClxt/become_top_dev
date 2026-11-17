import { Check } from 'lucide-react'
import { StreakFlame } from '@/components/StreakFlame'
import { plural } from '@/features/courses/summary'
import type { Today } from '@/lib/api'
import { cn } from '@/lib/utils'

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** La série et la semaine en cours : une case par jour, du lundi au dimanche. */
export function StreakWeek({ today }: { today: Today }) {
  const n = today.streak_days
  return (
    <section aria-labelledby="streak-title" className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <StreakFlame lit={n > 0 && !today.streak_at_risk} className="size-7" />
        <h2 id="streak-title" className="font-read text-xl font-semibold">
          Série : <span className="tabular-nums">{plural(n, 'jour', 'jours')}</span>
        </h2>
      </div>
      <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Cette semaine">
        {today.week.map((d, i) => {
          const isToday = d.date === today.date
          const state = d.goal_met ? 'goal' : d.active ? 'done' : d.future ? 'future' : isToday ? 'today' : 'missed'
          const label = { goal: 'objectif atteint', done: 'actif', future: 'à venir', today: "aujourd'hui, rien encore", missed: 'repos' }[state]
          return (
            <li key={d.date} className="flex flex-col items-center gap-1.5" title={`${DAY_NAMES[i]} : ${label}`}>
              <span className={cn('text-[11px] text-muted', isToday && 'font-semibold text-text')}>{DAYS[i]}</span>
              <span
                className={cn(
                  'grid aspect-square w-full max-w-9 place-items-center rounded-lg border transition-colors duration-500',
                  state === 'goal' && 'border-accent bg-accent text-accent-ink',
                  state === 'done' && 'border-accent bg-accent/15 text-accent',
                  state === 'today' && 'habit-today border-accent border-dashed',
                  state === 'missed' && 'border-line bg-cell-empty',
                  state === 'future' && 'border-dashed border-line',
                  isToday && state !== 'today' && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-surface',
                )}
              >
                {state === 'goal' && <Check className="size-3.5" strokeWidth={3} />}
                {state === 'done' && <span className="size-1.5 rounded-full bg-accent" />}
              </span>
              <span className="sr-only">{label}</span>
            </li>
          )
        })}
      </ol>
      {today.streak_at_risk && n > 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-sm text-muted">
          Ta série de {plural(n, 'jour', 'jours')} tient à une activité aujourd'hui. Une leçon courte suffit.
        </p>
      ) : n > 0 ? (
        <p className="mt-4 text-sm text-muted">La série est à l'abri pour aujourd'hui.</p>
      ) : (
        <p className="mt-4 text-sm text-muted">Une activité aujourd'hui allume la flamme.</p>
      )}
    </section>
  )
}
