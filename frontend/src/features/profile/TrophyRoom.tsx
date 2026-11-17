import { Lock, Sparkles } from 'lucide-react'
import { type Badge, FAMILY_TITLE, nextBadge } from '@/features/xp/badges'
import { cn } from '@/lib/utils'

const TIER = ['', 'Bronze', 'Argent', 'Or']

/** Salle des trophées : le prochain badge en vedette, puis toutes les familles, paliers côte à côte. */
export function TrophyRoom({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length
  const next = nextBadge(badges)
  const families = [...new Set(badges.map((b) => b.family))]

  return (
    <section className="mt-14" aria-labelledby="badges-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges-title" className="font-read text-2xl font-semibold">
          Salle des trophées
        </h2>
        <div className="flex items-center gap-3">
          <span className="flex gap-[3px]" aria-hidden="true">
            {badges.map((b) => (
              <span key={b.id} className={cn('size-2.5 rounded-[2px]', b.earned ? 'bg-accent' : 'bg-cell-empty')} />
            ))}
          </span>
          <span className="font-code text-xs text-muted tabular-nums">
            {earned}/{badges.length}
          </span>
        </div>
      </div>

      {next && <NextBadge badge={next} />}

      <div className="mt-6 grid gap-x-6 gap-y-6 md:grid-cols-2">
        {families.map((f) => (
          <div key={f}>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{FAMILY_TITLE[f]}</h3>
            <ul className="grid grid-cols-3 gap-2">
              {badges
                .filter((b) => b.family === f)
                .map((b) => (
                  <Trophy key={b.id} badge={b} highlighted={b.id === next?.id} />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function NextBadge({ badge: b }: { badge: Badge }) {
  const left = b.need - b.have
  return (
    <div className="relative mt-5 flex flex-col gap-4 overflow-hidden rounded-2xl border border-accent/50 bg-surface p-5 sm:flex-row sm:items-center">
      <span className="glow-accent pointer-events-none absolute -top-20 -left-16 size-56 rounded-full opacity-60" aria-hidden="true" />
      <Medal badge={b} size="lg" ghost />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs text-accent">
          <Sparkles className="size-3.5" /> Prochain badge
        </p>
        <p className="mt-1 font-read text-xl font-semibold">{b.title}</p>
        <p className="text-sm text-muted">
          {b.goal}. Plus que <span className="font-code text-text">{left}</span>.
        </p>
      </div>
      <Cells have={b.have} need={b.need} />
    </div>
  )
}

/** Progression en cases quand le palier est petit, en barre sinon. */
function Cells({ have, need }: { have: number; need: number }) {
  if (need <= 10)
    return (
      <span className="flex items-center gap-2">
        <span className="flex gap-[3px]">
          {Array.from({ length: need }, (_, i) => (
            <span key={i} className={cn('size-3 rounded-[2px]', i < have ? 'bg-accent' : 'bg-cell-empty')} />
          ))}
        </span>
        <span className="font-code text-xs text-muted tabular-nums">
          {have}/{need}
        </span>
      </span>
    )
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-28 overflow-hidden rounded-[2px] bg-cell-empty">
        <span className="block h-full bg-accent" style={{ width: `${(have / need) * 100}%` }} />
      </span>
      <span className="font-code text-xs text-muted tabular-nums">
        {have}/{need}
      </span>
    </span>
  )
}

function Medal({ badge: b, size = 'md', ghost }: { badge: Badge; size?: 'md' | 'lg'; ghost?: boolean }) {
  const lit = b.earned && !ghost
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-2xl border-2',
        size === 'lg' ? 'size-14' : 'size-11',
        lit ? 'trophy-shine border-accent bg-accent/15 text-accent' : ghost ? 'border-accent/60 border-dashed text-accent' : 'border-line text-muted',
      )}
    >
      <b.icon className={size === 'lg' ? 'size-6' : 'size-5'} />
      {/* Les crans de palier sous la médaille. */}
      <span className="absolute -bottom-1.5 flex gap-0.5 rounded-full bg-ink px-1 py-0.5" aria-hidden="true">
        {[1, 2, 3].slice(0, b.tier).map((t) => (
          <span key={t} className={cn('size-1 rounded-full', lit ? 'bg-accent' : 'bg-line')} />
        ))}
      </span>
    </span>
  )
}

function Trophy({ badge: b, highlighted }: { badge: Badge; highlighted: boolean }) {
  return (
    <li
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border px-2 pt-4 pb-3 text-center',
        b.earned ? 'border-accent/40 bg-surface' : 'border-dashed border-line',
        highlighted && 'border-accent/70',
      )}
      title={b.earned ? `${b.title} : obtenu` : `${b.goal} (${b.have}/${b.need})`}
    >
      <Medal badge={b} />
      <span className={cn('mt-1 text-[13px] leading-tight font-medium text-balance', !b.earned && 'text-muted')}>{b.title}</span>
      {b.earned ? (
        <span className="text-[11px] text-accent">{TIER[b.tier]}</span>
      ) : (
        <span className="flex w-full items-center gap-1.5 px-1">
          <Lock className="size-3 shrink-0 text-muted" />
          <span className="h-1 flex-1 overflow-hidden rounded-[2px] bg-cell-empty">
            <span className="block h-full bg-accent/70" style={{ width: `${(b.have / b.need) * 100}%` }} />
          </span>
          <span className="font-code text-[10px] text-muted tabular-nums">
            {b.have}/{b.need}
          </span>
        </span>
      )}
    </li>
  )
}
