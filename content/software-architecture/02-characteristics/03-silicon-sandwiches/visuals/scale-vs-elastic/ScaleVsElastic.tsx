import { useState } from 'react'

export const id = 'arch-ch02-scale-vs-elastic'

// Une journée de Silicon Sandwiches, par quart d'heure : 200 commandes/min, pics à 1 000 à midi et le soir.
const LOAD = Array.from({ length: 96 }, (_, q) => {
  const h = q / 4
  return (h >= 11.75 && h < 13.75) || (h >= 19 && h < 20) ? 1000 : h >= 7 && h < 22 ? 200 : 60
})

function simulate(base: number, max: number, delay: number) {
  let instances = base
  const decisions = new Map<number, number>()
  let rejected = 0, cost = 0, queue = 0
  const caps: number[] = []
  LOAD.forEach((arrivals, t) => {
    const d = decisions.get(t)
    if (d !== undefined) instances = d
    const cap = instances * 100
    caps.push(cap)
    queue = Math.max(0, queue + arrivals - cap)
    if (queue > 200) { rejected += (queue - 200) * 15; queue = 200 }
    cost += instances * 0.25
    const wanted = Math.min(max, Math.max(base, Math.ceil((arrivals + queue) / 80)))
    decisions.set(t + delay, wanted)
  })
  return { caps, rejected, cost }
}

export default function ScaleVsElastic() {
  const [base, setBase] = useState(10)
  const [max, setMax] = useState(10)
  const [delay, setDelay] = useState(1)
  const top = Math.max(max, base)
  const { caps, rejected, cost } = simulate(base, top, delay)
  const W = 480, H = 160, x = (i: number) => (i / 95) * W, y = (v: number) => H - (v / 1600) * H
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {([['Instances de base', base, 1, 15, setBase], ['Maximum (autoscaling)', top, 1, 15, setMax], ['Délai de démarrage (¼ h)', delay, 0, 4, setDelay]] as const).map(([label, v, mn, mx, set]) => (
          <label key={label} className="grid gap-1 text-sm">
            <span className="text-muted">{label} : <span className="font-code text-text">{v}</span></span>
            <input type="range" min={mn} max={mx} value={v} onChange={(e) => set(Number(e.target.value))} />
          </label>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full text-muted" role="img" aria-label="Charge et capacité sur une journée">
        <path d={path(LOAD)} fill="none" className="stroke-accent" strokeWidth={2} />
        <path d={path(caps)} fill="none" className={rejected > 0 ? 'stroke-fail' : 'stroke-pass'} strokeWidth={2} strokeDasharray="5 4" />
        <text x={2} y={H + 14} fontSize={10} fill="currentColor">0 h</text>
        <text x={W / 2 - 8} y={H + 14} fontSize={10} fill="currentColor">12 h</text>
        <text x={W - 24} y={H + 14} fontSize={10} fill="currentColor">24 h</text>
      </svg>
      <p className="text-xs text-muted">Trait plein : commandes par minute. Pointillés : capacité.</p>
      <div className="flex flex-wrap gap-4 font-code text-sm">
        <span className={rejected > 0 ? 'text-fail' : 'text-pass'}>commandes perdues : {rejected.toLocaleString('fr-FR')}</span>
        <span>coût : {cost.toFixed(0)} €/jour</span>
        <span className="text-muted">{top > base ? 'élastique' : 'capacité fixe'}</span>
      </div>
    </div>
  )
}
