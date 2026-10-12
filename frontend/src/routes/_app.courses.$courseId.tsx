import { useSuspenseQuery } from '@tanstack/react-query'
import { CourseBooks } from '@/components/CourseBooks'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { GridZone } from '@/components/Backdrop'
import { CoursePath } from '@/components/CoursePath'
import { ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { coursesQuery } from '@/features/courses/queries'
import { RequirementNote } from '@/features/courses/RequirementNote'
import { plural, summarizeCourse } from '@/features/courses/summary'

export const Route = createFileRoute('/_app/courses/$courseId')({
  loader: async ({ context: { queryClient }, params }) => {
    const courses = await queryClient.ensureQueryData(coursesQuery)
    const course = courses.find((c) => c.id === params.courseId)
    if (!course) throw notFound()
    return { title: course.title }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'Cours'} · become_top_dev` }] }),
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => (
    <main className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="font-read text-3xl font-semibold">Ce cours n'existe pas</h1>
      <Link to="/learn" className="mt-4 inline-block text-accent">
        Revenir à mes cours
      </Link>
    </main>
  ),
  component: CoursePage,
})

function CoursePage() {
  const { courseId } = Route.useParams()
  const { data: courses } = useSuspenseQuery(coursesQuery)
  const course = courses.find((c) => c.id === courseId)
  if (!course) return null
  const { total, available, mastered, lessonsDone, lessonsTotal, next } = summarizeCourse(course)

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -120, right: -80 }} size={640} glow={{ x: -0.1, y: 0.05 }} />
      <GridZone style={{ top: 1000, left: -160 }} size={560} glow={{ x: 0.12, y: 0 }} />

      <section className="mx-auto grid max-w-[1200px] gap-12 px-6 pt-14 pb-28 lg:grid-cols-[minmax(0,1fr)_600px] lg:gap-16">
        <div className="lg:sticky lg:top-16 lg:self-start lg:pt-4">
          <Link to="/learn" className="text-sm text-muted hover:text-text">
            Mes cours
          </Link>
          <h1 className="mt-5 font-read text-5xl leading-[1.05] font-semibold tracking-tight xl:text-6xl">
            {course.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <CourseBooks course={course} />
          </p>
          <p className="mt-5 max-w-[46ch] font-read text-lg leading-relaxed text-muted">{course.summary}</p>

          {course.requires.map((req) => (
            <RequirementNote key={req.course_id} requirement={req} className="mt-6 max-w-[46ch]" />
          ))}

          {next ? (
            <Button asChild size="lg" className="mt-8 h-12 rounded-xl px-6 text-base">
              <Link to="/chapters/$chapterId" params={{ chapterId: next.id }}>
                {next.mastery.lessons_done > 0 ? 'Reprendre' : 'Commencer'} : {next.title}
              </Link>
            </Button>
          ) : available === 0 ? (
            <p className="mt-8 max-w-[46ch] text-sm text-muted">
              Le premier module est en cours de rédaction. La carte ci-contre montre le parcours prévu.
            </p>
          ) : null}

          {available > 0 && (
            <p className="mt-8 max-w-[46ch] text-sm leading-relaxed text-muted">
              <span className="text-text tabular-nums">{plural(mastered, 'module maîtrisé', 'modules maîtrisés')}</span>{' '}
              sur {total}
              {lessonsTotal > 0 && (
                <>
                  , <span className="text-text tabular-nums">{plural(lessonsDone, 'leçon terminée', 'leçons terminées')}</span>{' '}
                  sur {lessonsTotal}
                </>
              )}
              . {available < total && `${plural(available, 'module prêt', 'modules prêts')} ; les autres sont en cours de rédaction.`}
            </p>
          )}

          {course.running_project && (
            <div className="mt-10 max-w-[46ch] border-t border-line pt-6">
              <h2 className="text-sm font-medium">Fil rouge : {course.running_project.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{course.running_project.pitch}</p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <CoursePath course={course} />
        </div>
      </section>
    </main>
  )
}
