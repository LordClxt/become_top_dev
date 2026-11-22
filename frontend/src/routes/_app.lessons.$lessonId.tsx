import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { GridZone } from '@/components/Backdrop'
import { Flashcards } from '@/components/Flashcards'
import { LessonBody, lessonSections } from '@/components/LessonBody'
import { FinishSteps } from '@/components/lesson/FinishSteps'
import { ReadingBar, ResumeBanner, scrollToSection, Toc, useReading, useSaveReading } from '@/components/lesson/reading'
import { Quiz } from '@/components/Quiz'
import { ErrorState, Loading } from '@/components/states'
import { announceXp } from '@/features/xp/xp-events'
import { api, type Chapter } from '@/lib/api'
import { cn } from '@/lib/utils'
import { docLabel } from '@/lib/source'

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
  // Cartes notées pendant cette visite (avant que le serveur ne renvoie cards_rated à jour).
  const [ratedNow, setRatedNow] = useState<Set<string>>(() => new Set())
  const complete = useMutation({
    mutationFn: () => api.completeLesson(lessonId),
    onSuccess: (r) => {
      announceXp({ amount: r.xp_awarded, reason: 'Leçon terminée', kind: 'lesson', title: lesson?.title })
      return qc.invalidateQueries()
    },
  })

  const quizId = lesson?.quiz_id
  const { data: quiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => api.quiz(quizId!),
    enabled: !!quizId,
  })

  const body = lesson?.body ?? ''
  const sections = useMemo(() => lessonSections(body), [body])
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections])
  const articleRef = useRef<HTMLDivElement>(null)
  const reading = useReading(articleRef, sectionIds)
  useSaveReading(lesson?.id, reading)
  // Reprise : l'ancre du lien (#section, depuis « Continuer ») l'emporte ; sinon, bandeau « Reprendre ici ».
  const [resumeFor, setResumeFor] = useState<string | null>(null)
  const resumeAnchor = lesson?.reading?.anchor
  const resumeProgress = lesson?.reading?.progress ?? 0
  useEffect(() => {
    if (!lesson) return
    const hash = decodeURIComponent(window.location.hash.slice(1))
    if (hash && sectionIds.includes(hash)) {
      // Après le rendu du corps et la restauration de défilement du routeur.
      const t = setTimeout(() => scrollToSection(hash), 60)
      return () => clearTimeout(t)
    }
    if (resumeAnchor && sectionIds.includes(resumeAnchor) && resumeProgress >= 0.05 && resumeProgress < 0.98) {
      setResumeFor(lesson.id)
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: une seule fois par leçon ouverte
  }, [lesson?.id])
  const showResume = resumeFor === lesson?.id && reading.progress < 0.05
  // État à l'arrivée sur la page : une leçon déjà terminée ne relance pas.
  const landed = useRef<{ id: string; done: boolean } | null>(null)
  if (lesson && landed.current?.id !== lesson.id) landed.current = { id: lesson.id, done: lesson.completed }

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />
  const lessons = chapter?.lessons ?? []
  const position = lessons.findIndex((l) => l.id === lesson.id)
  const titleOf = (id: string | null) => lessons.find((l) => l.id === id)?.title
  const done = lesson.completed || !!complete.data
  const landedDone = landed.current?.done ?? lesson.completed
  const checkpoints = lesson.checkpoints ?? []
  const solved = checkpoints.filter((c) => c.answered).length
  const minutesLeft = Math.ceil(lesson.duration_min * (1 - reading.progress))

  return (
    <main className="relative isolate overflow-x-clip">
      <ReadingBar progress={reading.progress} />
      <GridZone style={{ top: -140, right: -60 }} size={620} glow={{ x: -0.05, y: 0.05 }} />

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
        <h1 className="mt-4 max-w-[24ch] font-read text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl">
          {lesson.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Chip icon={<Clock className="size-3.5" />}>{lesson.duration_min} min de lecture</Chip>
          <Chip icon={<Sparkles className="size-3.5 text-accent" />} className="xp-hint">
            {lesson.xp} XP
          </Chip>
          {lesson.source.url ? (
            <a href={lesson.source.url} target="_blank" rel="noreferrer">
              <Chip icon={<BookOpen className="size-3.5" />}>Doc : {docLabel(lesson.source)}</Chip>
            </a>
          ) : (
            <Chip icon={<BookOpen className="size-3.5" />}>Livre, p. {lesson.source.pages}</Chip>
          )}
          {lesson.extra && <Chip>Au-delà du livre</Chip>}
          {done && (
            <Chip icon={<Check className="size-3.5 text-pass" />} className="text-pass">
              Terminée
            </Chip>
          )}
        </div>
        {lessons.length > 0 && (
          <div className="focus-hide">
            <ChapterSteps lessons={lessons} currentId={lesson.id} />
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 pb-24 xl:grid-cols-[200px_minmax(0,1fr)_280px] xl:gap-12">
        <Toc
          sections={sections}
          reading={reading}
          checkpoints={{ solved, total: checkpoints.length }}
          minutesLeft={minutesLeft}
          done={done}
        />

        <article className="min-w-0">
          {showResume && resumeAnchor && (
            <ResumeBanner
              title={sections.find((s) => s.id === resumeAnchor)?.title ?? 'ta dernière section'}
              minutesLeft={Math.ceil(lesson.duration_min * (1 - resumeProgress))}
              onResume={() => {
                setResumeFor(null)
                scrollToSection(resumeAnchor)
              }}
              onDismiss={() => setResumeFor(null)}
            />
          )}
          <div ref={articleRef}>
            <LessonBody
              body={lesson.body}
              visuals={lesson.visuals}
              lessonId={lesson.id}
              language={lesson.chapter.course_id === 'grails' ? 'groovy' : lesson.chapter.course_id}
              checkpoints={checkpoints}
              glossary={lesson.glossary}
            />
          </div>

          <FinishSteps
            lesson={lesson}
            done={done}
            landedDone={landedDone}
            awarded={complete.data?.xp_awarded ?? 0}
            completing={complete.isPending}
            onComplete={() => complete.mutate()}
            quiz={quiz ? { total: quiz.questions.length, answered: quiz.questions.filter((q) => q.answered).length } : null}
            nextTitle={titleOf(lesson.next_id)}
            cardsRated={Math.max(lesson.cards_rated ?? 0, [...ratedNow].filter((k) => k.startsWith(`${lesson.id}/`)).length)}
          />

          {lesson.quiz_id && (
            <div id="lesson-quiz" className="scroll-mt-20">
              <Quiz quizId={lesson.quiz_id} />
            </div>
          )}
          {lesson.flashcards.length > 0 && (
            <div id="lesson-cards" className="scroll-mt-20">
              <Flashcards
                cards={lesson.flashcards}
                storageKey={`cards:${lesson.id}`}
                // Chaque note alimente la révision espacée (id composite leçon/carte).
                onRate={(cardId, rating) => {
                  const key = `${lesson.id}/${cardId}`
                  setRatedNow((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
                  api
                    .rateCard(`${lesson.id}/${cardId}`, rating)
                    .then((r) => {
                      if (r.xp_awarded > 0) announceXp({ amount: r.xp_awarded, reason: 'Carte révisée', kind: 'review' })
                    })
                    .catch(() => {})
                    .finally(() => {
                      qc.invalidateQueries({ queryKey: ['today'] })
                      qc.invalidateQueries({ queryKey: ['review'] })
                      qc.invalidateQueries({ queryKey: ['lesson', lesson.id] })
                    })
                }}
              />
            </div>
          )}

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

        <aside className="focus-hide grid content-start gap-4 text-sm xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
          <Panel title="Ce que tu vas maîtriser" count={lesson.concepts.length}>
            <ol className="grid gap-3">
              {lesson.concepts.map((c, i) => {
                const [head, ...rest] = c.label.split(' : ')
                return (
                  <li key={c.id} className="flex gap-3 leading-snug">
                    <span className="mt-0.5 font-code text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="font-medium text-text">{head}</span>
                      {rest.length > 0 && <span className="mt-0.5 block text-muted">{rest.join(' : ')}</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </Panel>
          {lesson.glossary.length > 0 && (
            <Panel title="Glossaire" count={lesson.glossary.length}>
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

function Panel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur">
      <h2 className="mb-4 flex items-baseline justify-between gap-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        {title}
        {count !== undefined && <span className="font-code font-normal tracking-normal">{count}</span>}
      </h2>
      {children}
    </section>
  )
}

function NavCard({ to, label, title, next }: { to: string; label: string; title?: string; next?: boolean }) {
  return (
    <Link
      to="/lessons/$lessonId"
      params={{ lessonId: to }}
      className={cn(
        'group flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-accent',
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
