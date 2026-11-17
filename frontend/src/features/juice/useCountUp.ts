import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/features/juice/motion'

/** Fait défiler un nombre de son ancienne valeur vers la nouvelle (ease-out). Pas d'animation au premier rendu. */
export function useCountUp(value: number, duration = 900): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value || prefersReducedMotion() || value < start) {
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      const eased = 1 - (1 - k) ** 3
      setShown(Math.round(start + (value - start) * eased))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}
