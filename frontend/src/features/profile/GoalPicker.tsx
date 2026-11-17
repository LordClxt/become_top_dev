import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Target } from 'lucide-react'
import { profileQuery } from '@/features/courses/queries'
import { api, type DailyGoal } from '@/lib/api'
import { cn } from '@/lib/utils'

const GOALS: { xp: DailyGoal; title: string; minutes: string; hint: string }[] = [
  { xp: 20, title: 'Tranquille', minutes: '5 à 10 min', hint: 'Une leçon courte ou une révision.' },
  { xp: 50, title: 'Régulier', minutes: '15 à 20 min', hint: 'Une leçon et ses flashcards.' },
  { xp: 100, title: 'Sérieux', minutes: '30 à 45 min', hint: 'Une leçon et un TP.' },
  { xp: 150, title: 'Intense', minutes: 'une heure et plus', hint: 'Plusieurs TP, voire un boss.' },
]

/** Objectif quotidien d'XP : il pilote l'anneau du jour et la série. */
export function GoalPicker() {
  const qc = useQueryClient()
  const { data: profile } = useQuery(profileQuery)
  const current = profile?.daily_goal_xp ?? 50
  const save = useMutation({
    mutationFn: api.setGoal,
    onMutate: async (goal) => {
      qc.setQueryData(profileQuery.queryKey, (p) => (p ? { ...p, daily_goal_xp: goal } : p))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })

  return (
    <div role="radiogroup" aria-label="Objectif quotidien" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {GOALS.map((g, i) => {
        const on = g.xp === current
        return (
          <button
            key={g.xp}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => save.mutate(g.xp)}
            className={cn(
              'relative flex flex-col rounded-2xl border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'border-accent bg-accent/8' : 'border-line bg-surface hover:border-accent/60',
            )}
          >
            <span className="flex items-center justify-between">
              <span className="flex gap-[3px]" aria-hidden="true">
                {GOALS.map((_, j) => (
                  <span key={j} className={cn('h-3 w-2 rounded-[2px]', j <= i ? (on ? 'bg-accent' : 'bg-text/40') : 'bg-cell-empty')} />
                ))}
              </span>
              {on ? <Check className="size-4 text-accent" /> : <Target className="size-4 text-muted" />}
            </span>
            <span className="mt-4 font-read text-lg font-semibold">{g.title}</span>
            <span className="font-code text-sm text-accent tabular-nums">{g.xp} XP / jour</span>
            <span className="mt-2 text-xs text-muted">{g.minutes}</span>
            <span className="mt-0.5 text-xs leading-snug text-muted">{g.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
