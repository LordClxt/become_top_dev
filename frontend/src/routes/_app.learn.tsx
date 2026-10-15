import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { CourseBooks } from '@/components/CourseBooks'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Lock, LockOpen } from 'lucide-react'
import { ActivityGraph } from '@/components/ActivityGraph'
import { GridZone } from '@/components/Backdrop'
import { SliceMeter } from '@/components/SliceMeter'
import { ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { StreakFlame } from '@/components/StreakFlame'
import { LevelTile, XpBar } from '@/components/XpBar'
import { coursesQuery, progressQuery } from '@/features/courses/queries'
import { RequirementNote } from '@/features/courses/RequirementNote'
import { plural, summarizeCourse } from '@/features/courses/summary'
import type { Course, CourseChapter } from '@/lib/api'
import { iconFor } from '@/lib/course-icons'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/learn')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(coursesQuery),
  head: () => ({ meta: [{ title: 'Mes cours · become_top_dev' }] }),
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Dashboard,
})

function Dashboard() {
  const { data: courses } = useSuspenseQuery(coursesQuery)
  const summaries = courses.map((course) => ({ course, ...summarizeCourse(course) }))
  // Le prochain pas : le premier module ouvert et non maîtrisé, dans l'ordre conseillé des cours.
  const focus = summaries.find((s) => s.next)

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -140, right: -100 }} size={620} glow={{ x: -0.1, y: 0.05 }} />
      <div className="mx-auto grid max-w-[1200px] gap-14 px-6 pt-12 pb-28 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div>
          {focus?.next ? (
            <Quest course={focus.course} chapter={focus.next} />
          ) : (
            <section className="rounded-2xl border border-line bg-surface/70 p-8">
              <h1 className="font-read text-4xl leading-tight font-semibold tracking-tight">Tout est maîtrisé</h1>
              <p className="mt-3 max-w-[52ch] font-read text-lg text-muted">
                Chaque module rédigé est validé. Les prochains apparaîtront ici dès qu'ils seront prêts.
              </p>
            </section>
          )}

          <section className="mt-16" aria-labelledby="my-courses">
            <h2 id="my-courses" className="font-read text-2xl font-semibold tracking-tight">
              Mes cours
            </h2>
            <ol className="mt-5 border-t border-line">
              {summaries.map((s) => (
                <CourseRow key={s.course.id} course={s.course} summary={s} />
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-10">
          <PlayerCard />
          <section aria-labelledby="activity">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="activity" className="text-sm font-medium">
                Mon activité
              </h2>
              <Link to="/profile" className="text-sm text-muted hover:text-accent">
                Voir le journal
              </Link>
            </div>
            <ActivityGraph weeks={16} />
          </section>
        </aside>
      </div>
    </main>
  )
}

type OpenChapter = Extract<CourseChapter, { available: true }>

/** La quête en cours : le module à travailler, ce qu'il reste à faire, et ce qu'il débloque. */
function Quest({ course, chapter }: { course: Course; chapter: OpenChapter }) {
  const all = course.tracks.flatMap((t) => t.chapters)
  const after = all[all.findIndex((c) => c.slug === chapter.slug) + 1]
  const Icon = iconFor(course.id, Number.parseInt(chapter.slug, 10))
  const m = chapter.mastery

  return (
    <section
      aria-labelledby="next-step"
      className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface/80 p-7 backdrop-blur md:p-9"
    >
      <div className="glow-accent pointer-events-none absolute -top-24 -left-16 -z-10 size-72 rounded-full" aria-hidden="true" />
      <div className="flex items-start gap-5">
        <span className="relative hidden size-16 shrink-0 sm:block">
          <span className="node-pulse absolute inset-0 rounded-2xl bg-accent" aria-hidden="true" />
          <span className="relative grid size-full place-items-center rounded-2xl border-2 border-accent bg-ink text-accent">
            <Icon className="size-7" strokeWidth={1.75} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">
            Quête en cours, <span className="text-text">{course.title}</span>
          </p>
          <h1 id="next-step" className="mt-1 font-read text-4xl leading-[1.08] font-semibold tracking-tight md:text-5xl">
            {chapter.title}
          </h1>
          <p className="mt-3 max-w-[52ch] font-read text-lg leading-relaxed text-muted">{chapter.subtitle}</p>
        </div>
      </div>

      <dl className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-3">
        <Objective label="Leçons" len={m.lessons_done} cap={m.lessons_total} />
        <Objective label="TP réussis" len={m.labs_passed} cap={m.labs_total} />
        <div>
          <dt className="text-sm text-muted">Maîtrise</dt>
          <dd className="mt-1.5 flex items-baseline gap-2">
            <span className="font-read text-2xl font-semibold tabular-nums">{Math.round(m.score * 100)} %</span>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
          <Link to="/chapters/$chapterId" params={{ chapterId: chapter.id }}>
            {m.lessons_done > 0 ? 'Reprendre ce module' : 'Commencer ce module'}
          </Link>
        </Button>
        {after && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LockOpen className="size-4 text-accent" />
            Maîtrisé, il ouvre «&nbsp;{after.title}&nbsp;»
          </p>
        )}
      </div>
    </section>
  )
}

function Objective({ label, len, cap }: { label: string; len: number; cap: number }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2.5">
        <SliceMeter len={len} cap={cap} size="sm" label={`${label} : ${len} sur ${cap}`} />
      </dd>
    </div>
  )
}

function PlayerCard() {
  const { data: progress } = useQuery(progressQuery)
  if (!progress) return <div className="h-48 rounded-2xl border border-line bg-surface/60" aria-hidden="true" />
  const toNext = progress.next_level_xp - progress.xp
  return (
    <section aria-labelledby="player" className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
      <h2 id="player" className="sr-only">
        Mon niveau
      </h2>
      <div className="flex items-center gap-4">
        <LevelTile level={progress.level} />
        <div>
          <p className="font-read text-2xl font-semibold">Niveau {progress.level}</p>
          <p className="text-sm text-muted tabular-nums">{progress.xp} XP au total</p>
        </div>
      </div>
      <XpBar progress={progress} className="mt-5" />
      <p className="mt-2 font-code text-xs text-muted tabular-nums">encore {toNext} XP avant le niveau {progress.level + 1}</p>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="flex items-center gap-2">
          <StreakFlame lit={progress.streak_days > 0} />
          <span className="font-medium tabular-nums">{plural(progress.streak_days, 'jour', 'jours')}</span>
          <span className="text-muted">de série</span>
        </span>
        <span className="text-muted tabular-nums">record {progress.longest_streak_days} j</span>
      </div>
    </section>
  )
}

function CourseRow({ course, summary }: { course: Course; summary: ReturnType<typeof summarizeCourse> }) {
  const { total, available, mastered } = summary
  const chapters = course.tracks.flatMap((t) => t.chapters)
  return (
    <li className="border-b border-line">
      <Link
        to="/courses/$courseId"
        params={{ courseId: course.id }}
        className="group -mx-4 grid gap-4 rounded-xl px-4 py-7 transition-colors duration-(--dur-fast) hover:bg-surface/70"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="font-read text-2xl font-semibold tracking-tight group-hover:text-accent">{course.title}</h3>
          <p className="text-sm text-muted tabular-nums">
            {available === 0
              ? 'Rédaction en cours'
              : `${plural(mastered, 'module maîtrisé', 'modules maîtrisés')} sur ${total}`}
          </p>
        </div>
        <p className="-mt-2 text-sm text-muted">
          <CourseBooks course={course} withAuthors={false} />
        </p>
        <ModuleStrip course={course} chapters={chapters} />
        {course.requires.map((req) => (
          <RequirementNote key={req.course_id} requirement={req} className="max-w-[56ch]" />
        ))}
      </Link>
    </li>
  )
}

/** La carte du cours en une ligne : une tuile par module, dans son état. */
function ModuleStrip({ course, chapters }: { course: Course; chapters: CourseChapter[] }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label={`Modules de ${course.title}`}>
      {chapters.map((ch) => {
        const Icon = iconFor(course.id, Number.parseInt(ch.slug, 10))
        const state = !ch.available
          ? 'planned'
          : ch.mastery.mastered
            ? 'mastered'
            : ch.mastery.unlocked
              ? 'open'
              : 'locked'
        const label = { planned: 'bientôt', mastered: 'maîtrisé', open: 'ouvert', locked: 'verrouillé' }[state]
        return (
          <li
            key={ch.slug}
            title={`${ch.title} : ${label}`}
            className={cn(
              'relative grid size-8 place-items-center rounded-lg border',
              state === 'mastered' && 'border-accent bg-accent text-accent-ink',
              state === 'open' && 'border-accent bg-ink text-accent',
              state === 'locked' && 'border-line bg-surface text-muted',
              state === 'planned' && 'border-dashed border-line text-muted/50',
            )}
          >
            {state === 'mastered' ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : state === 'locked' ? (
              <Lock className="size-3" />
            ) : (
              <Icon className="size-3.5" strokeWidth={1.75} />
            )}
            <span className="sr-only">
              {ch.title} : {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
