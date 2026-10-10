import { Link } from '@tanstack/react-router'
import { Check, Flag, Lock, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { iconFor } from '@/lib/course-icons'
import type { Course } from '@/lib/api'
import { layoutCourse, PATH_WIDTH, type PathNode } from '@/lib/path-layout'
import { cn } from '@/lib/utils'


const TILE = 56

export function CoursePath({ course }: { course: Course }) {
  const layout = useMemo(() => layoutCourse(course), [course])
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative mx-auto" style={{ width: PATH_WIDTH, height: layout.height }}>
      <svg
        className="absolute inset-0"
        width={PATH_WIDTH}
        height={layout.height}
        viewBox={`0 0 ${PATH_WIDTH} ${layout.height}`}
        aria-hidden="true"
      >
        {layout.camps.map((camp) => (
          <line
            key={camp.title}
            x1={0}
            x2={PATH_WIDTH}
            y1={camp.y + 34}
            y2={camp.y + 34}
            className="stroke-line"
            strokeDasharray="2 6"
          />
        ))}
        <path d={layout.trailD} fill="none" className="stroke-line" strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" />
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
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        )}
      </svg>

      {layout.camps.map((camp) => (
        <div
          key={camp.title}
          className="absolute left-0 flex items-baseline gap-3"
          style={{ top: camp.y }}
        >
          <span className="font-read text-lg font-semibold italic">{camp.title}</span>
          <span className="text-sm text-muted">
            {camp.count} module{camp.count > 1 ? 's' : ''}
          </span>
        </div>
      ))}

      <ol>
        {layout.main.map((node, i) => (
          <PathStep
            key={node.chapter.slug}
            node={node}
            icon={iconFor(course.id, node.number)}
            current={i === layout.currentIndex}
          />
        ))}
      </ol>

      <div
        className="absolute flex flex-col items-center"
        style={{ left: layout.summit.x - 100, top: layout.summit.y - 22, width: 200 }}
      >
        <span className="grid size-11 place-items-center rounded-full border-2 border-accent bg-ink text-accent">
          <Flag className="size-5" />
        </span>
        <span className="mt-2 text-center text-sm text-muted">Sommet : {course.title}</span>
      </div>

      {layout.optional.length > 0 && (
        <ol>
          {layout.optional.map((node) => (
            <PathStep key={node.chapter.slug} node={node} icon={iconFor(course.id, node.number)} current={false} />
          ))}
        </ol>
      )}
    </div>
  )
}

function PathStep({ node, icon: Icon, current }: { node: PathNode; icon: LucideIcon; current: boolean }) {
  const { chapter, side } = node
  const mastered = chapter.available && chapter.mastery.mastered
  const locked = chapter.available && !chapter.mastery.unlocked
  const open = chapter.available && chapter.mastery.unlocked

  const position = {
    top: node.y - TILE / 2,
    ...(side === 'right' ? { left: node.x - TILE / 2 } : { right: PATH_WIDTH - node.x - TILE / 2 }),
  }

  const tile = (
    <span className="relative shrink-0" style={{ width: TILE, height: TILE }}>
      {current && <span className="node-pulse absolute inset-0 rounded-2xl bg-accent" aria-hidden="true" />}
      <span
        className={cn(
          'relative grid size-full place-items-center rounded-2xl border-2 transition-transform duration-200',
          mastered && 'border-accent bg-accent text-accent-ink',
          open && !mastered && 'border-accent bg-surface text-accent group-hover:-translate-y-0.5',
          locked && 'border-line bg-surface text-muted',
          !chapter.available && 'border-dashed border-line bg-ink text-muted/60',
        )}
      >
        <Icon className="size-6" strokeWidth={1.75} />
        {open && !mastered && chapter.mastery.score > 0 && (
          <svg className="absolute -inset-[5px]" viewBox="0 0 66 66" aria-hidden="true">
            <rect
              x={1.5}
              y={1.5}
              width={63}
              height={63}
              rx={19}
              fill="none"
              className="stroke-accent"
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={`${chapter.mastery.score} 1`}
            />
          </svg>
        )}
      </span>
      <span
        className={cn(
          'absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full px-1 font-code text-[11px] tabular-nums',
          mastered || open ? 'bg-accent text-accent-ink' : 'border border-line bg-ink text-muted',
        )}
      >
        {mastered ? <Check className="size-3" strokeWidth={3} /> : locked ? <Lock className="size-3" /> : node.number}
      </span>
    </span>
  )

  const label = (
    <span className={cn('w-[250px] pt-1', side === 'left' && 'text-right')}>
      <span
        className={cn(
          'block font-read text-xl leading-tight font-semibold',
          open ? 'group-hover:text-accent' : 'text-muted',
          !chapter.available && 'font-normal',
        )}
      >
        {chapter.title}
      </span>
      {chapter.available ? (
        locked ? (
          <span className="mt-1 block text-sm text-muted">Maîtrise le module précédent pour l'ouvrir</span>
        ) : (
          <>
            <span className="mt-1 block text-sm leading-snug text-muted">{chapter.subtitle}</span>
            <SliceMeter
              len={chapter.mastery.lessons_done}
              cap={chapter.mastery.lessons_total}
              size="sm"
              label={`${chapter.mastery.lessons_done} leçons terminées sur ${chapter.mastery.lessons_total}`}
              className={cn('mt-2', side === 'left' && 'flex-row-reverse')}
            />
          </>
        )
      ) : (
        <span className="mt-1 block text-sm text-muted/80">Bientôt généré</span>
      )}
    </span>
  )

  const row = cn('absolute flex items-start gap-4', side === 'left' && 'flex-row-reverse')

  if (!open) {
    return (
      <li className={row} style={position}>
        {tile}
        {label}
      </li>
    )
  }

  return (
    <li className="absolute" style={position}>
      <Link
        to="/chapters/$chapterId"
        params={{ chapterId: chapter.id }}
        className={cn('group flex items-start gap-4 rounded-2xl', side === 'left' && 'flex-row-reverse')}
        aria-current={current ? 'step' : undefined}
      >
        {tile}
        {label}
      </Link>
    </li>
  )
}
