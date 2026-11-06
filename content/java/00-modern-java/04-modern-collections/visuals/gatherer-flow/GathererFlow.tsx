import { useState } from 'react'

export const id = 'java-ch00-gatherer-flow'

const SOURCE = [5, 4, 3, 8, 1, 1, 6, 2]

type Step = { batch: number[]; emitted: number[][]; next: number; finished: boolean; log: string }

const initial = (): Step => ({ batch: [], emitted: [], next: 0, finished: false, log: "L'initialiseur crée un état vide : un paquet sans élément, de somme 0." })

export default function GathererFlow() {
  const [limit, setLimit] = useState(9)
  const [s, setS] = useState<Step>(initial)

  const sum = s.batch.reduce((a, b) => a + b, 0)
  const done = s.next >= SOURCE.length

  const advance = () => {
    if (s.finished) return
    if (done) {
      // Plus d'éléments : le finisseur pousse le dernier paquet incomplet.
      const emitted = s.batch.length ? [...s.emitted, s.batch] : s.emitted
      setS({ ...s, batch: [], emitted, finished: true, log: s.batch.length ? `Fin du flux : le finisseur pousse le dernier paquet [${s.batch.join(', ')}].` : 'Fin du flux : le paquet est vide, le finisseur ne pousse rien.' })
      return
    }
    const x = SOURCE[s.next]!
    if (s.batch.length > 0 && sum + x > limit) {
      setS({
        batch: [x],
        emitted: [...s.emitted, s.batch],
        next: s.next + 1,
        finished: false,
        log: `${sum} + ${x} > ${limit} : l'intégrateur pousse [${s.batch.join(', ')}] vers l'aval, puis recommence un paquet avec ${x}.`,
      })
    } else {
      setS({ ...s, batch: [...s.batch, x], next: s.next + 1, log: `${sum} + ${x} ≤ ${limit} (ou paquet vide) : ${x} rejoint le paquet en cours. Rien n'est poussé.` })
    }
  }

  const reset = (l = limit) => {
    setLimit(l)
    setS(initial())
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          limite <span className="font-code text-xs">{limit}</span>
          <input type="range" min={5} max={15} value={limit} onChange={(e) => reset(Number(e.target.value))} aria-label="Limite du paquet" />
        </label>
        <button type="button" onClick={advance} disabled={s.finished} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent disabled:opacity-50">
          {done && !s.finished ? 'fin du flux → finisseur' : 'élément suivant'}
        </button>
        <button type="button" onClick={() => reset()} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-text">
          réinitialiser
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-line p-3">
          <div className="mb-2 text-xs text-muted">source</div>
          <div className="flex flex-wrap gap-1">
            {SOURCE.map((x, i) => (
              <span key={i} className={`rounded border px-2 py-0.5 font-code text-xs ${i < s.next ? 'border-line/40 text-muted/50' : i === s.next ? 'border-accent text-text' : 'border-line text-muted'}`}>{x}</span>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-accent/60 p-3">
          <div className="mb-2 text-xs text-muted">état du gatherer (somme {sum})</div>
          <div className="flex flex-wrap gap-1">
            {s.batch.map((x, i) => <span key={i} className="rounded border border-accent px-2 py-0.5 font-code text-xs">{x}</span>)}
            {s.batch.length === 0 && <span className="font-code text-xs text-muted">[]</span>}
          </div>
        </div>
        <div className="rounded-md border border-line p-3">
          <div className="mb-2 text-xs text-muted">aval (toList)</div>
          <div className="grid gap-1">
            {s.emitted.map((b, i) => <span key={i} className="font-code text-xs">[{b.join(', ')}]</span>)}
            {s.emitted.length === 0 && <span className="font-code text-xs text-muted">rien encore</span>}
          </div>
        </div>
      </div>

      <p role="status" className="text-sm">{s.log}</p>
    </div>
  )
}
