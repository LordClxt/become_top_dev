import { useState } from 'react'

export const id = 'arch-ch03-flow-graph'

type G = { label: string; code: string; nodes: [string, number, number][]; edges: [string, string][] }
const EXAMPLES: G[] = [
  { label: 'Sans décision', code: 'function total(a, b) {\n  const s = a + b;\n  return s;\n}',
    nodes: [['in', 140, 20], ['s', 140, 90], ['out', 140, 160]], edges: [['in', 's'], ['s', 'out']] },
  { label: 'decision() du livre', code: 'if (c1 < 100) return 0;\nelse if (c1 + c2 > 500) return 1;\nelse return -1;',
    nodes: [['in', 140, 20], ['c1', 140, 70], ['r0', 50, 130], ['c2', 220, 130], ['r1', 160, 190], ['rm1', 270, 190], ['out', 140, 250]],
    edges: [['in', 'c1'], ['c1', 'r0'], ['c1', 'c2'], ['c2', 'r1'], ['c2', 'rm1'], ['r0', 'out'], ['r1', 'out'], ['rm1', 'out']] },
  { label: 'Boucle + &&', code: 'for (const x of xs)\n  if (x.ok && x.n > 0) n++;\nreturn n;',
    nodes: [['in', 140, 20], ['loop', 140, 80], ['a', 60, 140], ['b', 140, 170], ['inc', 220, 140], ['out', 260, 60]],
    edges: [['in', 'loop'], ['loop', 'a'], ['a', 'b'], ['a', 'loop'], ['b', 'inc'], ['b', 'loop'], ['inc', 'loop'], ['loop', 'out']] },
]

export default function FlowGraph() {
  const [i, setI] = useState(1)
  const g = EXAMPLES[i]!
  const pos = new Map(g.nodes.map(([n, x, y]) => [n, [x, y] as const]))
  const E = g.edges.length, N = g.nodes.length, cc = E - N + 2
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex, k) => (
          <button key={ex.label} type="button" onClick={() => setI(k)}
            className={`rounded-md border px-3 py-1 text-sm ${k === i ? 'border-accent text-text' : 'border-line text-muted'}`}>{ex.label}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-md border border-line p-3 font-code text-xs leading-5">{g.code}</pre>
        <svg viewBox="0 0 320 270" className="w-full max-w-sm text-muted" role="img" aria-label="Graphe de flot de contrôle">
          {g.edges.map(([a, b]) => {
            const [x1, y1] = pos.get(a)!, [x2, y2] = pos.get(b)!
            return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={2} />
          })}
          {g.nodes.map(([n, x, y]) => <circle key={n} cx={x} cy={y} r={11} className="fill-accent" />)}
        </svg>
      </div>
      <p className="font-code text-sm">E = {E} · N = {N} · CC = E − N + 2 = <span className="text-pass">{cc}</span></p>
    </div>
  )
}
