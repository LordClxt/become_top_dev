import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Timeline = { seek: (t: number, suppressEvents?: boolean) => unknown; duration: () => number }
type SceneWindow = Window & { __timelines?: Record<string, Timeline> }

const attr = (html: string, re: RegExp, fallback: number) => Number(re.exec(html)?.[1] ?? fallback)

/**
 * Illustration HyperFrames décorative, sans contrôles : elle boucle tant qu'elle est visible
 * et s'arrête hors de la vue. Mouvement réduit : la scène reste figée sur son image clé
 * (`<meta name="poster-time">`). Le fond de la scène est transparent, posé sur son conteneur.
 */
export function SceneLoop({ html, label, className }: { html: string; label: string; className?: string }) {
  const width = attr(html, /data-width="(\d+)"/, 1920)
  const height = attr(html, /data-height="(\d+)"/, 1080)
  const poster = attr(html, /<meta\s+name="poster-time"\s+content="([\d.]+)"/, 0)
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const tl = useRef<Timeline | null>(null)
  const [scale, setScale] = useState(0)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / width))
    ro.observe(el)
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { threshold: 0.15 })
    io.observe(el)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [width])

  // Rendue côté serveur, l'iframe peut finir de charger avant l'hydratation (onLoad manqué) :
  // on cherche donc la timeline dès le montage, et de nouveau à chaque chargement.
  const findTimeline = useCallback(() => {
    let tries = 0
    let raf = 0
    const wait = () => {
      const win = frame.current?.contentWindow as SceneWindow | null | undefined
      const found = win?.__timelines && Object.values(win.__timelines)[0]
      if (found) {
        tl.current = found
        found.seek(poster, false)
        setReady(true)
      } else if (tries++ < 600) raf = requestAnimationFrame(wait)
    }
    wait()
    return () => cancelAnimationFrame(raf)
  }, [poster])
  useEffect(findTimeline, [findTimeline])

  useEffect(() => {
    const timeline = tl.current
    if (!ready || !visible || !timeline || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const duration = timeline.duration()
    let t = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      // Un onglet en arrière-plan peut geler la page : on plafonne le saut à 100 ms.
      t = (t + Math.min(0.1, (now - last) / 1000)) % duration
      last = now
      timeline.seek(t, false)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, visible])

  return (
    <div
      ref={box}
      role="img"
      aria-label={label}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <iframe
        ref={frame}
        title={label}
        srcDoc={html}
        onLoad={() => {
          findTimeline()
        }}
        sandbox="allow-scripts allow-same-origin"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-transparent"
        // color-scheme « normal » des deux côtés : sinon le navigateur peint un fond opaque derrière la scène.
        style={{
          width,
          height,
          colorScheme: 'normal',
          transform: `scale(${scale})`,
          opacity: ready && scale ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}
      />
    </div>
  )
}
