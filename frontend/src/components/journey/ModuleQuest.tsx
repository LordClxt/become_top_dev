import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FlaskConical,
  Hammer,
  type LucideIcon,
  Play,
  ShieldCheck,
  Swords,
  Trophy,
} from 'lucide-react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import type { Chapter, ExerciseSummary } from '@/lib/api'
import { cn } from '@/lib/utils'
import { missingSentence, moduleXp, nextStep, STEP_LABEL, type Step } from './model'

/** Lien vers une étape, leçon ou exercice. */
function StepLink({
  step,
  className,
  children,
  ...rest
}: { step: Step; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<'a'>, 'href'>) {
  return step.kind === 'lesson' ? (
    <Link to="/lessons/$lessonId" params={{ lessonId: step.id }} className={className} {...rest}>
      {children}
    </Link>
  ) : (
    <Link to="/exercises/$exerciseId" params={{ exerciseId: step.id }} className={className} {...rest}>
      {children}
    </Link>
  )
}

const xpLabel = (xp: number, done: boolean) => (done ? `${xp} XP obtenus` : `+${xp} XP`)

/* --- 1. La prochaine action ------------------------------------------------------------- */

export function NextStepHero({ chapter: ch }: { chapter: Chapter }) {
  const step = nextStep(ch)
  const started = ch.lessons.some((l) => l.completed) || ch.mastery.labs_passed > 0
  if (!step) {
    return (
      <div className="j-hero mt-8 flex items-center gap-4 rounded-2xl border border-pass/40 bg-surface p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pass/15 text-pass">
          <Trophy className="size-5" />
        </span>
        <p className="text-sm leading-relaxed">
          <span className="font-medium">Tout est fait dans ce module.</span>{' '}
          <span className="text-muted">Rejoue un TP ou le boss quand tu veux pour garder la main.</span>
        </p>
      </div>
    )
  }
  return (
    <StepLink
      step={step}
      className="j-hero j-lift group mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-accent/50 bg-surface p-4 pr-5 sm:flex-nowrap"
    >
      <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 font-medium text-accent-ink">
        <Play className="size-4 fill-current" />
        {started ? 'Reprendre' : 'Commencer'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs tracking-wide text-muted uppercase">Étape suivante</span>
        <span className="mt-0.5 block truncate font-medium group-hover:text-accent">
          {STEP_LABEL[step.kind]} {step.title}
        </span>
      </span>
      <span className="shrink-0 font-code text-sm text-accent tabular-nums">{step.xp} XP</span>
      <ArrowRight className="hidden size-5 shrink-0 text-muted transition-transform duration-(--dur-fast) group-hover:translate-x-1 group-hover:text-accent sm:block" />
    </StepLink>
  )
}

/* --- 2. Le chemin des étapes ---------------------------------------------------------- */

type Row = { step: Step; number?: number; minutes?: number }

export function QuestPath({ chapter: ch }: { chapter: Chapter }) {
  const currentId = nextStep(ch)?.id
  const rows: Row[] = ch.lessons.flatMap((l, i) => [
    {
      step: {
        kind: 'lesson',
        id: l.id,
        title: l.title,
        xp: l.xp,
        done: l.completed,
      } as Step,
      number: i + 1,
      minutes: l.duration_min,
    },
    ...l.labs.map((lab) => ({
      step: {
        kind: 'lab',
        id: lab.id,
        title: lab.title,
        xp: lab.xp,
        done: lab.passed,
      } as Step,
    })),
  ])
  return (
    <ol className="relative mt-5" aria-label="Étapes du module">
      {rows.map((row, i) => (
        <QuestRow key={row.step.id} row={row} current={row.step.id === currentId} last={i === rows.length - 1} />
      ))}
    </ol>
  )
}

function QuestRow({ row, current, last }: { row: Row; current: boolean; last: boolean }) {
  const { step } = row
  const lesson = step.kind === 'lesson'
  const state = step.done ? 'Terminé' : current ? 'À faire maintenant' : 'À venir'
  return (
    <li className={cn('relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4', lesson ? 'pt-2' : '')}>
      {/* Le rail : plein jusqu'à l'étape en cours, il se lit comme une barre de progression. */}
      {!last && (
        <span
          className={cn(
            'j-rail absolute bottom-0 left-[1.375rem] w-0.5 -translate-x-1/2',
            lesson ? 'top-14' : 'top-9',
            step.done ? 'bg-accent' : 'bg-line',
          )}
          aria-hidden="true"
        />
      )}
      <span className={cn('relative z-10 grid justify-items-center', lesson ? 'mt-3' : 'mt-2.5')}>
        <span className={cn('relative', lesson ? 'size-11' : 'size-7')}>
          {current && (
            <span
              className={cn('node-pulse absolute inset-0 bg-accent', lesson ? 'rounded-xl' : 'rounded-lg')}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'relative grid size-full place-items-center border-2 font-code tabular-nums',
              lesson ? 'rounded-xl text-sm' : 'rounded-lg text-xs',
              step.done && 'border-accent bg-accent text-accent-ink',
              current && 'border-accent bg-ink text-accent',
              !step.done && !current && 'border-line bg-ink text-muted',
            )}
            aria-hidden="true"
          >
            {step.done ? (
              <Check className={lesson ? 'size-5' : 'size-3.5'} strokeWidth={2.75} />
            ) : lesson ? (
              row.number
            ) : (
              <FlaskConical className="size-3.5" />
            )}
          </span>
        </span>
      </span>
      <StepLink
        step={step}
        aria-current={current ? 'step' : undefined}
        className={cn(
          'j-lift group mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border',
          lesson ? 'px-5 py-4' : 'ml-0 px-4 py-2.5',
          current
            ? 'border-accent/60 bg-surface'
            : 'border-transparent hover:border-line hover:bg-surface/70 focus-visible:border-line',
        )}
      >
        <span className="min-w-0">
          {lesson ? (
            <span className="block font-read text-xl leading-snug font-semibold group-hover:text-accent">
              {step.title}
            </span>
          ) : (
            <span className="block text-sm leading-snug group-hover:text-accent">
              <span className="mr-1.5 font-code text-xs text-muted">TP</span>
              {step.title}
            </span>
          )}
          <span className={cn('block text-muted', lesson ? 'mt-1 text-sm' : 'mt-0.5 text-xs')}>
            {lesson && `${row.minutes} min de lecture`}
            {current ? (
              <span className="text-accent">{lesson ? ', ' : ''}à faire maintenant</span>
            ) : (
              <span className="sr-only">
                {lesson ? ', ' : ''}
                {state}
              </span>
            )}
          </span>
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 font-code text-xs whitespace-nowrap tabular-nums',
            step.done ? 'text-muted' : current ? 'bg-accent text-accent-ink' : 'bg-accent/12 text-accent',
          )}
        >
          {xpLabel(step.xp, step.done)}
        </span>
      </StepLink>
    </li>
  )
}

/* --- 3. Le dernier acte ---------------------------------------------------------------- */

const SIDE: Record<'assignment' | 'project', { label: string; icon: LucideIcon; text: string }> = {
  assignment: {
    label: 'Devoir',
    icon: ClipboardCheck,
    text: 'Mettre bout à bout ce que le module enseigne.',
  },
  project: {
    label: 'Projet fil rouge',
    icon: Hammer,
    text: 'Faire grandir le projet du cours d’une étape.',
  },
}

export function Finale({ chapter: ch }: { chapter: Chapter }) {
  const side = (['assignment', 'project'] as const).flatMap((role) => (ch[role] ? [{ role, ex: ch[role] }] : []))
  if (!ch.boss && side.length === 0) return null
  const lessonsLeft = ch.lessons.filter((l) => !l.completed).length
  const currentId = nextStep(ch)?.id
  return (
    <section className="j-finale relative mt-10" aria-labelledby="finale">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <h2 id="finale" className="font-read text-2xl font-semibold italic">
          Le dernier acte
        </h2>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <p className="mt-2 text-center text-sm text-muted">
        Tout ce que tu viens d’apprendre, assemblé, puis mis à l’épreuve.
      </p>
      <ol className="mt-6 grid gap-4">
        {side.length > 0 && (
          <li className="grid gap-4 md:grid-cols-2">
            {side.map(({ role, ex }) => (
              <SideCard key={ex.id} ex={ex} spec={SIDE[role]} current={ex.id === currentId} />
            ))}
          </li>
        )}
        {ch.boss && (
          <li>
            <BossCard
              boss={ch.boss}
              lessonsLeft={lessonsLeft}
              lessonsTotal={ch.lessons.length}
              current={ch.boss.id === currentId}
            />
          </li>
        )}
      </ol>
    </section>
  )
}

function SideCard({ ex, spec, current }: { ex: ExerciseSummary; spec: (typeof SIDE)['assignment']; current: boolean }) {
  return (
    <Link
      to="/exercises/$exerciseId"
      params={{ exerciseId: ex.id }}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'j-lift group flex gap-4 rounded-2xl border bg-surface/70 p-5 hover:border-accent',
        current ? 'border-accent/60' : 'border-line',
      )}
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
        <span className="text-sm text-muted">
          {spec.label}
          {current && <span className="text-accent">, à faire maintenant</span>}
        </span>
        <span className="mt-0.5 block font-medium group-hover:text-accent">{ex.title}</span>
        <span className="mt-1 block text-sm text-muted">{spec.text}</span>
        <span className={cn('mt-3 block font-code text-xs', ex.passed ? 'text-pass' : 'text-accent')}>
          {ex.passed ? `Réussi, ${ex.xp} XP obtenus` : `+${ex.xp} XP`}
        </span>
      </span>
    </Link>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Le boss : la seule carte ambre de la page, le point culminant du module. */
function BossCard({
  boss,
  lessonsLeft,
  lessonsTotal,
  current,
}: {
  boss: ExerciseSummary
  lessonsLeft: number
  lessonsTotal: number
  current: boolean
}) {
  const won = boss.passed
  return (
    <Link
      to="/exercises/$exerciseId"
      params={{ exerciseId: boss.id }}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'j-boss j-lift group relative isolate block overflow-hidden rounded-2xl border-2 bg-surface p-6 md:p-8',
        won ? 'border-pass/60' : 'border-fail/60 hover:border-fail',
      )}
      data-won={won || undefined}
    >
      <span
        className="j-boss-glow pointer-events-none absolute -right-24 -bottom-28 -z-10 size-80 rounded-full blur-[90px]"
        aria-hidden="true"
      />
      <span className="bg-grid pointer-events-none absolute -top-10 -right-10 -z-10 size-80" aria-hidden="true" />
      <span className="flex flex-wrap items-center justify-between gap-4">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase',
            won ? 'border-pass/50 text-pass' : 'border-fail/50 text-fail',
          )}
        >
          {won ? <Trophy className="size-3.5" /> : <Swords className="size-3.5" />}
          {won ? 'Boss vaincu' : 'Boss du module'}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex gap-[3px]" role="img" aria-label={`Difficulté ${boss.difficulty} sur 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'size-3 rounded-[2px]',
                  i < boss.difficulty ? (won ? 'bg-pass' : 'bg-fail') : 'bg-cell-empty',
                )}
              />
            ))}
          </span>
          <span className="font-code text-xs text-muted">difficulté {boss.difficulty}/5</span>
        </span>
      </span>
      <span className="mt-5 flex items-start gap-5">
        <span
          className={cn(
            'hidden size-16 shrink-0 place-items-center rounded-2xl border-2 sm:grid',
            won ? 'border-pass bg-pass/15 text-pass' : 'border-fail/70 bg-fail/10 text-fail',
          )}
          aria-hidden="true"
        >
          {won ? <Trophy className="size-7" strokeWidth={1.75} /> : <Swords className="size-7" strokeWidth={1.75} />}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              'block max-w-[30ch] font-read text-3xl leading-tight font-semibold',
              won ? 'group-hover:text-pass' : 'group-hover:text-fail',
            )}
          >
            {capitalize(boss.title.replace(/^Boss\s*:\s*/, ''))}
          </span>
          <span className="mt-3 block max-w-[56ch] text-sm leading-relaxed text-muted">
            {won
              ? 'Battu. Tu peux le rejouer pour viser une solution plus propre.'
              : 'Tout le module dans un seul problème. Sans indice : personne ne te guidera pas à pas.'}
          </span>
        </span>
      </span>
      <span className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={cn('font-code', won ? 'text-pass' : 'text-fail')}>
            {won ? `${boss.xp} XP obtenus` : `+${boss.xp} XP`}
          </span>
          {!won && <span className="text-muted">Sans indice</span>}
          {!won && lessonsLeft > 0 && <span className="text-muted">Recommandé après les {lessonsTotal} leçons</span>}
        </span>
        <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', won ? 'text-pass' : 'text-fail')}>
          {won ? 'Rejouer' : 'Affronter le boss'}
          <ArrowRight className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  )
}

/* --- 4. Maîtrise et récompense --------------------------------------------------------- */

export function MasteryPanel({ chapter: ch }: { chapter: Chapter }) {
  const m = ch.mastery
  const xp = moduleXp(ch)
  return (
    <div className="grid gap-7">
      <MasteryRing score={m.score} threshold={ch.mastery_threshold} mastered={m.mastered} />
      <p className={cn('-mt-2 text-sm leading-relaxed', m.mastered ? 'text-pass' : '')}>
        {missingSentence(m, ch.mastery_threshold)}
      </p>
      <dl className="grid gap-4 text-sm">
        <Meter label="Leçons" len={m.lessons_done} cap={m.lessons_total} />
        <Meter label="TP réussis" len={m.labs_passed} cap={m.labs_total} />
        <div>
          <dt className="mb-1.5 flex justify-between text-muted">
            Quiz justes du premier coup
            <span className="font-code text-xs tabular-nums">
              {m.quiz_correct}/{m.quiz_total}
            </span>
          </dt>
          <dd>
            {/* Trop de questions pour une case chacune : une barre continue. */}
            <span className="block h-2.5 overflow-hidden rounded-[2px] bg-cell-empty">
              <span
                className="block h-full bg-accent"
                style={{
                  width: `${m.quiz_total ? (m.quiz_correct / m.quiz_total) * 100 : 0}%`,
                }}
              />
            </span>
          </dd>
        </div>
      </dl>
      <section aria-labelledby="module-xp" className="rounded-2xl border border-line bg-surface/70 p-4">
        <h2 id="module-xp" className="text-sm text-muted">
          XP du module
        </h2>
        <p className="mt-1 font-code text-lg tabular-nums">
          <span className="text-accent">{xp.won}</span>
          <span className="text-muted"> / {xp.total}</span>
        </p>
        <SliceMeter
          len={xp.total ? Math.round((xp.won / xp.total) * 20) : 0}
          cap={20}
          size="sm"
          label={`${xp.won} XP gagnés sur ${xp.total}`}
          className="mt-2"
        />
      </section>
    </div>
  )
}

function Meter({ label, len, cap }: { label: string; len: number; cap: number }) {
  return (
    <div>
      <dt className="mb-1.5 flex justify-between text-muted">
        {label}
        <span className="font-code text-xs tabular-nums">
          {len}/{cap}
        </span>
      </dt>
      <dd>
        <SliceMeter len={len} cap={cap} size="sm" label={`${label} : ${len} sur ${cap}`} />
      </dd>
    </div>
  )
}

/** Anneau de maîtrise : se remplit à l'arrivée, avec un repère au seuil qui ouvre le module suivant. */
function MasteryRing({ score, threshold, mastered }: { score: number; threshold: number; mastered: boolean }) {
  const r = 52
  const c = 2 * Math.PI * r
  const angle = threshold * 2 * Math.PI - Math.PI / 2
  const reduce = useReducedMotion()
  const target = Math.min(1, score)
  const v = useMotionValue(reduce ? target : 0)
  const offset = useTransform(v, (s) => c * (1 - s))
  const [pct, setPct] = useState(Math.round(target * 100))
  useEffect(() => {
    if (reduce) {
      v.set(target)
      setPct(Math.round(target * 100))
      return
    }
    const ctl = animate(v, target, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.15,
      onUpdate: (s) => setPct(Math.round(s * 100)),
    })
    return () => ctl.stop()
  }, [target, reduce, v])
  return (
    <section aria-labelledby="mastery" className="flex items-center gap-5">
      <span className="relative shrink-0">
        <svg
          viewBox="0 0 128 128"
          className="size-28"
          role="img"
          aria-label={`Maîtrise ${Math.round(score * 100)} %, seuil ${Math.round(threshold * 100)} %`}
        >
          <circle cx={64} cy={64} r={r} fill="none" className="stroke-cell-empty" strokeWidth={10} />
          <motion.circle
            cx={64}
            cy={64}
            r={r}
            fill="none"
            className={mastered ? 'stroke-pass' : 'stroke-accent'}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={c}
            style={{ strokeDashoffset: offset }}
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
          <text
            x={64}
            y={mastered ? 64 : 70}
            textAnchor="middle"
            className="fill-text font-read text-[26px] font-semibold"
            aria-hidden="true"
          >
            {pct}%
          </text>
          {mastered && (
            <text
              x={64}
              y={84}
              textAnchor="middle"
              className="fill-pass font-code text-[10px] tracking-widest"
              aria-hidden="true"
            >
              MAÎTRISÉ
            </text>
          )}
        </svg>
        {mastered && (
          <span
            className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 border-ink bg-pass text-ink"
            aria-hidden="true"
          >
            <ShieldCheck className="size-5" />
          </span>
        )}
      </span>
      <div className="min-w-0">
        <h2 id="mastery" className={cn('text-sm font-medium', mastered ? 'text-pass' : 'text-muted')}>
          {mastered ? 'Module maîtrisé' : 'Ta maîtrise'}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Le trait marque {Math.round(threshold * 100)} % : le seuil de maîtrise. Seuil atteint et boss battu, le module suivant s’ouvre.
        </p>
      </div>
    </section>
  )
}
