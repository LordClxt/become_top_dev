import { useMemo, useState } from 'react'
import { ArrayView } from '@/visuals/lib/ArrayView'
import { append, empty, literal, print, reslice, set, type SimState } from '@/visuals/lib/sliceSim'

export const id = 'go-ch02-slice-sharing'

type Step = { code: string; run: (s: SimState) => SimState }

const ABCD = ['a', 'b', 'c', 'd']

const PRESETS: Record<string, { title: string; steps: Step[] }> = {
  sharing: {
    title: 'Découper partage la mémoire',
    steps: [
      { code: 'x := []string{"a", "b", "c", "d"}', run: (s) => literal(s, 'x', ABCD) },
      { code: 'y := x[:2]', run: (s) => reslice(s, 'y', 'x', 0, 2) },
      { code: 'y[0] = "Z"', run: (s) => set(s, 'y', 0, 'Z') },
      { code: 'fmt.Println(x, y)', run: (s) => print(s, ['x', 'y']) },
    ],
  },
  'append-overwrite': {
    title: 'append écrase la slice parente',
    steps: [
      { code: 'x := []string{"a", "b", "c", "d"}', run: (s) => literal(s, 'x', ABCD) },
      { code: 'y := x[:2]', run: (s) => reslice(s, 'y', 'x', 0, 2) },
      { code: 'y = append(y, "z")', run: (s) => append(s, 'y', 'y', ['z']) },
      { code: 'fmt.Println(x, y)', run: (s) => print(s, ['x', 'y']) },
    ],
  },
  'full-slice': {
    title: 'La full slice expression protège',
    steps: [
      { code: 'x := []string{"a", "b", "c", "d"}', run: (s) => literal(s, 'x', ABCD) },
      { code: 'y := x[0:2:2]', run: (s) => reslice(s, 'y', 'x', 0, 2, 2) },
      { code: 'y = append(y, "z")', run: (s) => append(s, 'y', 'y', ['z']) },
      { code: 'fmt.Println(x, y)', run: (s) => print(s, ['x', 'y']) },
    ],
  },
  confusing: {
    title: 'Trois slices, un seul array',
    steps: [
      { code: 'x := make([]string, 0, 5)', run: (s) => literal(s, 'x', [], 5) },
      { code: 'x = append(x, "a", "b", "c", "d")', run: (s) => append(s, 'x', 'x', ABCD) },
      { code: 'y := x[:2]', run: (s) => reslice(s, 'y', 'x', 0, 2) },
      { code: 'z := x[2:]', run: (s) => reslice(s, 'z', 'x', 2, 4) },
      { code: 'y = append(y, "i", "j", "k")', run: (s) => append(s, 'y', 'y', ['i', 'j', 'k']) },
      { code: 'x = append(x, "x")', run: (s) => append(s, 'x', 'x', ['x']) },
      { code: 'z = append(z, "y")', run: (s) => append(s, 'z', 'z', ['y']) },
      { code: 'fmt.Println(x, y, z)', run: (s) => print(s, ['x', 'y', 'z']) },
    ],
  },
}

/** Cases écrites par une étape : on compare les arrays avant/après. */
function changedCells(before: SimState, after: SimState): Set<string> {
  const out = new Set<string>()
  after.arrays.forEach((arr) => {
    const prev = before.arrays[arr.id]
    if (!prev) return
    arr.cells.forEach((c, i) => {
      if (c !== prev.cells[i]) out.add(`${arr.id}:${i}`)
    })
  })
  return out
}

export default function SliceSharing() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('append-overwrite')
  const [step, setStep] = useState(1)
  const steps = PRESETS[preset]!.steps

  const states = useMemo(() => {
    const out = [empty()]
    for (const st of steps) out.push(st.run(out[out.length - 1]!))
    return out
  }, [steps])

  const current = states[step]!
  const highlight = step > 0 ? changedCells(states[step - 1]!, current) : undefined

  return (
    <div>
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Scénarios">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={preset === key}
            onClick={() => {
              setPreset(key)
              setStep(1)
            }}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm ${
              preset === key ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_1fr]">
        <ol className="grid content-start gap-1 font-code text-xs">
          {steps.map((st, i) => (
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
        <div className="min-w-0 overflow-x-auto">
          {step === 0 ? (
            <p className="text-sm text-muted">Clique sur une ligne ou avance pas à pas.</p>
          ) : (
            <ArrayView state={current} highlight={highlight} />
          )}
          {current.output.length > 0 && (
            <pre className="mt-4 font-code text-xs text-pass">{current.output.join('\n')}</pre>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2 text-sm">
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
          onClick={() => setStep(Math.min(steps.length, step + 1))}
          disabled={step === steps.length}
          className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink disabled:opacity-40"
        >
          Étape suivante
        </button>
      </div>
    </div>
  )
}
