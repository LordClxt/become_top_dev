import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BookOpen, FlaskConical, Layers, LockOpen, Map as MapIcon, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { plural } from '@/features/courses/summary'
import { Button } from '@/components/ui/button'
import type { Course, CourseChapter, TodayContinue } from '@/lib/api'
import { continueLink } from './queries'

type OpenChapter = Extract<CourseChapter, { available: true }>

function greeting(name: string | undefined) {
  const h = new Date().getHours()
  const hello = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
  return name ? `${hello}, ${name}` : hello
}

/**
 * Le prochain pas, en grand : un seul bouton, raccourci Entrée ou C. Quand des cartes sont dues, la séance
 * commence par un échauffement (Entrée : réviser) et « Continuer » passe au second plan (C).
 */
export function ContinueHero({
  item,
  courses,
  name,
  reviewDue = 0,
}: {
  item: TodayContinue
  courses: Course[]
  name?: string
  reviewDue?: number
}) {
  const navigate = useNavigate()
  const course = courses.find((c) => c.id === item.course_id)
  const all = course?.tracks.flatMap((t) => t.chapters) ?? []
  const idx = all.findIndex((c) => c.available && c.id === item.chapter_id)
  const chapter = (idx >= 0 ? all[idx] : undefined) as OpenChapter | undefined
  const after = idx >= 0 ? all[idx + 1] : undefined
  const m = chapter?.mastery
  const link = continueLink(item)
  const Icon = item.type === 'lesson' ? BookOpen : item.type === 'exercise' ? (item.label.startsWith('Boss') ? Trophy : FlaskConical) : MapIcon

  const warmup = reviewDue > 0
  const warmupMin = Math.max(1, Math.round((reviewDue * 20) / 60))

  // Quand rien n'a le focus : Entrée lance l'échauffement s'il y en a un, sinon la suite ; C va toujours à la suite.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const el = document.activeElement
      if (el && el !== document.body) return
      if (e.key === 'Enter' && warmup) {
        e.preventDefault()
        void navigate({ to: '/review' })
      } else if (e.key === 'Enter' || e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        void navigate(link)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, link, warmup])

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="continue-title"
      className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface/80 p-7 backdrop-blur md:p-9"
    >
      <div className="glow-accent pointer-events-none absolute -top-24 -left-16 -z-10 size-72 rounded-full" aria-hidden="true" />
      <p className="text-sm text-muted" suppressHydrationWarning>
        {greeting(name)}
      </p>
      <p className="mt-5 text-sm text-muted">
        <span className="text-text">{item.course_title}</span> · {item.chapter_title}
      </p>
      <div className="mt-3 flex items-start gap-5">
        <span className="relative hidden size-16 shrink-0 sm:block">
          <span className="node-pulse absolute inset-0 rounded-2xl bg-accent" aria-hidden="true" />
          <span className="relative grid size-full place-items-center rounded-2xl border-2 border-accent bg-ink text-accent">
            <Icon className="size-7" strokeWidth={1.75} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-code text-xs tracking-wider text-accent uppercase">{item.label}</p>
          <h1 id="continue-title" className="mt-1 font-read text-3xl leading-[1.1] font-semibold tracking-tight md:text-[2.6rem]">
            {item.title}
          </h1>
        </div>
      </div>

      {m && (
        <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-line pt-5 sm:gap-5">
          <Meter label="Leçons" len={m.lessons_done} cap={m.lessons_total} />
          <Meter label="TP réussis" len={m.labs_passed} cap={m.labs_total} />
          <div>
            <dt className="text-sm text-muted">Maîtrise du module</dt>
            <dd className="mt-1 font-read text-2xl font-semibold tabular-nums">{Math.round(m.score * 100)} %</dd>
          </div>
        </dl>
      )}

      {warmup && (
        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3.5">
          <Layers className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-medium text-text">Échauffement : {plural(reviewDue, 'carte', 'cartes')}</span>
            <span className="text-muted"> · environ {warmupMin}&nbsp;min. Rappeler d'abord ce que tu sais prépare la suite.</span>
          </p>
          <Button asChild className="rounded-lg">
            <Link to="/review">
              Réviser d'abord
              <kbd className="habit-kbd ml-1 hidden md:inline">Entrée</kbd>
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button asChild size="lg" variant={warmup ? 'outline' : 'default'} className="h-12 rounded-xl px-6 text-base">
          <Link {...link}>
            {warmup ? 'Puis continuer' : 'Continuer'}
            <ArrowRight className="size-4" />
            <kbd className="habit-kbd ml-1 hidden md:inline">{warmup ? 'C' : 'Entrée'}</kbd>
          </Link>
        </Button>
        {after && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LockOpen className="size-4 text-accent" />
            Maîtrisé, il ouvre «&nbsp;{after.title}&nbsp;»
          </p>
        )}
      </div>
    </motion.section>
  )
}

function Meter({ label, len, cap }: { label: string; len: number; cap: number }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2.5">
        <SliceMeter len={len} cap={cap} size="sm" label={`${label} : ${len} sur ${cap}`} />
      </dd>
    </div>
  )
}

export function AllDoneHero({ name }: { name?: string }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/70 p-8">
      <p className="text-sm text-muted" suppressHydrationWarning>
        {greeting(name)}
      </p>
      <h1 className="mt-4 font-read text-4xl leading-tight font-semibold tracking-tight">Tout est maîtrisé</h1>
      <p className="mt-3 max-w-[52ch] font-read text-lg text-muted">
        Chaque module rédigé est validé. Les révisions gardent tout ça frais, et les prochains modules apparaîtront ici.
      </p>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-9" aria-hidden="true">
      <div className="h-3 w-32 animate-pulse rounded bg-cell-empty" />
      <div className="mt-6 h-3 w-56 animate-pulse rounded bg-cell-empty" />
      <div className="mt-4 h-10 w-3/4 animate-pulse rounded-lg bg-cell-empty" />
      <div className="mt-8 h-12 w-40 animate-pulse rounded-xl bg-cell-empty" />
    </div>
  )
}
