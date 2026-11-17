import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Boxes, ChevronLeft } from 'lucide-react'
import { GridZone } from '@/components/Backdrop'
import { Finale, MasteryPanel, NextStepHero, QuestPath } from '@/components/journey/ModuleQuest'
import { ErrorState, Loading } from '@/components/states'
import { coursesQuery } from '@/features/courses/queries'
import { api } from '@/lib/api'
import { iconFor } from '@/lib/course-icons'
import { cn } from '@/lib/utils'
import { docLabel } from '@/lib/source'

export const Route = createFileRoute('/_app/chapters/$chapterId')({
  component: ChapterPage,
})

function ChapterPage() {
  const { chapterId } = Route.useParams()
  const {
    data: ch,
    error,
    isPending,
  } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => api.chapter(chapterId),
  })
  const { data: courses } = useQuery(coursesQuery)
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />

  const slug = courses
    ?.find((c) => c.id === ch.course.id)
    ?.tracks.flatMap((t) => t.chapters)
    .find((c) => c.available && c.id === ch.id)?.slug
  const Icon = slug ? iconFor(ch.course.id, Number.parseInt(slug, 10)) : Boxes
  const m = ch.mastery

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -140, right: -80 }} size={600} glow={{ x: -0.1, y: 0.05 }} />
      <div className="mx-auto grid max-w-[1150px] grid-cols-[minmax(0,1fr)] gap-14 px-4 sm:px-6 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Link
            to="/courses/$courseId"
            params={{ courseId: ch.course.id }}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"
          >
            <ChevronLeft className="size-4" />
            {ch.course.title}
          </Link>
          <div className="mt-6 flex items-start gap-5">
            <span
              className={cn(
                'grid size-16 shrink-0 place-items-center rounded-2xl border-2',
                m.mastered ? 'border-accent bg-accent text-accent-ink' : 'border-accent bg-surface text-accent',
              )}
            >
              <Icon className="size-7" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="font-read text-4xl leading-tight font-semibold tracking-tight md:text-5xl">{ch.title}</h1>
              <p className="mt-2 max-w-[60ch] text-lg text-muted">{ch.subtitle}</p>
            </div>
          </div>

          <NextStepHero chapter={ch} />

          <h2 className="mt-12 font-read text-2xl font-semibold">Le chemin</h2>
          <QuestPath chapter={ch} />

          <Finale chapter={ch} />
        </div>

        <aside className="grid min-w-0 content-start gap-10 lg:pt-4">
          <MasteryPanel chapter={ch} />
          <section>
            <h2 className="text-sm font-medium text-muted">Objectifs</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted">
              {ch.objectives.map((o) => (
                <li key={o} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-accent/60" aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
          </section>
          <p className="text-xs text-muted">
            {ch.source.url ? (
              <>
                Source :{' '}
                <a className="underline" href={ch.source.url} target="_blank" rel="noreferrer">
                  {docLabel(ch.source)}
                </a>
              </>
            ) : (
              <>
                Source : chapitre {ch.source.chapter}, pages {ch.source.pages}
              </>
            )}
          </p>
        </aside>
      </div>
    </main>
  )
}
