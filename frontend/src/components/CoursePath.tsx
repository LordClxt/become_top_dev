import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Crown, Flag, Lock, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { iconFor } from '@/lib/course-icons'
import type { Course } from '@/lib/api'
import { layoutCourse, PATH_WIDTH, type PathNode } from '@/lib/path-layout'
import { cn } from '@/lib/utils'

const TILE = 56
const BIG = 72
const roman = (n: number) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n + 1)

export function CoursePath({ course }: { course: Course }) {
  // La carte se dessine à la largeur disponible, plafonnée à PATH_WIDTH (compacte sur téléphone).
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(PATH_WIDTH)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.min(PATH_WIDTH, Math.floor(entry.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = useMemo(() => layoutCourse(course, width), [course, width])
  const reduceMotion = useReducedMotion()
  const W = layout.width

  // À l'arrivée, amener le module en cours dans la vue ; jamais au retour arrière (le défilement restauré gagne).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (window.scrollY > 10) return
      const el = box.current?.querySelector<HTMLElement>('[data-current]')
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom > window.innerHeight - 80)
        el.scrollIntoView({
          block: 'center',
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
    }, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={box} className="w-full">
      <div className="relative mx-auto" style={{ width: W, height: layout.height }}>
        <svg
          className="absolute inset-0"
          width={W}
          height={layout.height}
          viewBox={`0 0 ${W} ${layout.height}`}
          aria-hidden="true"
        >
          {layout.camps.map((camp) => (
            <line
              key={camp.title}
              x1={0}
              x2={W}
              y1={camp.y + 34}
              y2={camp.y + 34}
              className="stroke-line"
              strokeDasharray="2 6"
            />
          ))}
          <path
            d={layout.trailD}
            fill="none"
            className="stroke-line"
            strokeWidth={3}
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
          {layout.branchD && (
            <path
              d={layout.branchD}
              fill="none"
              className="stroke-line"
              strokeWidth={2}
              strokeDasharray="1 7"
              strokeLinecap="round"
              opacity={0.7}
            />
          )}
          {layout.progressD && (
            <motion.path
              d={layout.progressD}
              fill="none"
              className="stroke-accent"
              strokeWidth={4}
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 1.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2,
              }}
            />
          )}
        </svg>

        {layout.camps.map((camp) => (
          <div
            key={camp.title}
            className={cn('absolute right-0 left-0 flex', layout.compact ? 'flex-col gap-0.5' : 'items-baseline gap-3')}
            style={{ top: layout.compact ? camp.y - 30 : camp.y - 18 }}
          >
            <span className="font-code text-[11px] tracking-[0.2em] text-accent uppercase">
              {camp.optional ? 'Hors piste' : `Acte ${roman(camp.index)}`}
            </span>
            <span className="flex items-baseline gap-3">
              <h2 className="font-read text-lg leading-tight font-semibold italic">{camp.title}</h2>
              <span className="shrink-0 text-sm text-muted">
                {camp.count} module{camp.count > 1 ? 's' : ''}
              </span>
            </span>
          </div>
        ))}

        <ol aria-label="Modules du cours">
          {layout.main.map((node, i) => (
            <PathStep
              order={i}
              reduceMotion={!!reduceMotion}
              key={node.chapter.slug}
              node={node}
              icon={iconFor(course.id, node.number)}
              current={i === layout.currentIndex}
              width={W}
              compact={layout.compact}
            />
          ))}
        </ol>

        <div
          className={cn('absolute flex', layout.compact ? 'items-center gap-3' : 'flex-col items-center')}
          style={
            layout.compact
              ? {
                  left: layout.summit.x - 22,
                  top: layout.summit.y - 22,
                  right: 0,
                }
              : {
                  left: layout.summit.x - 100,
                  top: layout.summit.y - 22,
                  width: 200,
                }
          }
        >
          <span className="grid size-11 place-items-center rounded-full border-2 border-accent bg-ink text-accent">
            <Flag className="size-5" />
          </span>
          <span className={cn('text-sm text-muted', !layout.compact && 'mt-2 text-center')}>
            Sommet : {course.title}
          </span>
        </div>

        {layout.optional.length > 0 && (
          <ol aria-label="Modules facultatifs">
            {layout.optional.map((node, i) => (
              <PathStep
                order={layout.main.length + i}
                reduceMotion={!!reduceMotion}
                key={node.chapter.slug}
                node={node}
                icon={iconFor(course.id, node.number)}
                current={false}
                width={W}
                compact={layout.compact}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function PathStep({
  node,
  icon: Icon,
  current,
  width,
  compact,
  order,
  reduceMotion,
}: {
  node: PathNode
  icon: LucideIcon
  current: boolean
  width: number
  compact: boolean
  order: number
  reduceMotion: boolean
}) {
  const { chapter, side } = node
  const mastered = chapter.available && chapter.mastery.mastered
  const locked = chapter.available && !chapter.mastery.unlocked
  const open = chapter.available && chapter.mastery.unlocked
  const score = chapter.available ? Math.min(1, chapter.mastery.score) : 0
  const size = current ? BIG : TILE
  const [peek, setPeek] = useState(false)

  const position = {
    top: node.y - size / 2,
    ...(side === 'right' ? { left: node.x - size / 2 } : { right: width - node.x - size / 2 }),
  }
  const state = mastered
    ? 'maîtrisé'
    : current
      ? 'en cours, tu es ici'
      : locked
        ? 'verrouillé'
        : !chapter.available
          ? 'bientôt'
          : 'ouvert'

  const tile = (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {current && (
        <>
          <span className="j-halo absolute -inset-2 rounded-[22px] bg-accent" aria-hidden="true" />
          <span
            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-accent-ink"
            aria-hidden="true"
          >
            Tu es ici
          </span>
        </>
      )}
      <span
        className={cn(
          'relative grid size-full place-items-center rounded-2xl border-2 transition-transform duration-(--dur-fast)',
          mastered && 'border-accent bg-accent text-accent-ink',
          open && !mastered && 'border-accent bg-surface text-accent',
          open && 'group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5',
          locked && 'border-line bg-surface text-muted',
          !chapter.available && 'border-dashed border-line bg-ink/60 text-muted/50',
        )}
      >
        <Icon className={current ? 'size-8' : 'size-6'} strokeWidth={1.75} />
        {open && (
          // L'anneau de maîtrise autour du nœud : la piste, puis la part atteinte.
          <svg
            className="pointer-events-none absolute -inset-[7px]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect
              x={2}
              y={2}
              width={96}
              height={96}
              rx={26}
              fill="none"
              className="stroke-cell-empty"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
            {score > 0 && (
              <rect
                x={2}
                y={2}
                width={96}
                height={96}
                rx={26}
                fill="none"
                className={mastered ? 'stroke-pass' : 'stroke-accent'}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray={`${score} 1`}
                strokeLinecap="round"
              />
            )}
          </svg>
        )}
      </span>
      <span
        className={cn(
          'absolute -top-2.5 -right-2.5 grid h-6 min-w-6 place-items-center rounded-full px-1 font-code text-[11px] tabular-nums',
          mastered ? 'bg-pass text-ink' : open ? 'bg-accent text-accent-ink' : 'border border-line bg-ink text-muted',
        )}
        aria-hidden="true"
      >
        {mastered ? (
          <Crown className="size-3.5" strokeWidth={2.5} />
        ) : locked ? (
          <Lock className="size-3" />
        ) : (
          node.number
        )}
      </span>
    </span>
  )

  const labelWidth = compact ? width - (node.x + size / 2) - 16 : 250
  const label = (
    <span className={cn('pt-1', side === 'left' && 'text-right')} style={{ width: labelWidth }}>
      {current && <span className="mb-0.5 block text-xs font-medium text-accent">Module en cours</span>}
      <span
        className={cn(
          'block font-read leading-tight font-semibold',
          current ? (compact ? 'text-xl' : 'text-2xl') : compact ? 'text-lg' : 'text-xl',
          open ? 'group-hover:text-accent' : 'text-muted',
          !chapter.available && 'font-normal text-muted/70',
        )}
      >
        {chapter.title}
      </span>
      <span className="sr-only">, {state}</span>
      {chapter.available ? (
        locked ? (
          <span className="mt-1 block text-sm text-muted">Maîtrise le module précédent pour l'ouvrir</span>
        ) : (
          <>
            <span className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{chapter.subtitle}</span>
            <span className={cn('mt-2 flex items-center gap-2.5', side === 'left' && 'flex-row-reverse')}>
              <SliceMeter
                len={chapter.mastery.lessons_done}
                cap={chapter.mastery.lessons_total}
                size="sm"
                label={`${chapter.mastery.lessons_done} leçons terminées sur ${chapter.mastery.lessons_total}`}
              />
              <span className="font-code text-[11px] text-muted tabular-nums" aria-hidden="true">
                {chapter.mastery.lessons_done}/{chapter.mastery.lessons_total}
              </span>
            </span>
          </>
        )
      ) : (
        <span className="mt-1 block text-xs tracking-wide text-muted/70 uppercase">Bientôt</span>
      )}
    </span>
  )

  const row = cn('flex items-start gap-4', side === 'left' && 'flex-row-reverse')
  const anim = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.42,
          ease: [0.22, 1, 0.36, 1] as const,
          delay: 0.08 + Math.min(order, 14) * 0.05,
        },
      }

  if (!open) {
    return (
      <motion.li className={cn('absolute', row, !chapter.available && 'opacity-80')} style={position} {...anim}>
        {tile}
        {label}
      </motion.li>
    )
  }

  const m = chapter.mastery
  const cta = mastered ? 'Revoir' : m.lessons_done > 0 || m.labs_passed > 0 ? 'Reprendre' : 'Commencer'

  return (
    <motion.li
      className={cn('absolute', peek ? 'z-30' : current ? 'z-20' : 'z-10')}
      style={position}
      data-current={current || undefined}
      onPointerEnter={(e) => e.pointerType !== 'touch' && setPeek(true)}
      onPointerLeave={() => setPeek(false)}
      onFocus={() => setPeek(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setPeek(false)}
      onKeyDown={(e) => e.key === 'Escape' && setPeek(false)}
      {...anim}
    >
      <Link
        to="/chapters/$chapterId"
        params={{ chapterId: chapter.id }}
        className={cn('group rounded-2xl outline-offset-4', row)}
        aria-current={current ? 'step' : undefined}
      >
        {tile}
        {label}
      </Link>
      {peek && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          aria-hidden="true"
          // Le rembourrage transparent relie la tuile à la carte : le pointeur ne la quitte pas en chemin.
          className={cn('absolute w-72', side === 'left' ? 'right-0' : 'left-0')}
          style={{ top: size, paddingTop: 14 + (compact ? 40 : 56) }}
        >
          <div className="j-preview rounded-2xl border border-line bg-surface-2 p-4">
            <p className="font-read text-base leading-snug font-semibold">{chapter.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{chapter.subtitle}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['Leçons', `${m.lessons_done}/${m.lessons_total}`],
                ['TP', `${m.labs_passed}/${m.labs_total}`],
                ['Maîtrise', `${Math.round(m.score * 100)} %`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-ink/60 px-2 py-1.5">
                  <dt className="text-[11px] text-muted">{k}</dt>
                  <dd className={cn('font-code text-sm tabular-nums', k === 'Maîtrise' && mastered && 'text-pass')}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              to="/chapters/$chapterId"
              params={{ chapterId: chapter.id }}
              className={cn(
                'mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium',
                mastered ? 'border border-line hover:border-accent hover:text-accent' : 'bg-accent text-accent-ink',
              )}
              tabIndex={-1}
            >
              {cta}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </motion.li>
  )
}
