import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowRight, BookOpenCheck, Check, FlaskConical, Layers, ListChecks, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/api'
import { cn } from '@/lib/utils'

type StepState = 'done' | 'current' | 'upcoming'
type Action =
  | { kind: 'complete' }
  | { kind: 'lab'; id: string }
  | { kind: 'scroll'; target: string }
  | { kind: 'lesson'; id: string }
  | { kind: 'chapter'; id: string }

type Step = {
  key: string
  icon: ReactNode
  title: string
  detail: string
  xp?: number
  done: boolean
  optional?: boolean
  action: Action
  cta: string
}

export type QuizState = { answered: number; total: number } | null

/** Fin de leçon : la suite du parcours, une seule action principale à la fois. */
export function FinishSteps({
  lesson,
  done,
  landedDone,
  awarded,
  completing,
  onComplete,
  quiz,
  nextTitle,
}: {
  lesson: Lesson
  done: boolean
  /** La leçon était déjà terminée à l'arrivée : ton calme, pas de relance. */
  landedDone: boolean
  awarded: number
  completing: boolean
  onComplete: () => void
  quiz: QuizState
  nextTitle?: string
}) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const [passed, setPassed] = useState(false)

  const steps: Step[] = [
    {
      key: 'lesson',
      icon: <BookOpenCheck className="size-4" />,
      title: 'Terminer la leçon',
      detail: done ? (awarded > 0 ? `Validée, +${awarded} XP` : 'Validée') : 'Tu as tout lu ? Valide ta lecture.',
      xp: lesson.xp,
      done,
      action: { kind: 'complete' },
      cta: 'Terminer la leçon',
    },
    ...lesson.labs.map<Step>((lab) => ({
      key: lab.id,
      icon: <FlaskConical className="size-4" />,
      title: `TP : ${lab.title}`,
      detail: lab.passed ? 'Réussi' : 'Mets la leçon en pratique, tests à l’appui.',
      xp: lab.xp,
      done: lab.passed,
      action: { kind: 'lab', id: lab.id },
      cta: `Étape suivante : le TP « ${lab.title} »`,
    })),
    ...(lesson.quiz_id
      ? [
          {
            key: 'quiz',
            icon: <ListChecks className="size-4" />,
            title: 'Quiz de la leçon',
            detail: quiz
              ? quiz.answered >= quiz.total
                ? `${quiz.total} questions répondues`
                : `${quiz.answered}/${quiz.total} questions répondues`
              : 'Vérifie ta compréhension.',
            done: !!quiz && quiz.total > 0 && quiz.answered >= quiz.total,
            action: { kind: 'scroll', target: 'lesson-quiz' },
            cta: 'Étape suivante : le quiz',
          } satisfies Step,
        ]
      : []),
    ...(lesson.flashcards.length
      ? [
          {
            key: 'cards',
            icon: <Layers className="size-4" />,
            title: 'Cartes mémo',
            detail: `${lesson.flashcards.length} cartes, à revoir quand tu veux`,
            done: false,
            optional: true,
            action: { kind: 'scroll', target: 'lesson-cards' },
            cta: 'Revoir les cartes',
          } satisfies Step,
        ]
      : []),
    lesson.next_id
      ? {
          key: 'next',
          icon: <ArrowRight className="size-4" />,
          title: nextTitle ? `Leçon suivante : ${nextTitle}` : 'Leçon suivante',
          detail: 'Continue sur ta lancée.',
          done: false,
          action: { kind: 'lesson', id: lesson.next_id },
          cta: 'Leçon suivante',
        }
      : {
          key: 'next',
          icon: <ArrowRight className="size-4" />,
          title: 'Retour au module',
          detail: 'Devoir, boss et projet t’attendent.',
          done: false,
          action: { kind: 'chapter', id: lesson.chapter.id },
          cta: 'Retour au module',
        },
  ]
  const currentIdx = steps.findIndex((s) => !s.done && !s.optional)
  const current = steps[currentIdx]
  const allDone = steps.filter((s) => !s.optional && s.key !== 'next').every((s) => s.done)
  const stateOf = (i: number): StepState => (steps[i]!.done ? 'done' : i === currentIdx ? 'current' : 'upcoming')

  // Pastille « étape suivante » quand on a dépassé le panneau (quiz, cartes plus bas).
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e) setPassed(!e.isIntersecting && e.boundingClientRect.top < 0)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <section
        ref={panelRef}
        className="relative isolate mt-14 overflow-hidden rounded-2xl border border-line bg-surface p-6 md:p-8"
        aria-labelledby="finish-title"
      >
        <div className="bg-grid pointer-events-none absolute -bottom-32 -left-24 -z-10 size-96" aria-hidden="true" />
        <div className="glow-accent pointer-events-none absolute -bottom-20 left-10 -z-10 size-56 rounded-full" aria-hidden="true" />
        <p className="text-xs font-semibold tracking-[0.1em] text-accent uppercase">La suite</p>
        <h2 id="finish-title" className="mt-1 font-read text-2xl font-semibold">
          {allDone ? 'Leçon bouclée' : done ? 'Leçon terminée, place à la pratique' : 'Tu arrives au bout'}
        </h2>
        <p className="mt-1 text-muted">
          {allDone
            ? 'Tout est fait ici. La suite du module t’attend.'
            : landedDone
              ? 'Tu as déjà validé cette leçon. Voici où tu en es.'
              : 'Une étape à la fois : la prochaine est en surbrillance.'}
        </p>

        {current && (
          <div className="mt-5">
            <StepAction step={current} completing={completing} onComplete={onComplete} primary={!landedDone || !done} />
          </div>
        )}

        <ol className="mt-7 grid" aria-label="Étapes après la lecture">
          {steps.map((s, i) => {
            const st = stateOf(i)
            return (
              <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    className={cn('absolute top-9 bottom-1 left-[17px] w-px', st === 'done' ? 'bg-pass/60' : 'bg-line')}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    'relative grid size-9 shrink-0 place-items-center rounded-xl border transition-colors',
                    st === 'done' && 'border-pass/40 bg-pass/15 text-pass',
                    st === 'current' && 'border-accent bg-accent text-accent-ink',
                    st === 'upcoming' && 'border-line bg-ink/50 text-muted',
                  )}
                  aria-hidden="true"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={st}
                      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    >
                      {st === 'done' ? <Check className="size-4" strokeWidth={3} /> : s.icon}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <StepLink step={s} className={cn('font-medium', st === 'upcoming' && 'text-muted')} />
                    <span className="sr-only">
                      {st === 'done' ? ', fait' : st === 'current' ? ', étape en cours' : s.optional ? ', facultatif' : ', à venir'}
                    </span>
                    {s.optional && <span className="text-xs text-muted">facultatif</span>}
                  </p>
                  <p className="text-sm text-muted">{s.detail}</p>
                </div>
                {s.xp !== undefined && (
                  <span
                    className={cn(
                      'mt-1 shrink-0 self-start rounded-full px-2 py-0.5 font-code text-xs',
                      s.done ? 'text-pass' : 'border border-line text-muted',
                    )}
                  >
                    {s.done ? 'acquis' : `+${s.xp} XP`}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <AnimatePresence>
        {passed && current && !landedDone && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className="fixed right-4 bottom-20 z-30 md:right-6 md:bottom-6"
          >
            <StepAction step={current} completing={completing} onComplete={onComplete} primary floating />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function scrollToId(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function StepLink({ step, className }: { step: Step; className?: string }) {
  const cls = cn('hover:text-accent', className)
  const a = step.action
  if (a.kind === 'lab')
    return (
      <Link to="/exercises/$exerciseId" params={{ exerciseId: a.id }} className={cls}>
        {step.title}
      </Link>
    )
  if (a.kind === 'lesson')
    return (
      <Link to="/lessons/$lessonId" params={{ lessonId: a.id }} className={cls}>
        {step.title}
      </Link>
    )
  if (a.kind === 'chapter')
    return (
      <Link to="/chapters/$chapterId" params={{ chapterId: a.id }} className={cls}>
        {step.title}
      </Link>
    )
  if (a.kind === 'scroll')
    return (
      <button type="button" className={cls} onClick={() => scrollToId(a.target)}>
        {step.title}
      </button>
    )
  return <span className={className}>{step.title}</span>
}

function StepAction({
  step,
  completing,
  onComplete,
  primary,
  floating,
}: {
  step: Step
  completing: boolean
  onComplete: () => void
  primary: boolean
  floating?: boolean
}) {
  const cls = cn(
    'group inline-flex h-11 max-w-full items-center gap-2 rounded-xl px-5 font-semibold transition-[opacity,transform] active:scale-[0.98]',
    primary ? 'bg-accent text-accent-ink hover:opacity-90' : 'border border-line hover:border-muted',
    floating && 'shadow-[0_12px_32px_-10px_rgb(0_0_0/0.6)]',
  )
  const body = (
    <>
      <span className="truncate">{step.cta}</span>
      {step.xp !== undefined && !step.done && (
        <span className={cn('inline-flex items-center gap-1 font-code text-sm', primary ? 'opacity-80' : 'text-accent')}>
          <Sparkles className="size-3.5" aria-hidden="true" />+{step.xp}
        </span>
      )}
      {step.action.kind === 'scroll' ? (
        <ArrowDown className="size-4 shrink-0 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
      ) : (
        <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </>
  )
  const a = step.action
  if (a.kind === 'complete')
    return (
      <button type="button" className={cls} onClick={onComplete} disabled={completing}>
        {body}
      </button>
    )
  if (a.kind === 'scroll')
    return (
      <button type="button" className={cls} onClick={() => scrollToId(a.target)}>
        {body}
      </button>
    )
  if (a.kind === 'lab')
    return (
      <Link to="/exercises/$exerciseId" params={{ exerciseId: a.id }} className={cls}>
        {body}
      </Link>
    )
  if (a.kind === 'lesson')
    return (
      <Link to="/lessons/$lessonId" params={{ lessonId: a.id }} className={cls}>
        {body}
      </Link>
    )
  return (
    <Link to="/chapters/$chapterId" params={{ chapterId: a.id }} className={cls}>
      {body}
    </Link>
  )
}
