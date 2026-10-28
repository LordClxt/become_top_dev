import { useState } from 'react'

export const id = 'arch-ch05-smeared-workflow'

const LAYERS = ['Présentation', 'Règles', 'Persistance']
const DOMAINS = ['Catalogue', 'Commande', 'Livraison', 'Promotions']
const CHANGES = [
  { label: 'Code promo au passage en caisse', domains: ['Commande', 'Promotions'], layers: [0, 1, 2] },
  { label: 'Allergènes sur les recettes', domains: ['Catalogue'], layers: [0, 1, 2] },
  { label: 'Suivi du livreur en direct', domains: ['Livraison'], layers: [0, 1, 2] },
  { label: 'Nouvelle charte graphique', domains: DOMAINS, layers: [0] },
]

export default function SmearedWorkflow() {
  const [c, setC] = useState(0)
  const ch = CHANGES[c]!
  const technical = ch.layers.length
  const domain = ch.domains.length
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {CHANGES.map((x, k) => (
          <button key={x.label} type="button" onClick={() => setC(k)}
            className={`rounded-md border px-3 py-1 text-sm ${k === c ? 'border-accent text-text' : 'border-line text-muted'}`}>{x.label}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead><tr><th />{DOMAINS.map((d) => <th key={d} className="px-2 py-1 text-muted">{d}</th>)}</tr></thead>
          <tbody>
            {LAYERS.map((l, li) => (
              <tr key={l}>
                <th className="px-2 py-1 text-left text-muted">{l}</th>
                {DOMAINS.map((d) => {
                  const hit = ch.domains.includes(d) && ch.layers.includes(li)
                  return <td key={d} className={`h-8 w-24 border border-line ${hit ? 'bg-accent' : ''}`} />
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-1 font-code text-sm">
        <span className={technical > domain ? 'text-fail' : 'text-pass'}>partitionnement technique (couches) : {technical} composant(s) touché(s)</span>
        <span className={domain > technical ? 'text-fail' : 'text-pass'}>partitionnement par domaine : {domain} composant(s) touché(s)</span>
      </div>
    </div>
  )
}
