import { useState } from 'react'

export const id = 'arch-ch07-layers-isolation'

const LAYERS = ['Présentation', 'Métier', 'Services', 'Persistance', 'Base']

export default function LayersIsolation() {
  const [open, setOpen] = useState([false, false, true, false, false])
  const [changed, setChanged] = useState(3)
  // Une couche i peut appeler j (j > i) si toutes les couches strictement entre i et j sont ouvertes.
  const canCall = (i: number, j: number) => j === i + 1 || (j > i && open.slice(i + 1, j).every(Boolean))
  const impacted = LAYERS.map((_, i) => i !== changed && i < changed && canCall(i, changed))
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Ouvre ou ferme les couches, puis choisis celle qu'on modifie : les couches qui l'appellent directement sont touchées.</p>
      {LAYERS.map((l, i) => (
        <div key={l} className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setChanged(i)}
            className={`w-40 rounded-md border-2 px-3 py-2 text-left text-sm ${i === changed ? 'border-accent' : impacted[i] ? 'border-fail text-fail' : 'border-line'}`}>
            {l}{i === changed ? ' (modifiée)' : impacted[i] ? ' (touchée)' : ''}
          </button>
          {i > 0 && i < LAYERS.length - 1 && (
            <button type="button" onClick={() => setOpen(open.map((v, k) => (k === i ? !v : v)))}
              className={`rounded-md border px-2 py-0.5 text-xs ${open[i] ? 'border-accent text-text' : 'border-line text-muted'}`}>{open[i] ? 'ouverte' : 'fermée'}</button>
          )}
        </div>
      ))}
      <p className="font-code text-sm">couches touchées : {impacted.filter(Boolean).length}{impacted.filter(Boolean).length > 1 ? ' — l’isolation des couches est perdue' : ''}</p>
    </div>
  )
}
