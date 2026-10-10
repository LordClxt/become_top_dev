import { useState } from 'react'

export const id = 'go-ch05-gogc'

const LIVE_MB = 100 // tas vivant, constant dans la simulation
const ALLOCATED_MB = 2000 // total alloué par le programme pendant la simulation
const WIDTH = 520
const HEIGHT = 200

type Sim = { points: [number, number][]; cycles: number; peak: number; thrashing: boolean; noGc: boolean }

/** Dent de scie du tas : il monte jusqu'au déclenchement, le GC le ramène au tas vivant. */
function simulate(gogc: number | 'off', limitMb: number | null): Sim {
  const growthTarget = gogc === 'off' ? Infinity : LIVE_MB + (LIVE_MB * gogc) / 100
  const target = Math.min(growthTarget, limitMb ?? Infinity)
  if (!Number.isFinite(target)) {
    return { points: [[0, LIVE_MB], [ALLOCATED_MB, LIVE_MB + ALLOCATED_MB]], cycles: 0, peak: LIVE_MB + ALLOCATED_MB, thrashing: false, noGc: true }
  }
  const step = target - LIVE_MB
  if (step <= 1) {
    // la limite est en dessous du tas vivant : le GC tournerait sans cesse
    return { points: [[0, LIVE_MB], [ALLOCATED_MB, LIVE_MB]], cycles: Infinity, peak: LIVE_MB, thrashing: true, noGc: false }
  }
  const cycles = Math.floor(ALLOCATED_MB / step)
  const points: [number, number][] = [[0, LIVE_MB]]
  for (let k = 1; k <= Math.min(cycles, 200); k++) {
    points.push([k * step, target], [k * step, LIVE_MB])
  }
  const lastX = Math.min(cycles, 200) * step
  if (lastX < ALLOCATED_MB) points.push([ALLOCATED_MB, LIVE_MB + (ALLOCATED_MB - lastX)])
  return { points, cycles, peak: target, thrashing: false, noGc: false }
}

const reference = simulate(100, null).cycles

export default function Gogc() {
  const [gogc, setGogc] = useState(100)
  const [off, setOff] = useState(false)
  const [useLimit, setUseLimit] = useState(false)
  const [limit, setLimit] = useState(300)

  const sim = simulate(off ? 'off' : gogc, useLimit ? limit : null)
  const yMax = Math.max(sim.peak, LIVE_MB * 1.2, 250)
  const scaleX = (mb: number) => (mb / ALLOCATED_MB) * WIDTH
  const scaleY = (mb: number) => HEIGHT - (Math.min(mb, yMax) / yMax) * HEIGHT
  const path = sim.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${scaleX(x).toFixed(1)},${scaleY(y).toFixed(1)}`).join(' ')

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="grid gap-1.5 text-xs text-muted">
            GOGC = {off ? 'off' : gogc}
            <input type="range" min={10} max={400} step={10} value={gogc} disabled={off} onChange={(e) => setGogc(Number(e.target.value))} aria-label="GOGC" />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={off} onChange={(e) => setOff(e.target.checked)} /> GOGC=off
          </label>
        </div>
        <div className="grid gap-2">
          <label className="grid gap-1.5 text-xs text-muted">
            GOMEMLIMIT = {useLimit ? `${limit} Mo` : 'aucune'}
            <input type="range" min={50} max={800} step={10} value={limit} disabled={!useLimit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="GOMEMLIMIT en mégaoctets" />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={useLimit} onChange={(e) => setUseLimit(e.target.checked)} /> Fixer une limite
          </label>
        </div>
      </div>

      <svg viewBox={`-30 -10 ${WIDTH + 40} ${HEIGHT + 30}`} className="w-full rounded-md border border-line bg-ink/40" role="img" aria-label="Taille du tas au fil des allocations">
        <line x1={0} x2={WIDTH} y1={scaleY(LIVE_MB)} y2={scaleY(LIVE_MB)} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
        <text x={-28} y={scaleY(LIVE_MB) + 4} fontSize={9} fill="currentColor" opacity={0.6}>
          vivant
        </text>
        {useLimit && (
          <>
            <line x1={0} x2={WIDTH} y1={scaleY(limit)} y2={scaleY(limit)} stroke="var(--fail)" strokeDasharray="6 3" />
            <text x={WIDTH - 90} y={scaleY(limit) - 4} fontSize={9} fill="var(--fail)">
              GOMEMLIMIT
            </text>
          </>
        )}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
        <text x={0} y={HEIGHT + 16} fontSize={9} fill="currentColor" opacity={0.6}>
          mémoire allouée par le programme →
        </text>
      </svg>

      <dl className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-md border border-line px-3 py-2">
          <dt className="text-xs text-muted">cycles de GC</dt>
          <dd className="font-code">{sim.cycles === Infinity ? '∞' : sim.cycles}</dd>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <dt className="text-xs text-muted">pic du tas</dt>
          <dd className="font-code">{sim.noGc ? `${Math.round(sim.peak)} Mo` : `${Math.round(sim.peak)} Mo`}</dd>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <dt className="text-xs text-muted">travail de GC (vs défaut)</dt>
          <dd className="font-code">{sim.cycles === Infinity ? '∞' : `×${(sim.cycles / reference).toFixed(1)}`}</dd>
        </div>
      </dl>

      <p className="text-sm" role="status">
        {sim.thrashing
          ? 'Thrashing : la limite est en dessous du tas vivant. Le GC se relance sans cesse sans pouvoir libérer assez ; le runtime finira par dépasser la limite.'
          : sim.noGc
            ? 'Sans GC ni limite, le tas ne redescend jamais : toute la mémoire allouée reste occupée.'
            : `Le tas monte de ${LIVE_MB} Mo (vivant) jusqu’à ${Math.round(sim.peak)} Mo, puis le GC le ramène à ${LIVE_MB} Mo. Plus le pic est haut, moins il y a de cycles.`}
      </p>
    </div>
  )
}
