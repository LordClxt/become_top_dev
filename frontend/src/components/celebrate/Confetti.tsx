import { useEffect, useRef } from 'react'

/**
 * Éclat de confettis sur canvas, sans dépendance : des petites cases (le motif slice) qui tournent,
 * retombent sous la gravité puis s'effacent. Le canvas se retire de lui-même à la fin.
 * Couleurs lues dans les variables CSS (thème clair compris).
 */
export function Confetti({
  count = 120,
  colors = ['--accent', '--text', '--pass'],
  bursts = 1,
  origin = { x: 0.5, y: 0.42 },
  onDone,
}: {
  count?: number
  /** Noms de variables CSS. */
  colors?: string[]
  /** Nombre de salves successives (TP : 2, boss : 3). */
  bursts?: number
  origin?: { x: number; y: number }
  onDone?: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const css = getComputedStyle(document.documentElement)
    const palette = colors.map((c) => css.getPropertyValue(c).trim() || '#c6f432')

    type P = { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; c: string; born: number; life: number; flat: number }
    const parts: P[] = []
    const spawn = (at: number, i: number, n: number) => {
      const ox = origin.x * w + (bursts > 1 ? (i % 2 ? 1 : -1) * w * 0.18 * (at > 0 ? 1 : 0) : 0)
      for (let k = 0; k < n; k++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15
        const speed = 7 + Math.random() * 9
        parts.push({
          x: ox,
          y: origin.y * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          s: 5 + Math.random() * 5,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          c: palette[k % palette.length] ?? "#c6f432",
          born: at,
          life: 1500 + Math.random() * 900,
          flat: Math.random() * Math.PI * 2,
        })
      }
    }
    const per = Math.round(count / bursts)
    for (let b = 0; b < bursts; b++) spawn(b * 260, b, per)

    let raf = 0
    const start = performance.now()
    let last = start
    const tick = (now: number) => {
      const t = now - start
      const dt = Math.min(2, (now - last) / 16.67)
      last = now
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of parts) {
        if (t < p.born) {
          alive++
          continue
        }
        const age = t - p.born
        if (age > p.life) continue
        alive++
        p.vy += 0.32 * dt // gravité
        p.vx *= 0.985 ** dt // traînée de l'air
        p.vy *= 0.985 ** dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.r += p.vr * dt
        p.flat += 0.12 * dt
        const fade = Math.min(1, (p.life - age) / 400)
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        // Le cosinus écrase la case : effet de papier qui tourne sur lui-même.
        ctx.scale(1, Math.abs(Math.cos(p.flat)) * 0.8 + 0.2)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s)
        ctx.restore()
      }
      if (alive > 0) raf = requestAnimationFrame(tick)
      else {
        ctx.clearRect(0, 0, w, h)
        done.current?.()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[70] size-full" aria-hidden="true" />
}
