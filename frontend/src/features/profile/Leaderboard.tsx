import { useQuery } from '@tanstack/react-query'
import { Flame, Swords, UserPlus } from 'lucide-react'
import { leaderboardQuery } from '@/features/review/queries'
import type { LeaderboardEntry } from '@/lib/api'
import { cn } from '@/lib/utils'

const weekFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/** Classement de la semaine (XP gagnés depuis lundi) : barre relative au premier, ta ligne en surbrillance. */
export function Leaderboard() {
  const { data, isPending, error } = useQuery(leaderboardQuery)
  const entries = data?.entries ?? []
  const top = Math.max(1, ...entries.map((e) => e.xp_week))
  const me = entries.find((e) => e.me)

  return (
    <section className="mt-14" aria-labelledby="board-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="board-title" className="font-read text-2xl font-semibold">
          Classement de la semaine
        </h2>
        {data && (
          <p className="text-sm text-muted">
            Depuis le lundi {weekFmt.format(new Date(`${data.week_start}T12:00:00`))}, remis à zéro chaque lundi
          </p>
        )}
      </div>

      {isPending ? (
        <div className="mt-5 h-40 animate-pulse rounded-2xl border border-line bg-surface" />
      ) : error ? (
        <p className="mt-5 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Classement indisponible pour l’instant.</p>
      ) : entries.length <= 1 ? (
        <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-accent/50 text-accent">
            <Swords className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-read text-xl font-semibold">Invite quelqu’un pour lancer la course</p>
            <p className="mt-1 text-sm text-muted">
              Seul en piste pour l’instant{me ? `, avec ${me.xp_week} XP cette semaine` : ''}. Un rival bienveillant, c’est la
              meilleure raison de revenir demain.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <UserPlus className="size-4" /> Invitations dans les paramètres
          </span>
        </div>
      ) : (
        <ol className="mt-5 grid gap-2">
          {entries.map((e, i) => (
            <Row key={e.user_id} entry={e} rank={i + 1} ratio={e.xp_week / top} />
          ))}
        </ol>
      )}
    </section>
  )
}

function Row({ entry: e, rank, ratio }: { entry: LeaderboardEntry; rank: number; ratio: number }) {
  return (
    <li
      className={cn(
        'grid grid-cols-[2rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3 sm:gap-4 sm:px-4',
        e.me ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface',
      )}
      aria-current={e.me ? 'true' : undefined}
    >
      <span className={cn('text-center font-code text-sm tabular-nums', rank === 1 ? 'text-accent' : 'text-muted')}>{rank}</span>
      <MemberAvatar entry={e} />
      <div className="min-w-0">
        <p className="flex items-baseline gap-2">
          <span className="truncate font-medium">{e.display_name}</span>
          {e.me && <span className="text-xs text-accent">toi</span>}
          <span className="shrink-0 font-code text-xs text-muted">niv. {e.level}</span>
        </p>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-[2px] bg-cell-empty">
          <span
            className={cn('block h-full rounded-[2px] transition-[width] duration-700', e.me ? 'bg-accent' : 'bg-text/50')}
            style={{ width: `${Math.max(2, ratio * 100)}%` }}
          />
        </span>
      </div>
      <div className="text-right">
        <p className="font-code text-sm font-medium tabular-nums">{e.xp_week} XP</p>
        <p className={cn('inline-flex items-center gap-1 text-xs tabular-nums', e.streak_days > 0 ? 'text-fail' : 'text-muted')}>
          <Flame className="size-3" /> {e.streak_days} j
        </p>
      </div>
    </li>
  )
}

function MemberAvatar({ entry: e }: { entry: LeaderboardEntry }) {
  const initials = e.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return e.has_avatar ? (
    <img src={`/api/users/${e.user_id}/avatar`} alt="" className="size-9 rounded-lg border border-line object-cover" />
  ) : (
    <span className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 font-code text-xs text-muted" aria-hidden="true">
      {initials || '?'}
    </span>
  )
}
