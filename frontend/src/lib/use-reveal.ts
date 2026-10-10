import { useEffect, useRef, useState } from 'react'

/**
 * Pose `data-shown` sur un élément quand il entre dans la vue (une seule fois).
 * Avant l'hydratation, l'attribut est absent : l'état final s'affiche (SSR, sans JS).
 * Les animations elles-mêmes sont en CSS (voir « Reveals » dans app.css).
 */
export function useReveal<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          observer.disconnect()
        } else {
          setShown(false)
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, 'data-shown': shown === undefined ? undefined : String(shown) }
}
