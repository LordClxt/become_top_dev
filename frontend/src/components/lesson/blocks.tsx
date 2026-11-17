import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Cog,
  Eye,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  Server,
  Sparkles,
  Telescope,
  TriangleAlert,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, use, useId, useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { Md } from '@/components/LessonBody'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { LessonContext } from './context'
import type { Block, Pane } from './directives'

/* --- Encadrés -------------------------------------------------------------- */

const CALLOUTS: Record<string, { icon: LucideIcon; label: string }> = {
  java: { icon: Sparkles, label: 'Java moderne' },
  extra: { icon: Telescope, label: 'Au-delà du livre' },
  warning: { icon: TriangleAlert, label: 'Attention' },
  tip: { icon: Lightbulb, label: 'Astuce' },
  internals: { icon: Cog, label: 'Sous le capot' },
  prod: { icon: Server, label: 'En production' },
  source: { icon: BookOpen, label: 'Source' },
}

export function Callout({ kind, children }: { kind: string; children: ReactNode }) {
  const c = CALLOUTS[kind] ?? CALLOUTS.tip!
  const Icon = c.icon
  if (kind === 'source') {
    return (
      <aside className="lesson-source" aria-label="Source">
        <Icon className="mt-1 size-3.5 shrink-0" aria-hidden="true" />
        <div>{children}</div>
      </aside>
    )
  }
  return (
    <aside className={cn('callout', `callout--${kind}`)} aria-label={c.label}>
      <span className="callout-icon" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">{children}</div>
    </aside>
  )
}

/* --- Glossaire ------------------------------------------------------------- */

export function GlossaryTerm({ term, children }: { term: string; children: ReactNode }) {
  const { glossary } = use(LessonContext)
  const def = glossary.find((g) => g.term === term)?.definition
  if (!def) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <dfn className="gloss-term" tabIndex={0}>
          {children}
        </dfn>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="gloss-tip">
        <span className="block font-code text-[0.72rem] text-accent">{term}</span>
        <span className="mt-1 block">{def}</span>
      </TooltipContent>
    </Tooltip>
  )
}

/* --- Comparaison ----------------------------------------------------------- */

const PANE: Record<Pane['tone'], { icon: LucideIcon; tag: string }> = {
  bad: { icon: X, tag: 'À éviter' },
  good: { icon: Check, tag: 'À préférer' },
  neutral: { icon: Eye, tag: 'Variante' },
}

export function CompareBlock({ panes }: { panes: Pane[] }) {
  return (
    <div className={cn('compare', panes.length === 3 && 'compare--3')} role="group" aria-label="Comparaison">
      {panes.map((p, i) => {
        const Icon = PANE[p.tone].icon
        return (
          <section key={i} className={cn('compare-pane', `compare-pane--${p.tone}`)}>
            <header className="compare-head">
              <span className="compare-badge" aria-hidden="true">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="compare-tag">{PANE[p.tone].tag}</span>
                <span className="compare-label">{p.label}</span>
              </span>
            </header>
            <div className="compare-body">
              <Md>{p.md}</Md>
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* --- Révélation ------------------------------------------------------------ */

export function RevealBlock({ title, md }: { title: string; md: string }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const id = useId()
  return (
    <div className={cn('reveal', open && 'is-open')}>
      <button
        type="button"
        className="reveal-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="reveal-icon" aria-hidden="true">
          <Lightbulb className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="reveal-kicker">{open ? 'Réponse' : 'Réfléchis avant de lire'}</span>
          <span className="reveal-title">{title}</span>
        </span>
        <span className="reveal-cta">{open ? 'Masquer' : 'Révéler'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="reveal-body">
              <Md>{md}</Md>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* --- Pas à pas ------------------------------------------------------------- */

export function StepsBlock({ block }: { block: Extract<Block, { kind: 'steps' }> }) {
  const { language } = use(LessonContext)
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  const n = block.steps.length
  const step = block.steps[i]
  if (!step) return <CodeBlock code={block.code} language={block.lang ?? language} title={block.title} />
  const go = (d: number) => setI((v) => Math.min(n - 1, Math.max(0, v + d)))
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: groupe focalisable pour les flèches du clavier
    <div
      className="steps"
      role="group"
      aria-roledescription="Pas à pas"
      aria-label={`Lecture guidée du code, étape ${i + 1} sur ${n}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          go(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          go(-1)
        }
      }}
    >
      <div className="steps-bar">
        <ListChecks className="size-4 text-accent" aria-hidden="true" />
        <span className="font-medium">Lecture guidée</span>
        <span className="hidden text-muted sm:inline">flèches du clavier pour avancer</span>
        <ol className="steps-cells" aria-label="Étapes">
          {block.steps.map((_, j) => (
            <li key={j}>
              <button
                type="button"
                aria-label={`Étape ${j + 1}`}
                aria-current={j === i ? 'step' : undefined}
                className={cn('steps-cell', j < i && 'is-past', j === i && 'is-current')}
                onClick={() => setI(j)}
              />
            </li>
          ))}
        </ol>
      </div>
      <CodeBlock
        code={block.code}
        language={block.lang ?? language}
        title={block.title}
        highlight={step.lines}
        dim
        follow
        className="steps-code"
      />
      <div className="steps-panel">
        <span className="steps-num font-code" aria-hidden="true">
          {String(i + 1).padStart(2, '0')}
          <span className="text-muted">/{String(n).padStart(2, '0')}</span>
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="steps-text"
            >
              <Md components={{ p: ({ children }) => <p>{children}</p> }}>{step.text}</Md>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 gap-1.5 self-end">
          <button type="button" className="steps-nav" onClick={() => go(-1)} disabled={i === 0} aria-label="Étape précédente">
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            className="steps-nav is-primary"
            onClick={() => go(1)}
            disabled={i === n - 1}
            aria-label="Étape suivante"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* --- Sections spéciales : pièges et récapitulatif -------------------------- */

export function LessonSection({
  variant,
  title,
  id,
  md,
}: {
  variant: 'pitfalls' | 'recap'
  title: string
  id: string
  md: string
}) {
  const reduce = useReducedMotion()
  if (variant === 'pitfalls') {
    return (
      <section className="pitfalls" aria-labelledby={id}>
        <h2 id={id} className="scroll-mt-24">
          <TriangleAlert className="size-5 text-fail" aria-hidden="true" />
          {title}
        </h2>
        <Md
          components={{
            li: ({ children }) => (
              <li className="pitfall">
                <span className="pitfall-icon" aria-hidden="true">
                  <X className="size-3.5" />
                </span>
                <div className="min-w-0">{children}</div>
              </li>
            ),
          }}
        >
          {md}
        </Md>
      </section>
    )
  }
  return (
    <section className="recap" aria-labelledby={id}>
      <div className="bg-grid pointer-events-none absolute -top-24 -right-24 -z-10 size-72" aria-hidden="true" />
      <div className="glow-accent pointer-events-none absolute -top-16 -right-8 -z-10 size-48 rounded-full" aria-hidden="true" />
      <p className="recap-kicker">Ce que tu emportes</p>
      <h2 id={id} className="scroll-mt-24">
        {title}
      </h2>
      <Md
        components={{
          li: ({ children }) => (
            <motion.li
              className="recap-item"
              initial={reduce ? false : 'off'}
              whileInView="on"
              viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            >
              <motion.span
                className="recap-check"
                aria-hidden="true"
                variants={{ off: { scale: 0.6, opacity: 0.3 }, on: { scale: 1, opacity: 1 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.1 }}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
              <div className="min-w-0">{children}</div>
            </motion.li>
          ),
        }}
      >
        {md}
      </Md>
    </section>
  )
}
