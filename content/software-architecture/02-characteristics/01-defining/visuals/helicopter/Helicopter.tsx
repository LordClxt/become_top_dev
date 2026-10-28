import { useState } from 'react'

export const id = 'arch-ch02-helicopter'

const NAMES = ['Sécurité', 'Performance', 'Simplicité', 'Élasticité'] as const
type Name = (typeof NAMES)[number]
// Effet de chaque point d'une caractéristique sur les autres (interactions simplifiées).
const EFFECT: Record<Name, Partial<Record<Name, number>>> = {
  Sécurité: { Performance: -0.6, Simplicité: -0.4 },
  Performance: { Simplicité: -0.5, Sécurité: -0.2 },
  Simplicité: { Élasticité: -0.5, Performance: -0.2 },
  Élasticité: { Simplicité: -0.7 },
}

export default function Helicopter() {
  const [effort, setEffort] = useState<Record<Name, number>>({ Sécurité: 2, Performance: 2, Simplicité: 2, Élasticité: 2 })
  const level = (n: Name) => {
    let v = 2 + effort[n]
    for (const other of NAMES) v += (EFFECT[other][n] ?? 0) * effort[other]
    return Math.max(0, Math.min(5, v))
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Pousse une commande : les autres bougent. On ne maximise jamais tout.</p>
      {NAMES.map((n) => {
        const v = level(n)
        return (
          <div key={n} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
            <span>{n}</span>
            <input type="range" min={0} max={4} value={effort[n]} onChange={(e) => setEffort({ ...effort, [n]: Number(e.target.value) })} />
            <span className={`font-code ${v < 1.5 ? 'text-fail' : v > 3.5 ? 'text-pass' : ''}`}>{v.toFixed(1)}/5</span>
          </div>
        )
      })}
      <p className="text-xs text-muted">Le curseur est l'effort de conception ; le chiffre est le niveau obtenu, après interactions.</p>
    </div>
  )
}
