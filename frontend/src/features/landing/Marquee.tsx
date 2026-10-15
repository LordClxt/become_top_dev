import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { Spark } from './motion'

/**
 * Deux bandeaux qui se croisent sous le hero, comme deux rubans d'affiche.
 * Chaque piste boucle en CSS (liste doublée, translateX -50 %) ; le défilement de la page
 * ajoute un décalage en sens opposé pour chacun. Mouvement réduit : bandeaux immobiles.
 */
export function CrossBands({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const forward = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-120, 120])
  const backward = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [120, -120])

  return (
    <div ref={ref} className="relative z-20 -mt-14 overflow-x-clip py-12" aria-label={items.join(', ')}>
      <motion.div style={{ x: backward }} className="-mx-24 rotate-[2.2deg]">
        <Band items={items} tone="ink" reverse />
      </motion.div>
      <motion.div style={{ x: forward }} className="-mx-24 -mt-[4.6rem] -rotate-[2.6deg] sm:-mt-20">
        <Band items={items} tone="lime" />
      </motion.div>
    </div>
  )
}

function Band({ items, tone, reverse }: { items: string[]; tone: 'lime' | 'ink'; reverse?: boolean }) {
  const loop = [...items, ...items, ...items]
  return (
    <div
      className={cn(
        'marquee overflow-hidden py-3.5 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.6)]',
        tone === 'lime' ? 'bg-(--brand-lime) text-(--brand-on-lime)' : 'bg-[#0c0d12] text-white',
      )}
      aria-hidden="true"
    >
      <div className={cn('marquee-track flex w-max items-center', reverse && 'marquee-reverse')}>
        {[0, 1].map((half) => (
          <ul key={half} className="flex shrink-0 items-center">
            {loop.map((item, i) => (
              <li key={`${half}-${i}`} className="flex items-center">
                <span className="px-7 font-display text-[clamp(1.7rem,3.4vw,2.8rem)] leading-none font-extrabold uppercase">
                  {item}
                </span>
                <Spark className={cn('size-6', tone === 'ink' && 'text-(--brand-lime)')} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
