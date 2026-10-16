import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Boxes, Check, ChevronLeft, ClipboardCheck, FlaskConical, Hammer, type LucideIcon, Swords } from 'lucide-react'
import { GridZone } from '@/components/Backdrop'
import { SliceMeter } from '@/components/SliceMeter'
import { ErrorState, Loading } from '@/components/states'
import { coursesQuery } from '@/features/courses/queries'
import { api, type Chapter, type ExerciseSummary } from '@/lib/api'
import { iconFor } from '@/lib/course-icons'
import { cn } from '@/lib/utils'
import { docLabel } from '@/lib/source'

export const Route = createFileRoute('/_app/chapters/$chapterId')({ component: ChapterPage })

const FINALE: Record<'assignment' | 'project', { label: string; icon: LucideIcon; text: string }> = {
  assignment: { label: 'Devoir', icon: ClipboardCheck, text: 'Mettre bout à bout ce que le module enseigne.' },
  project: { label: 'Projet fil rouge', icon: Hammer, text: 'Faire avancer le projet du cours d’une étape.' },
}

function ChapterPage() {
  const { chapterId } = Route.useParams()
  const { data: ch, error, isPending } = useQuery({
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
  const currentId = ch.lessons.find((l) => !l.completed)?.id

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -140, right: -80 }} size={600} glow={{ x: -0.1, y: 0.05 }} />
      <div className="mx-auto grid max-w-[1150px] gap-14 px-6 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_300px]">
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

          <h2 className="mt-14 font-read text-2xl font-semibold">Leçons</h2>
          <ol className="relative mt-5">
            {ch.lessons.map((lesson, i) => (
              <LessonStep
                key={lesson.id}
                lesson={lesson}
                number={i + 1}
                current={lesson.id === currentId}
                last={i === ch.lessons.length - 1}
              />
            ))}
          </ol>

          <Finale chapter={ch} />
        </div>

        <aside className="grid min-w-0 content-start gap-8 lg:sticky lg:top-24 lg:self-start lg:pt-4">
          <MasteryRing score={m.score} threshold={ch.mastery_threshold} mastered={m.mastered} />
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="mb-1.5 text-muted">Leçons</dt>
              <dd>
                <SliceMeter len={m.lessons_done} cap={m.lessons_total} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="mb-1.5 text-muted">TP réussis</dt>
              <dd>
                <SliceMeter len={m.labs_passed} cap={m.labs_total} size="sm" />
              </dd>
            </div>
            <div>
              <dt className="mb-1.5 text-muted">Quiz justes du premier coup</dt>
              <dd className="flex items-center gap-3">
                {/* Trop de questions pour une case chacune : une barre continue. */}
                <span className="h-2.5 flex-1 overflow-hidden rounded-[2px] bg-cell-empty">
                  <span
                    className="block h-full bg-accent"
                    style={{ width: `${m.quiz_total ? (m.quiz_correct / m.quiz_total) * 100 : 0}%` }}
                  />
                </span>
                <span className="font-code text-xs text-muted tabular-nums">
                  {m.quiz_correct}/{m.quiz_total}
                </span>
              </dd>
            </div>
          </dl>
          <section>
            <h2 className="text-sm font-medium text-muted">Objectifs</h2>
            <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed">
              {ch.objectives.map((o) => (
                <li key={o} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-accent" aria-hidden="true" />
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
              <>Source : chapitre {ch.source.chapter}, pages {ch.source.pages}</>
            )}
          </p>
        </aside>
      </div>
    </main>
  )
}

function LessonStep({
  lesson,
  number,
  current,
  last,
}: {
  lesson: Chapter['lessons'][number]
  number: number
  current: boolean
  last: boolean
}) {
  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
      {/* Le fil entre deux étapes : plein si la leçon est terminée. */}
      {!last && (
        <span
          className={cn('absolute top-12 bottom-0 left-[1.375rem] w-0.5 -translate-x-1/2', lesson.completed ? 'bg-accent' : 'bg-line')}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 mt-4 size-11">
        {current && <span className="node-pulse absolute inset-0 rounded-xl bg-accent" aria-hidden="true" />}
        <span
          className={cn(
            'relative grid size-full place-items-center rounded-xl border-2 font-code text-sm tabular-nums',
            lesson.completed && 'border-accent bg-accent text-accent-ink',
            current && 'border-accent bg-ink text-accent',
            !lesson.completed && !current && 'border-line bg-ink text-muted',
          )}
        >
          {lesson.completed ? <Check className="size-5" strokeWidth={2.5} aria-label="Terminée" /> : number}
        </span>
      </span>
      <Link
        to="/lessons/$lessonId"
        params={{ lessonId: lesson.id }}
        className={cn(
          'group mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-xl border px-5 py-4 transition-colors duration-(--dur-fast)',
          current ? 'border-accent/60 bg-surface' : 'border-transparent hover:border-line hover:bg-surface/70',
        )}
        aria-current={current ? 'step' : undefined}
      >
        <span>
          <span className="block font-read text-xl leading-snug font-semibold group-hover:text-accent">{lesson.title}</span>
          <span className="mt-1 block text-sm text-muted">
            {lesson.duration_min} min de lecture
            {current && <span className="text-accent">, à faire maintenant</span>}
          </span>
          {lesson.labs.length > 0 && (
            <span className="mt-3 flex flex-wrap gap-2">
              {lesson.labs.map((lab) => (
                <span
                  key={lab.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
                    lab.passed ? 'border-pass/50 text-pass' : 'border-line text-muted',
                  )}
                >
                  {lab.passed ? <Check className="size-3" /> : <FlaskConical className="size-3" />}
                  TP {lab.title}
                </span>
              ))}
            </span>
          )}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 font-code text-xs tabular-nums',
            lesson.completed ? 'text-muted' : 'bg-accent/12 text-accent',
          )}
        >
          {lesson.completed ? `${lesson.xp} XP obtenus` : `+${lesson.xp} XP`}
        </span>
      </Link>
    </li>
  )
}

function Finale({ chapter: ch }: { chapter: Chapter }) {
  const side = (['assignment', 'project'] as const).flatMap((role) => (ch[role] ? [{ role, ex: ch[role] }] : []))
  if (!ch.boss && side.length === 0) return null
  return (
    <section className="mt-14" aria-labelledby="finale">
      <h2 id="finale" className="font-read text-2xl font-semibold">
        Pour finir le module
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ch.boss && <BossCard boss={ch.boss} />}
        {side.map(({ role, ex }) => {
          const spec = FINALE[role]
          return (
            <Link
              key={ex.id}
              to="/exercises/$exerciseId"
              params={{ exerciseId: ex.id }}
              className="group flex gap-4 rounded-2xl border border-line bg-surface/70 p-5 transition-colors duration-(--dur-fast) hover:border-accent"
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl',
                  ex.passed ? 'bg-pass/15 text-pass' : 'bg-accent/12 text-accent',
                )}
              >
                {ex.passed ? <Check className="size-5" /> : <spec.icon className="size-5" />}
              </span>
              <span className="min-w-0">
                <span className="text-sm text-muted">{spec.label}</span>
                <span className="mt-0.5 block font-medium group-hover:text-accent">{ex.title}</span>
                <span className="mt-1 block text-sm text-muted">{spec.text}</span>
                <span className={cn('mt-3 block font-code text-xs', ex.passed ? 'text-pass' : 'text-accent')}>
                  {ex.passed ? 'Réussi' : `+${ex.xp} XP`}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/** Le boss : la seule carte ambre de la page, sur toute la largeur. */
function BossCard({ boss }: { boss: ExerciseSummary }) {
  return (
    <Link
      to="/exercises/$exerciseId"
      params={{ exerciseId: boss.id }}
      className={cn(
        'group relative isolate overflow-hidden rounded-2xl border-2 p-6 transition-colors duration-(--dur-fast) md:col-span-2 md:p-7',
        boss.passed ? 'border-pass/60 bg-surface' : 'border-fail/60 bg-surface hover:border-fail',
      )}
    >
      <span
        className="pointer-events-none absolute -right-20 -bottom-24 -z-10 size-72 rounded-full bg-fail opacity-[var(--glow-opacity)] blur-[90px]"
        aria-hidden="true"
      />
      <span className="bg-grid pointer-events-none absolute -top-10 -right-10 -z-10 size-72" aria-hidden="true" />
      <span className="flex flex-wrap items-center justify-between gap-4">
        <span className={cn('flex items-center gap-2 text-sm', boss.passed ? 'text-pass' : 'text-fail')}>
          {boss.passed ? <Check className="size-4" /> : <Swords className="size-4" />}
          {boss.passed ? 'Boss vaincu' : 'Boss du module'}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex gap-[3px]" role="img" aria-label={`Difficulté ${boss.difficulty} sur 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={cn('size-3 rounded-[2px]', i < boss.difficulty ? 'bg-fail' : 'bg-cell-empty')} />
            ))}
          </span>
          <span className="font-code text-xs text-muted">difficulté {boss.difficulty}/5</span>
        </span>
      </span>
      <span className="mt-4 block max-w-[30ch] font-read text-3xl leading-tight font-semibold group-hover:text-fail">
        {capitalize(boss.title.replace(/^Boss\s*:\s*/, ''))}
      </span>
      <span className="mt-3 block max-w-[56ch] text-sm leading-relaxed text-muted">
        Tout le module dans un seul problème, sans indices guidés pas à pas. Le battre compte lourd dans la maîtrise.
      </span>
      <span className={cn('mt-5 block font-code text-sm', boss.passed ? 'text-pass' : 'text-accent')}>
        {boss.passed ? `${boss.xp} XP obtenus` : `+${boss.xp} XP`}
      </span>
    </Link>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Anneau de maîtrise : la part atteinte, et un repère au seuil qui ouvre le module suivant. */
function MasteryRing({ score, threshold, mastered }: { score: number; threshold: number; mastered: boolean }) {
  const r = 52
  const c = 2 * Math.PI * r
  const angle = threshold * 2 * Math.PI - Math.PI / 2
  return (
    <section aria-labelledby="mastery" className="flex items-center gap-5">
      <svg viewBox="0 0 128 128" className="size-28 shrink-0" role="img" aria-label={`Maîtrise ${Math.round(score * 100)} %`}>
        <circle cx={64} cy={64} r={r} fill="none" className="stroke-cell-empty" strokeWidth={10} />
        <circle
          cx={64}
          cy={64}
          r={r}
          fill="none"
          className={cn('transition-[stroke-dashoffset] duration-(--dur-slow) ease-(--ease-out)', mastered ? 'stroke-pass' : 'stroke-accent')}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, score))}
          transform="rotate(-90 64 64)"
        />
        <line
          x1={64 + (r - 9) * Math.cos(angle)}
          y1={64 + (r - 9) * Math.sin(angle)}
          x2={64 + (r + 9) * Math.cos(angle)}
          y2={64 + (r + 9) * Math.sin(angle)}
          className="stroke-text"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <text x={64} y={70} textAnchor="middle" className="fill-text font-read text-[26px] font-semibold">
          {Math.round(score * 100)}%
        </text>
      </svg>
      <div className="min-w-0">
        <h2 id="mastery" className="text-sm font-medium text-muted">
          Ta maîtrise
        </h2>
        <p className="mt-1 text-sm leading-relaxed">
          {mastered
            ? 'Module maîtrisé : le suivant est ouvert.'
            : `Le trait sur l’anneau marque ${Math.round(threshold * 100)} % : le seuil qui ouvre le module suivant.`}
        </p>
      </div>
    </section>
  )
}
