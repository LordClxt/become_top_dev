import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { plural } from '@/features/courses/summary'
import { cn } from '@/lib/utils'
import { leaderboardQuery } from './queries'

/** Révision du jour : combien de cartes, combien de temps (environ 20 s par carte). */
export function ReviewCardBlock({ due }: { due: number }) {
  if (due === 0) {
    return (
      <p className="flex items-center gap-2 px-1 text-sm text-muted">
        <Layers className="size-4" /> Rien à réviser aujourd'hui. Tes cartes sont à jour.
      </p>
    )
  }
  const minutes = Math.max(1, Math.round((due * 20) / 60))
  return (
    <section aria-labelledby="review-title" className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="relative grid size-10 place-items-center">
          <span className="absolute inset-0 translate-x-1 -translate-y-1 rounded-lg border border-line bg-surface-2" />
          <span className="relative grid size-full place-items-center rounded-lg border border-accent bg-ink text-accent">
            <Layers className="size-4" />
          </span>
        </span>
        <div>
          <h2 id="review-title" className="font-read text-lg font-semibold">
            Révision du jour
          </h2>
          <p className="text-sm text-muted tabular-nums">
            {plural(due, 'carte', 'cartes')}, environ {minutes} min
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="mt-4 w-full rounded-lg">
        <Link to="/review">
          Réviser maintenant <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  )
}

/** Le classement de la semaine en trois lignes, plus ma place ; masqué si je suis seul. */
export function LeaderboardTeaser() {
  const { data } = useQuery(leaderboardQuery)
  if (!data || data.entries.length < 2) return null
  const top = data.entries.slice(0, 3)
  const myIndex = data.entries.findIndex((e) => e.me)
  const me = myIndex >= 3 ? data.entries[myIndex] : null
  const rows = me ? [...top.map((e, i) => ({ e, i })), { e: me, i: myIndex }] : top.map((e, i) => ({ e, i }))
  return (
    <section aria-labelledby="board-title" className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="board-title" className="text-sm font-medium">
          Classement de la semaine
        </h2>
        <Link to="/profile" className="text-sm text-muted hover:text-accent">
          Tout voir
        </Link>
      </div>
      <ol className="grid gap-1">
        {rows.map(({ e, i }) => (
          <li
            key={e.user_id}
            className={cn('flex items-center gap-3 rounded-lg px-2 py-1.5', e.me && 'bg-surface-2', i >= 3 && 'mt-1 border-t border-line pt-2')}
          >
            <span className={cn('w-5 font-code text-xs tabular-nums', i === 0 ? 'text-accent' : 'text-muted')}>{i + 1}</span>
            {e.has_avatar ? (
              <img src={`/api/users/${e.user_id}/avatar`} alt="" className="size-7 rounded-full object-cover" />
            ) : (
              <span className="grid size-7 place-items-center rounded-full bg-cell-empty text-xs font-semibold">
                {e.display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm">{e.me ? 'Toi' : e.display_name}</span>
            <span className="font-code text-xs text-muted tabular-nums">{e.xp_week} XP</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function SideSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="h-[212px] animate-pulse rounded-2xl border border-line bg-surface/60" />
      <div className="h-[190px] animate-pulse rounded-2xl border border-line bg-surface/60" />
    </div>
  )
}
