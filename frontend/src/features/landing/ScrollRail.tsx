import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Rail de lecture de la page d'accueil : une slice verticale, une case par section.
 * len = sections atteintes (leur haut a passé le milieu de l'écran). Chaque case mène à sa section.
 */
export function ScrollRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [len, setLen] = useState(1)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const middle = window.innerHeight / 2
      const reached = sections.filter((s) => {
        const el = document.getElementById(s.id)
        return el !== null && el.getBoundingClientRect().top <= middle
      }).length
      setLen(Math.max(1, reached))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sections])

  return (
    <nav
      className="fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 2xl:flex"
      aria-label="Sections de la page"
    >
      <ol className="flex flex-col gap-[3px]">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                'peer block size-3 rounded-[2px] transition-colors duration-(--dur-base)',
                i < len ? 'bg-accent' : 'bg-cell-empty hover:bg-line',
              )}
              aria-label={s.label}
              aria-current={i === len - 1 ? 'location' : undefined}
            />
          </li>
        ))}
      </ol>
    </nav>
  )
}
