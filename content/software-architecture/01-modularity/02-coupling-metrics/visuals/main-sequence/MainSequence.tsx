import { useState } from 'react'

export const id = 'arch-ch01-main-sequence'

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label} : <span className="font-code text-text">{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export default function MainSequence() {
  const [ca, setCa] = useState(8)
  const [ce, setCe] = useState(1)
  const [abs, setAbs] = useState(0)
  const [con, setCon] = useState(6)

  const I = ca + ce === 0 ? 0 : ce / (ca + ce)
  const A = abs + con === 0 ? 0 : abs / (abs + con)
  const D = Math.abs(A + I - 1)
  const zone = D <= 0.3 ? 'proche de la séquence principale' : A + I < 1 ? 'zone de douleur' : "zone d'inutilité"
  const S = 260
  const px = 30 + I * S
  const py = 10 + (1 - A) * S

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
      <div className="grid gap-3">
        <Slider label="Dépendants (Ca)" value={ca} min={0} max={12} onChange={setCa} />
        <Slider label="Dépendances (Ce)" value={ce} min={0} max={12} onChange={setCe} />
        <Slider label="Éléments abstraits" value={abs} min={0} max={10} onChange={setAbs} />
        <Slider label="Éléments concrets" value={con} min={0} max={10} onChange={setCon} />
        <p className="font-code text-sm">I = {I.toFixed(2)} · A = {A.toFixed(2)} · D = {D.toFixed(2)}</p>
        <p className={`text-sm ${D <= 0.3 ? 'text-pass' : 'text-fail'}`}>{zone}</p>
      </div>
      <svg width={S + 50} height={S + 40} className="text-muted" role="img" aria-label="Graphique abstraction / instabilité">
        <rect x={30} y={10} width={S} height={S} fill="none" stroke="currentColor" strokeOpacity={0.3} />
        <polygon points={`30,${10 + S} 30,${10 + S * 0.55} ${30 + S * 0.45},${10 + S}`} className="fill-fail" fillOpacity={0.15} />
        <polygon points={`${30 + S},10 ${30 + S * 0.55},10 ${30 + S},${10 + S * 0.45}`} className="fill-fail" fillOpacity={0.15} />
        <line x1={30} y1={10} x2={30 + S} y2={10 + S} stroke="currentColor" strokeDasharray="6 5" />
        <text x={36} y={10 + S - 8} fontSize={11} fill="currentColor">douleur</text>
        <text x={30 + S - 66} y={24} fontSize={11} fill="currentColor">inutilité</text>
        <text x={30 + S / 2 - 30} y={S + 34} fontSize={11} fill="currentColor">instabilité I</text>
        <text x={4} y={20} fontSize={11} fill="currentColor">A</text>
        <circle cx={px} cy={py} r={8} className={D <= 0.3 ? 'fill-pass' : 'fill-fail'} />
      </svg>
    </div>
  )
}
