import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpenCheck, Check, CircleHelp, FlaskConical, type LucideIcon, Play, X } from 'lucide-react'
import { useState } from 'react'
import { ActivityGraph } from '@/components/ActivityGraph'
import { StreakFlame } from '@/components/StreakFlame'
import { SliceMeter } from '@/components/SliceMeter'
import { XpBar } from '@/components/XpBar'
import { type Badge, badgesFor } from '@/features/xp/badges'
import { AvatarEditor } from '@/components/AvatarEditor'
import { ErrorState, Loading } from '@/components/states'
import { type ActivityEvent, api } from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/profile')({ component: ProfilePage })

function ProfilePage() {
  const { data: progress, error, isPending } = useQuery({ queryKey: ['progress'], queryFn: api.progress })
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: api.courses })
  const [day, setDay] = useState<string | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />

  const span = progress.next_level_xp - progress.level_floor_xp
  const into = progress.xp - progress.level_floor_xp
  const chapters = (courses ?? []).flatMap((c) => c.tracks.flatMap((t) => t.chapters)).flatMap((c) => (c.available ? [c] : []))

  return (
    <main className="relative isolate overflow-x-clip">
      <div className="mx-auto max-w-[1100px] px-6 pt-14 pb-24">
        <section className="grid gap-10 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <div className="flex items-center gap-6">
            <AvatarEditor level={progress.level} />
            <div>
              <p className="text-sm text-muted">Ton profil</p>
              <h1 className="mt-1 font-read text-6xl leading-none font-semibold tracking-tight">Niveau {progress.level}</h1>
              <XpBar progress={progress} size="lg" className="mt-5" />
              <p className="mt-2 font-code text-xs text-muted tabular-nums">
                {into}/{span} XP, encore {span - into} avant le niveau {progress.level + 1}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-6">
            <Stat label="XP au total" value={progress.xp} />
            <Stat label="Plus longue série" value={`${progress.longest_streak_days} j`} />
            <Stat label="Jours actifs" value={progress.active_days} />
          </dl>
          <Streak days={progress.streak_days} />
        </section>

        <Badges badges={badgesFor(progress)} />

        <section className="mt-14 rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur" aria-labelledby="activity-title">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="activity-title" className="font-read text-2xl font-semibold">
              Activité
            </h2>
            <p className="text-sm text-muted">Clique sur un jour pour voir ce que tu as fait.</p>
          </div>
          <ActivityGraph weeks={53} selected={day} onSelect={setDay} />
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Journal day={day} onClear={() => setDay(null)} />

          <section aria-labelledby="mastery-title">
            <h2 id="mastery-title" className="font-read text-2xl font-semibold">
              Maîtrise par module
            </h2>
            <ul className="mt-5 grid gap-3">
              {chapters.map((ch) => (
                <li key={ch.id}>
                  <Link
                    to="/chapters/$chapterId"
                    params={{ chapterId: ch.id }}
                    className="block rounded-xl border border-line bg-surface p-4 hover:border-accent"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{ch.title}</span>
                      <span className="text-sm text-muted tabular-nums">{Math.round(ch.mastery.score * 100)} %</span>
                    </span>
                    <SliceMeter
                      len={ch.mastery.lessons_done}
                      cap={ch.mastery.lessons_total}
                      size="sm"
                      className="mt-3"
                      label={`${ch.mastery.lessons_done} leçons terminées sur ${ch.mastery.lessons_total}`}
                    />
                    <span className="mt-2 block text-xs text-muted">
                      {ch.mastery.mastered ? 'Maîtrisé' : `${ch.mastery.labs_passed}/${ch.mastery.labs_total} TP réussis`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}

function Badges({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length
  return (
    <section className="mt-14" aria-labelledby="badges-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges-title" className="font-read text-2xl font-semibold">
          Badges
        </h2>
        <p className="font-code text-xs text-muted tabular-nums">
          len={earned} cap={badges.length}
        </p>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={cn(
              'flex gap-3.5 rounded-xl border p-4',
              b.earned ? 'border-accent/50 bg-surface' : 'border-dashed border-line',
            )}
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl border-2',
                b.earned ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted',
              )}
            >
              <b.icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className={cn('block font-medium', !b.earned && 'text-muted')}>{b.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">
                {b.earned ? 'Obtenu' : b.goal}
              </span>
              {!b.earned && b.need > 1 && (
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-20 overflow-hidden rounded-[2px] bg-cell-empty">
                    <span className="block h-full bg-accent" style={{ width: `${(b.have / b.need) * 100}%` }} />
                  </span>
                  <span className="font-code text-[11px] text-muted tabular-nums">
                    {b.have}/{b.need}
                  </span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** La série en cours, sans cadre, à droite du bandeau : la flamme brûle tant qu'elle n'est pas rompue. */
function Streak({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-1 lg:self-center">
      <StreakFlame lit={days > 0} className="size-20 lg:size-28" />
      <p className="text-center">
        <span className="block font-read text-4xl leading-none font-semibold tabular-nums">{days} j</span>
        <span className="mt-1 block text-sm text-muted">{days > 0 ? 'série en cours' : 'aucune série'}</span>
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-l border-line pl-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-read text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

const EVENT: Record<ActivityEvent['kind'], { icon: LucideIcon; tone: string; text: (e: ActivityEvent) => string }> = {
  lesson_completed: { icon: BookOpenCheck, tone: 'text-accent', text: () => 'Leçon terminée' },
  exercise_passed: { icon: Check, tone: 'text-pass', text: () => 'TP réussi' },
  exercise_runs: {
    icon: Play,
    tone: 'text-muted',
    text: (e) => `${e.count} exécution${e.count > 1 ? 's' : ''} de TP, ${e.ok} réussie${e.ok > 1 ? 's' : ''}`,
  },
  quiz_answers: {
    icon: CircleHelp,
    tone: 'text-muted',
    text: (e) => `Quiz : ${e.ok} bonne${e.ok > 1 ? 's' : ''} réponse${e.ok > 1 ? 's' : ''} sur ${e.count}`,
  },
}

const dayTitle = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Journal façon `git log` : un groupe par jour, une ligne verticale, un point par action. */
function Journal({ day, onClear }: { day: string | null; onClear: () => void }) {
  const { data: events, isPending } = useQuery({
    queryKey: ['activity', 'feed', day],
    queryFn: () => api.activityFeed(day ?? undefined),
  })

  const groups = new Map<string, ActivityEvent[]>()
  for (const e of events ?? []) groups.set(e.date, [...(groups.get(e.date) ?? []), e])

  return (
    <section aria-labelledby="journal-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="journal-title" className="font-read text-2xl font-semibold">
          Journal
        </h2>
        {day && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-text"
          >
            <X className="size-3.5" />
            Tout afficher
          </button>
        )}
      </div>

      {isPending ? (
        <p className="mt-5 text-sm text-muted">Chargement du journal…</p>
      ) : groups.size === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-line p-6 text-sm text-muted">
          {day ? 'Rien ce jour-là.' : 'Ton journal est vide. Termine une leçon ou lance un TP : chaque action apparaît ici.'}
          {!day && (
            <Link to="/learn" className="mt-3 block text-accent">
              Reprendre le cours
            </Link>
          )}
        </div>
      ) : (
        <ol className="mt-5 grid gap-8">
          {[...groups].map(([date, list]) => (
            <li key={date}>
              <h3 className="mb-3 text-sm font-medium text-muted first-letter:uppercase">
                {dayTitle.format(new Date(`${date}T12:00:00`))}
              </h3>
              <ol className="relative grid gap-1 border-l border-line pl-6">
                {list.map((e) => {
                  const spec = EVENT[e.kind]
                  const Icon = e.kind === 'exercise_runs' ? FlaskConical : spec.icon
                  return (
                    <li key={`${e.kind}-${e.target.id}-${e.at}`} className="relative py-2">
                      <span
                        className="absolute top-3 -left-[33px] grid size-[17px] place-items-center rounded-full border border-line bg-ink"
                        aria-hidden="true"
                      >
                        <span className={cn('size-[7px] rounded-full', e.xp > 0 ? 'bg-accent' : 'bg-line')} />
                      </span>
                      <div className="flex items-start gap-3">
                        <Icon className={cn('mt-0.5 size-4 shrink-0', spec.tone)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-muted">{spec.text(e)}</p>
                          <EventLink event={e} />
                        </div>
                        <div className="shrink-0 text-right text-xs tabular-nums">
                          {e.xp > 0 && <p className="font-medium text-accent">+{e.xp} XP</p>}
                          <p className="text-muted">{timeFmt.format(new Date(e.at))}</p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function EventLink({ event: e }: { event: ActivityEvent }) {
  const className = 'block truncate font-medium hover:text-accent'
  return e.target.type === 'lesson' ? (
    <Link to="/lessons/$lessonId" params={{ lessonId: e.target.id }} className={className}>
      {e.title}
    </Link>
  ) : (
    <Link to="/exercises/$exerciseId" params={{ exerciseId: e.target.id }} className={className}>
      {e.title}
    </Link>
  )
}
