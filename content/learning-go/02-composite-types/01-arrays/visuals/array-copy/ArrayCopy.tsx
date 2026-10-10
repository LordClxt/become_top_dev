import { useMemo, useState } from 'react'

export const id = 'go-ch02-array-copy'

/** Chaque variable array possède ses propres cases : l'assignation et l'appel de fonction copient tout. */
type Mem = { vars: { name: string; cells: number[]; scope?: string }[]; output: string[] }
type Step = { code: string; note: string; run: (m: Mem) => Mem; touched: (m: Mem) => string[] }

const clone = (m: Mem): Mem => ({ vars: m.vars.map((v) => ({ ...v, cells: [...v.cells] })), output: [...m.output] })
const get = (m: Mem, name: string) => m.vars.find((v) => v.name === name)!
const fmt = (cells: number[]) => `[${cells.join(' ')}]`

const STEPS: Step[] = [
  {
    code: 'a := [3]int{1, 2, 3}',
    note: 'a réserve 3 cases à lui.',
    run: (m) => ({ ...m, vars: [{ name: 'a', cells: [1, 2, 3] }] }),
    touched: () => ['a:0', 'a:1', 'a:2'],
  },
  {
    code: 'b := a',
    note: 'Les 3 cases sont recopiées dans un nouvel emplacement : b ne partage rien avec a.',
    run: (m) => {
      const n = clone(m)
      n.vars.push({ name: 'b', cells: [...get(m, 'a').cells] })
      return n
    },
    touched: () => ['b:0', 'b:1', 'b:2'],
  },
  {
    code: 'b[0] = 100',
    note: 'Seule la case de b change. a est intact.',
    run: (m) => {
      const n = clone(m)
      get(n, 'b').cells[0] = 100
      return n
    },
    touched: () => ['b:0'],
  },
  {
    code: 'double(a)  // func double(x [3]int) { x[0] *= 2 }',
    note: "L'appel copie a dans le paramètre x. La fonction modifie sa copie, puis x disparaît à la fin de l'appel.",
    run: (m) => {
      const n = clone(m)
      const x = [...get(m, 'a').cells]
      x[0]! *= 2
      n.vars.push({ name: 'x', cells: x, scope: 'double' })
      return n
    },
    touched: () => ['x:0', 'x:1', 'x:2'],
  },
  {
    code: 'fmt.Println(a, b)',
    note: 'Ni la copie b ni la fonction double n’ont modifié a.',
    run: (m) => {
      const n = clone(m)
      n.vars = n.vars.filter((v) => !v.scope)
      n.output.push(`${fmt(get(n, 'a').cells)} ${fmt(get(n, 'b').cells)}`)
      return n
    },
    touched: () => [],
  },
]

export default function ArrayCopy() {
  const [step, setStep] = useState(1)
  const [size, setSize] = useState<3 | 4>(3)

  const states = useMemo(() => {
    const out: Mem[] = [{ vars: [], output: [] }]
    for (const st of STEPS) out.push(st.run(out[out.length - 1]!))
    return out
  }, [])
  const mem = states[step]!
  const touched = new Set(STEPS[step - 1]!.touched(mem))

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,17rem)_1fr]">
        <ol className="grid content-start gap-1 font-code text-xs">
          {STEPS.map((st, i) => (
            <li key={st.code}>
              <button
                type="button"
                onClick={() => setStep(i + 1)}
                className={`w-full rounded px-2 py-1 text-left ${
                  i + 1 === step ? 'bg-accent text-accent-ink' : i < step ? 'text-text' : 'text-muted'
                }`}
              >
                {st.code}
              </button>
            </li>
          ))}
        </ol>
        <div className="min-w-0">
          <div className="grid gap-4">
            {mem.vars.map((v) => (
              <div key={v.name} className={v.scope ? 'rounded-md border border-dashed border-line p-2' : ''}>
                <p className="mb-1.5 font-code text-xs text-muted">
                  {v.scope ? `${v.name} (paramètre de ${v.scope})` : v.name} [3]int
                </p>
                <div className="flex gap-1">
                  {v.cells.map((c, i) => (
                    <div
                      key={i}
                      className={`grid h-11 w-11 place-items-center rounded-md border font-code text-sm transition-colors duration-300 ${
                        touched.has(`${v.name}:${i}`) ? 'border-fail bg-fail/20' : 'border-line bg-surface-2'
                      }`}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">{STEPS[step - 1]!.note}</p>
          {mem.output.length > 0 && <pre className="mt-3 font-code text-xs text-pass">{mem.output.join('\n')}</pre>}
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step <= 1}
          className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
        >
          Étape précédente
        </button>
        <button
          type="button"
          onClick={() => setStep(Math.min(STEPS.length, step + 1))}
          disabled={step === STEPS.length}
          className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink disabled:opacity-40"
        >
          Étape suivante
        </button>
      </div>

      <div className="border-t border-line pt-5">
        <p className="text-sm text-muted">La taille fait partie du type. Choisis l'array passé à sum :</p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Taille de l'array">
          {([3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={size === n}
              onClick={() => setSize(n)}
              className={`rounded-md border px-3 py-1.5 font-code text-xs ${
                size === n ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
              }`}
            >
              [{n}]int
            </button>
          ))}
        </div>
        <pre className="mt-3 font-code text-xs leading-relaxed">
          <span className="text-muted">{'func sum(a [3]int) int'}</span>
          {'\n'}sum([{size}]int{'{'}
          {Array.from({ length: size }, (_, i) => i + 1).join(', ')}
          {'}'})
        </pre>
        <p className={`mt-2 font-code text-xs ${size === 3 ? 'text-pass' : 'text-fail'}`}>
          {size === 3
            ? 'ok : le type [3]int correspond'
            : 'erreur de compilation : cannot use [4]int{…} (value of type [4]int) as [3]int value in argument to sum'}
        </p>
      </div>
    </div>
  )
}
