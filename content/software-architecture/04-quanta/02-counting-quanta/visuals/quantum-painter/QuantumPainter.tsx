import { useState } from 'react'

export const id = 'arch-ch04-quantum-painter'

const SERVICES = ['Commandes', 'Paiement', 'Stock', 'Livraison']
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3]]
const COLORS = ['border-accent text-accent', 'border-pass text-pass', 'border-fail text-fail', 'border-text text-text']

export default function QuantumPainter() {
  const [sync, setSync] = useState([true, false, false])
  const [sharedDb, setSharedDb] = useState(false)
  const [sharedUi, setSharedUi] = useState(false)

  const parent = SERVICES.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : find(parent[i]!))
  const union = (a: number, b: number) => { parent[find(a)] = find(b) }
  LINKS.forEach(([a, b], k) => { if (sync[k]) union(a, b) })
  if (sharedDb || sharedUi) SERVICES.forEach((_, i) => union(0, i))
  const roots = [...new Set(SERVICES.map((_, i) => find(i)))]
  const colorOf = (i: number) => COLORS[roots.indexOf(find(i)) % COLORS.length]!

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {SERVICES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`rounded-md border-2 px-3 py-1 font-code text-xs ${colorOf(i)}`}>{s} + sa base</span>
            {i < LINKS.length && (
              <button type="button" onClick={() => setSync(sync.map((v, k) => (k === i ? !v : v)))}
                className="rounded-md border border-line px-2 py-0.5 text-xs">{sync[i] ? '— sync →' : '⇢ async ⇢'}</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {([['Base partagée par tous', sharedDb, setSharedDb], ['Interface unique qui appelle tout en synchrone', sharedUi, setSharedUi]] as const).map(([l, v, set]) => (
          <button key={l} type="button" onClick={() => set(!v)}
            className={`rounded-md border px-3 py-1 text-sm ${v ? 'border-accent text-text' : 'border-line text-muted'}`}>{v ? '✓ ' : ''}{l}</button>
        ))}
      </div>
      <p className="text-sm">Quanta : <span className="font-code text-accent">{roots.length}</span>
        <span className="text-muted"> — une même couleur = un même quantum (appel synchrone, base ou interface partagée).</span></p>
    </div>
  )
}
