import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Ce que le lecteur utilise d'une timeline GSAP (évite d'importer gsap dans le bundle). */
type Timeline = { seek: (t: number, suppressEvents?: boolean) => unknown; duration: () => number }
type SceneWindow = Window & { __timelines?: Record<string, Timeline> }

function size(html: string): { width: number; height: number } {
  const w = /data-width="(\d+)"/.exec(html)?.[1]
  const h = /data-height="(\d+)"/.exec(html)?.[1]
  return { width: Number(w ?? 1920), height: Number(h ?? 1080) }
}

function fmt(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
}

/**
 * Lit une composition HyperFrames dans une iframe : la timeline reste en pause,
 * c'est le lecteur qui avance le temps (lecture, pause, scrub), comme le moteur de rendu.
 */
export function HyperframesPlayer({ html, title }: { html: string; title: string }) {
  const { width, height } = size(html)
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const tl = useRef<Timeline | null>(null)
  const time = useRef(0)
  const started = useRef(false)
  const [scale, setScale] = useState(0)
  const [duration, setDuration] = useState(0)
  const [now, setNow] = useState(0)
  const [playing, setPlaying] = useState(false)

  const seek = useCallback((t: number) => {
    time.current = t
    tl.current?.seek(t, false)
    setNow(t)
  }, [])

  // L'iframe garde sa taille native (1920×1080) et est mise à l'échelle du conteneur.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  // Le thème de la leçon (classe .light sur <html>) est recopié dans la scène.
  const syncTheme = useCallback(() => {
    const doc = frame.current?.contentDocument
    doc?.documentElement.classList.toggle('light', document.documentElement.classList.contains('light'))
  }, [])
  useEffect(() => {
    const mo = new MutationObserver(syncTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [syncTheme])

  // La timeline peut s'enregistrer après document.fonts.ready : on l'attend.
  const onLoad = useCallback(() => {
    syncTheme()
    const win = frame.current?.contentWindow as SceneWindow | null
    let tries = 0
    const wait = () => {
      const found = win?.__timelines && Object.values(win.__timelines)[0]
      if (found) {
        tl.current = found
        setDuration(found.duration())
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        seek(reduce ? found.duration() : 0)
      } else if (tries++ < 120) requestAnimationFrame(wait)
    }
    wait()
  }, [seek, syncTheme])

  // Lecture automatique une seule fois, quand la scène devient visible.
  useEffect(() => {
    const el = box.current
    if (!el || !duration || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true
          setPlaying(true)
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [duration])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (ts: number) => {
      const t = Math.min(duration, time.current + (ts - last) / 1000)
      last = ts
      seek(t)
      if (t >= duration) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration, seek])

  const toggle = () => {
    started.current = true
    if (!playing && time.current >= duration) seek(0)
    setPlaying(!playing)
  }
  const ended = duration > 0 && now >= duration

  return (
    <div>
      <div
        ref={box}
        className="relative w-full overflow-hidden rounded-xl border border-line bg-ink"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <iframe
          ref={frame}
          title={title}
          srcDoc={html}
          onLoad={onLoad}
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ width, height, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
          tabIndex={-1}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!duration}
          aria-label={playing ? 'Pause' : ended ? 'Rejouer' : 'Lecture'}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-40"
        >
          {playing ? <Pause className="size-4" /> : ended ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={now}
          disabled={!duration}
          onChange={(e) => {
            started.current = true
            setPlaying(false)
            seek(Number(e.target.value))
          }}
          aria-label="Position dans l'animation"
          className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <span className="w-20 shrink-0 text-right font-code text-xs text-muted tabular-nums">
          {fmt(now)} / {fmt(duration)}
        </span>
      </div>
    </div>
  )
}
