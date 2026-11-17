import { useState } from 'react'

export const id = 'java-ch01-injected-clock'

type ClockKind = 'system' | 'fixed' | 'fake'
type Run = { n: number; elapsed: number; pass: boolean }

// Le test : un jeton émis à t0 doit être expiré 3600 s plus tard, et pas avant.
const KINDS: { k: ClockKind; label: string; code: string }[] = [
  { k: 'system', label: 'horloge système', code: 'new TokenService(Clock.systemUTC())' },
  { k: 'fixed', label: 'horloge fixe', code: 'new TokenService(Clock.fixed(T0, UTC))' },
  { k: 'fake', label: 'fausse horloge pilotable', code: 'new TokenService(fake); fake.advance(3601s)' },
]

function runTest(kind: ClockKind): { elapsed: number; pass: boolean; why: string } {
  if (kind === 'fake') return { elapsed: 3601, pass: true, why: 'Le test avance lui-même la fausse horloge de 3601 s : expiré, à chaque fois.' }
  if (kind === 'fixed') return { elapsed: 0, pass: false, why: 'Le temps ne bouge jamais : le jeton n’expire jamais. Déterministe, mais il faut une horloge qu’on peut avancer (Clock.offset ou un faux).' }
  // Le test « attend » avec un sleep raccourci : le temps réel écoulé varie selon la charge de la machine.
  const elapsed = Math.round(3595 + Math.random() * 10)
  return {
    elapsed,
    pass: elapsed > 3600,
    why: `Le temps réel écoulé dépend de la machine (${elapsed} s cette fois) : le résultat change d’un lancement à l’autre.`,
  }
}

export default function InjectedClock() {
  const [kind, setKind] = useState<ClockKind>('system')
  const [runs, setRuns] = useState<Run[]>([])
  const [why, setWhy] = useState('Choisis l’horloge injectée, puis lance le test plusieurs fois.')

  const choose = (k: ClockKind) => {
    setKind(k)
    setRuns([])
    setWhy('Nouvelle dépendance : historique remis à zéro.')
  }

  const run = () => {
    const r = runTest(kind)
    setRuns([...runs.slice(-11), { n: runs.length ? runs.at(-1)!.n + 1 : 1, elapsed: r.elapsed, pass: r.pass }])
    setWhy(r.why)
  }

  const passed = runs.filter((r) => r.pass).length
  const verdict =
    runs.length < 3 ? '' : passed === runs.length ? 'déterministe (toujours vert)' : passed === 0 ? 'déterministe (toujours rouge)' : 'instable (flaky)'

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Horloge injectée">
        {KINDS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => choose(k)}
            className={`rounded-md border px-3 py-1.5 text-xs ${kind === k ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <pre className="overflow-x-auto rounded-md border border-line bg-surface p-3 font-code text-xs">
        {`var service = ${KINDS.find((x) => x.k === kind)!.code};\nassertTrue(service.isExpired(T0.plusSeconds(3600)));`}
      </pre>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent">
          lancer le test
        </button>
        <div className="flex flex-wrap gap-1" aria-label="Historique des lancements">
          {runs.map((r) => (
            <span
              key={r.n}
              title={`lancement ${r.n} : ${r.pass ? 'vert' : 'rouge'}`}
              className={`h-4 w-4 rounded-sm ${r.pass ? 'bg-pass' : 'bg-fail'}`}
            />
          ))}
          {Array.from({ length: Math.max(0, 6 - runs.length) }, (_, i) => (
            <span key={`e${i}`} className="h-4 w-4 rounded-sm bg-cell-empty" />
          ))}
        </div>
        {verdict && <span className={`text-xs font-code ${verdict.startsWith('instable') ? 'text-fail' : 'text-muted'}`}>{verdict}</span>}
      </div>

      <p role="status" className="text-sm">
        {why}
      </p>
    </div>
  )
}
