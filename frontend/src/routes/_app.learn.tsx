import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { CourseBooks } from '@/components/CourseBooks'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { GridZone } from '@/components/Backdrop'
import { ErrorState } from '@/components/states'
import { meQuery } from '@/features/auth/queries'
import { coursesQuery } from '@/features/courses/queries'
import { RequirementNote } from '@/features/courses/RequirementNote'
import { plural, summarizeCourse } from '@/features/courses/summary'
import { GoalRingCard } from '@/features/habit/GoalRing'
import { AllDoneHero, ContinueHero, HeroSkeleton } from '@/features/habit/Hero'
import { leaderboardQuery, todayQuery } from '@/features/habit/queries'
import { Quests } from '@/features/habit/Quests'
import { LeaderboardTeaser, ReviewCardBlock, SideSkeleton } from '@/features/habit/SideCards'
import { StreakWeek } from '@/features/habit/StreakWeek'
import { SessionCard } from '@/features/session/SessionUI'
import type { Course, CourseChapter } from '@/lib/api'
import { iconFor } from '@/lib/course-icons'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/learn')({
  // Les cours sont indispensables ; le jour et le classement s'affichent dès le rendu serveur quand ils répondent.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(coursesQuery),
      queryClient.ensureQueryData(todayQuery).catch(() => null),
      queryClient.ensureQueryData(leaderboardQuery).catch(() => null),
    ])
  },
  head: () => ({ meta: [{ title: "Aujourd'hui · become_top_dev" }] }),
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Dashboard,
})

function Dashboard() {
  const { data: courses } = useSuspenseQuery(coursesQuery)
  const { data: today } = useQuery(todayQuery)
  const { data: me } = useQuery(meQuery)
  const name = me?.user?.display_name
  const summaries = courses.map((course) => ({ course, ...summarizeCourse(course) }))
  // Le cours en cours d'abord : celui du prochain pas, puis ceux qui ont un module ouvert.
  const currentId = today?.continue?.course_id ?? summaries.find((s) => s.next)?.course.id
  const ordered = [...summaries].sort(
    (a, b) => Number(b.course.id === currentId) - Number(a.course.id === currentId) || Number(!!b.next) - Number(!!a.next),
  )

  const goal = today && <GoalRingCard have={today.xp_today} goal={today.goal_xp} met={today.goal_met} />

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -140, right: -100 }} size={620} glow={{ x: -0.1, y: 0.05 }} />
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 pt-8 pb-28 sm:px-6 md:pt-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="grid min-w-0 content-start gap-8 lg:gap-12">
          {!today ? (
            <HeroSkeleton />
          ) : today.continue ? (
            <ContinueHero item={today.continue} courses={courses} name={name} reviewDue={today.review_due} />
          ) : (
            <AllDoneHero name={name} />
          )}
          {/* Sur téléphone, l'objectif suit immédiatement le prochain pas. */}
          {today ? <div className="lg:hidden">{goal}</div> : null}
          {today ? <Quests today={today} /> : <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface/60 lg:block" aria-hidden="true" />}

          <section aria-labelledby="my-courses">
            <h2 id="my-courses" className="font-read text-2xl font-semibold tracking-tight">
              Mes cours
            </h2>
            <ol className="mt-4 border-t border-line">
              {ordered.map((s) => (
                <CourseRow key={s.course.id} course={s.course} summary={s} current={s.course.id === currentId} />
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid min-w-0 content-start gap-6 lg:sticky lg:top-20 lg:self-start">
          {today ? (
            <>
              <SessionCard />
              <div className="hidden lg:block">{goal}</div>
              <StreakWeek today={today} />
              {/* Les cartes dues sont déjà proposées en échauffement dans le bloc principal. */}
              {!(today.continue && today.review_due > 0) && <ReviewCardBlock due={today.review_due} />}
              <LeaderboardTeaser />
            </>
          ) : (
            <SideSkeleton />
          )}
        </aside>
      </div>
    </main>
  )
}

function CourseRow({
  course,
  summary,
  current,
}: {
  course: Course
  summary: ReturnType<typeof summarizeCourse>
  current: boolean
}) {
  const { total, available, mastered, next } = summary
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
        {current && next && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="rounded-md bg-accent/15 whitespace-nowrap px-2 py-0.5 font-code text-[11px] text-accent uppercase">En cours</span>
            Prochain module : <span className="text-text">{next.title}</span>
            <ArrowRight className="size-3.5 text-accent transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" />
          </p>
        )}
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
