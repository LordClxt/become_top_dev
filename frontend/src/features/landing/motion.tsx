import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export const EASE = [0.22, 1, 0.36, 1] as const

/** Étoile à quatre branches, le motif de ponctuation de la page. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('size-4 shrink-0', className)} aria-hidden="true">
      <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" fill="currentColor" />
    </svg>
  )
}

/** Petit surtitre de section : étoile + libellé. */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn('flex items-center gap-2.5 text-xs font-semibold tracking-[0.18em] uppercase', className)}>
      <Spark className="size-3.5 text-(--lp-spark)" />
      {children}
    </p>
  )
}

/**
 * Titre dont les mots montent un à un derrière un masque quand il entre dans la vue.
 * Le texte complet reste dans l'arbre d'accessibilité (aria-label), les mots découpés en sont retirés.
 */
export function RevealWords({ text, className, as: Tag = 'h2' }: { text: string; className?: string; as?: 'h1' | 'h2' }) {
  const words = text.split(' ')
  const MotionTag = Tag === 'h1' ? motion.h1 : motion.h2
  return (
    <MotionTag
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      transition={{ staggerChildren: 0.06 }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom" aria-hidden="true">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: '110%' }, show: { y: 0 } }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            {w}
            {i < words.length - 1 && ' '}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}

/** Nombre qui compte jusqu'à sa valeur à la première apparition. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const count = useMotionValue(reduce ? value : 0)
  const shown = useTransform(count, (v) => Math.round(v))

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, { duration: reduce ? 0 : 1.6, ease: EASE })
    return () => controls.stop()
  }, [inView, value, reduce, count])

  return (
    <motion.span ref={ref} className={cn('tabular-nums', className)}>
      {shown}
    </motion.span>
  )
}
