import { useState } from 'react'
import { ArrayView } from '@/visuals/lib/ArrayView'
import { append, empty, literal, type SimState } from '@/visuals/lib/sliceSim'

export const id = 'go-ch02-slice-growth'

const start = (cap: number) => literal(empty(), 's', [], cap)

export default function SliceGrowth() {
  const [initialCap, setInitialCap] = useState(0)
  const [state, setState] = useState<SimState>(start(0))
  const [next, setNext] = useState(10)
  const [log, setLog] = useState<string[]>([])

  const s = state.vars.s!
  const willGrow = s.len === s.cap

  const doAppend = () => {
    const after = append(state, 's', 's', [String(next)])
    const grew = after.vars.s!.arr !== s.arr
    setLog((l) =>
      [
        grew
          ? `append(s, ${next}) : capacité pleine (${s.cap}) → nouvel array de ${after.vars.s!.cap} case${after.vars.s!.cap > 1 ? 's' : ''}, ${s.len} élément${s.len > 1 ? 's' : ''} recopié${s.len > 1 ? 's' : ''}`
          : `append(s, ${next}) : écrit dans une case déjà réservée, rien n'est copié`,
        ...l,
      ].slice(0, 6),
    )
    setState(after)
    setNext(next + 10)
  }

  const reset = (cap: number) => {
    setInitialCap(cap)
    setState(start(cap))
    setNext(10)
    setLog([])
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <code className="font-code text-xs">s := make([]int, 0, {initialCap})</code>
        <label className="flex items-center gap-2 text-muted">
          capacité de départ
          <input
            type="range"
            min={0}
            max={8}
            value={initialCap}
            onChange={(e) => reset(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
          <span className="w-3 tabular-nums">{initialCap}</span>
        </label>
        <button
          type="button"
          onClick={doAppend}
          disabled={s.cap >= 16}
          className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink disabled:opacity-40"
        >
          s = append(s, {next})
        </button>
        <button type="button" onClick={() => reset(initialCap)} className="text-muted hover:text-text">
          Recommencer
        </button>
      </div>
      <ArrayView state={state} maxDead={1} />
      <p className={`mt-4 text-sm ${willGrow ? 'text-fail' : 'text-muted'}`}>
        {willGrow
          ? 'Capacité pleine : le prochain append va réserver un nouvel array et tout recopier.'
          : `Encore ${s.cap - s.len} case${s.cap - s.len > 1 ? 's' : ''} libre${s.cap - s.len > 1 ? 's' : ''} : le prochain append ne copiera rien.`}
      </p>
      {log.length > 0 && (
        <ul className="mt-3 grid gap-1 font-code text-xs text-muted">
          {log.map((l, i) => (
            <li key={log.length - i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
