import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock, FlaskConical, Sparkles } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Flashcards } from '@/components/Flashcards'
import { LessonBody, lessonSections } from '@/components/LessonBody'
import { Quiz } from '@/components/Quiz'
import { ErrorState, Loading } from '@/components/states'
import { Button } from '@/components/ui/button'
import { announceXp } from '@/features/xp/xp-events'
import { api, type Chapter, type ExerciseSummary, type Lesson } from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/lessons/$lessonId')({ component: LessonPage })

function LessonPage() {
  const { lessonId } = Route.useParams()
  const qc = useQueryClient()
  const { data: lesson, error, isPending } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.lesson(lessonId),
  })
  const chapterId = lesson?.chapter.id
  const { data: chapter } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => api.chapter(chapterId!),
    enabled: !!chapterId,
  })
  const complete = useMutation({
    mutationFn: () => api.completeLesson(lessonId),
    onSuccess: (r) => {
      announceXp({ amount: r.xp_awarded, reason: 'Leçon terminée' })
      return qc.invalidateQueries()
    },
  })

  const body = lesson?.body ?? ''
  const sections = useMemo(() => lessonSections(body), [body])

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />
  const lessons = chapter?.lessons ?? []
  const position = lessons.findIndex((l) => l.id === lesson.id)
  const titleOf = (id: string | null) => lessons.find((l) => l.id === id)?.title
  const done = lesson.completed || !!complete.data

  return (
    <main className="relative isolate overflow-x-clip">
      <header className="mx-auto max-w-[1400px] px-6 pt-10 pb-12">
        <Link
          to="/chapters/$chapterId"
          params={{ chapterId: lesson.chapter.id }}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"
        >
          <ChevronLeft className="size-4" />
          {lesson.chapter.title}
          {position >= 0 && `, leçon ${position + 1} sur ${lessons.length}`}
        </Link>
        <h1 className="mt-4 max-w-[24ch] font-read text-4xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
          {lesson.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Chip icon={<Clock className="size-3.5" />}>{lesson.duration_min} min de lecture</Chip>
          <Chip icon={<Sparkles className="size-3.5 text-accent" />}>{lesson.xp} XP</Chip>
          <Chip icon={<BookOpen className="size-3.5" />}>Livre, p. {lesson.source.pages}</Chip>
          {lesson.extra && <Chip>Au-delà du livre</Chip>}
          {done && (
            <Chip icon={<Check className="size-3.5 text-pass" />} className="text-pass">
              Terminée
            </Chip>
          )}
        </div>
        {lessons.length > 0 && <ChapterSteps lessons={lessons} currentId={lesson.id} />}
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 pb-24 xl:grid-cols-[200px_minmax(0,1fr)_280px] xl:gap-12">
        <Toc sections={sections} />

        <article className="min-w-0">
          <LessonBody body={lesson.body} visuals={lesson.visuals} />

          <FinishPanel lesson={lesson} done={done} awarded={complete.data?.xp_awarded ?? 0}>
            {!done && (
              <Button
                size="lg"
                className="h-11 rounded-xl px-5"
                onClick={() => complete.mutate()}
                disabled={complete.isPending}
              >
                Terminer la leçon (+{lesson.xp} XP)
              </Button>
            )}
          </FinishPanel>

          {lesson.quiz_id && <Quiz quizId={lesson.quiz_id} />}
          {lesson.flashcards.length > 0 && <Flashcards cards={lesson.flashcards} />}

          <nav className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Leçons">
            {lesson.previous_id ? (
              <NavCard to={lesson.previous_id} label="Leçon précédente" title={titleOf(lesson.previous_id)} />
            ) : (
              <span />
            )}
            {lesson.next_id ? (
              <NavCard to={lesson.next_id} label="Leçon suivante" title={titleOf(lesson.next_id)} next />
            ) : (
              <Link
                to="/chapters/$chapterId"
                params={{ chapterId: lesson.chapter.id }}
                className="group rounded-2xl border border-line bg-surface p-5 text-right hover:border-accent"
              >
                <span className="text-sm text-muted">Fin des leçons</span>
                <span className="mt-1 block font-read text-lg font-semibold group-hover:text-accent">
                  Retour au module : devoir, boss et projet
                </span>
              </Link>
            )}
          </nav>
        </article>

        <aside className="grid content-start gap-8 text-sm xl:sticky xl:top-8 xl:self-start">
          <Panel title="Concepts de la leçon">
            <ul className="grid gap-2.5">
              {lesson.concepts.map((c) => (
                <li key={c.id} className="flex gap-2.5 leading-snug">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  {c.label}
                </li>
              ))}
            </ul>
          </Panel>
          {lesson.glossary.length > 0 && (
            <Panel title="Glossaire">
              <dl className="grid gap-3.5">
                {lesson.glossary.map((g) => (
                  <div key={g.term}>
                    <dt className="font-code text-[0.8rem] text-accent">{g.term}</dt>
                    <dd className="mt-0.5 leading-relaxed text-muted">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </aside>
      </div>
    </main>
  )
}

function Chip({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 backdrop-blur',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Une case par leçon du module : remplie si terminée, contour accent pour celle qu'on lit. */
function ChapterSteps({ lessons, currentId }: { lessons: Chapter['lessons']; currentId: string }) {
  return (
    <ol className="mt-8 flex max-w-[640px] gap-1.5" aria-label="Leçons du module">
      {lessons.map((l, i) => (
        <li key={l.id} className="flex-1">
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: l.id }}
            title={`${i + 1}. ${l.title}`}
            aria-current={l.id === currentId ? 'page' : undefined}
            className={cn(
              'block h-2 rounded-full transition-colors hover:bg-accent/70',
              l.completed ? 'bg-accent' : 'bg-cell-empty',
              l.id === currentId && 'ring-2 ring-accent ring-offset-2 ring-offset-ink',
            )}
          >
            <span className="sr-only">
              Leçon {i + 1} : {l.title}
              {l.completed && ', terminée'}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/** Sommaire collant ; la section visible est surlignée. */
function Toc({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className="hidden text-sm xl:sticky xl:top-8 xl:block xl:self-start" aria-label="Sommaire de la leçon">
      <p className="mb-3 font-medium text-muted">Dans cette leçon</p>
      <ol className="grid gap-0.5 border-l border-line">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                '-ml-px block border-l-2 py-1.5 pl-3 leading-snug',
                active === s.id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text',
              )}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-l border-line pl-4">
      <h2 className="mb-3 font-medium text-muted">{title}</h2>
      {children}
    </section>
  )
}

function FinishPanel({
  lesson,
  done,
  awarded,
  children,
}: {
  lesson: Lesson
  done: boolean
  awarded: number
  children: ReactNode
}) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="font-read text-2xl font-semibold">{done ? 'Leçon terminée' : 'Tu as tout lu ?'}</h2>
      <p className="mt-1 text-muted">
        {done
          ? awarded > 0
            ? `+${awarded} XP. Passe maintenant à la pratique.`
            : 'Passe maintenant à la pratique.'
          : 'Valide la leçon, puis mets-la en pratique avec le TP.'}
      </p>
      {children && <div className="mt-5">{children}</div>}
      {lesson.labs.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {lesson.labs.map((lab) => (
            <li key={lab.id}>
              <LabCard lab={lab} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LabCard({ lab }: { lab: ExerciseSummary }) {
  return (
    <Link
      to="/exercises/$exerciseId"
      params={{ exerciseId: lab.id }}
      className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 hover:border-accent"
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          lab.passed ? 'bg-pass/15 text-pass' : 'bg-accent/15 text-accent',
        )}
      >
        {lab.passed ? <Check className="size-4" /> : <FlaskConical className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted">TP {lab.passed ? 'réussi' : `${lab.xp} XP`}</span>
        <span className="block font-medium group-hover:text-accent">{lab.title}</span>
      </span>
    </Link>
  )
}

function NavCard({ to, label, title, next }: { to: string; label: string; title?: string; next?: boolean }) {
  return (
    <Link
      to="/lessons/$lessonId"
      params={{ lessonId: to }}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-accent',
        next && 'flex-row-reverse text-right',
      )}
    >
      {next ? (
        <ChevronRight className="size-5 shrink-0 text-muted group-hover:text-accent" />
      ) : (
        <ChevronLeft className="size-5 shrink-0 text-muted group-hover:text-accent" />
      )}
      <span className="min-w-0">
        <span className="text-sm text-muted">{label}</span>
        <span className="mt-0.5 block truncate font-read text-lg font-semibold group-hover:text-accent">
          {title ?? '…'}
        </span>
      </span>
    </Link>
  )
}
