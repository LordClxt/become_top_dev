import { useState } from 'react'

export const id = 'java-ch01-new-vs-valueof'

// Simule Integer : valueOf garde en cache -128..127, new alloue toujours.
type Obj = { addr: number; value: number; cached: boolean }
type Ref = { name: string; addr: number; via: 'new' | 'valueOf' }

const LOW = -128
const HIGH = 127
const hex = (a: number) => `@${a.toString(16)}`

export default function NewVsValueOf() {
  const [value, setValue] = useState(127)
  const [heap, setHeap] = useState<Obj[]>([])
  const [refs, setRefs] = useState<Ref[]>([])
  const [nextAddr, setNextAddr] = useState(0x1a0)

  const call = (via: 'new' | 'valueOf') => {
    const name = String.fromCharCode(97 + (refs.length % 26))
    const inCache = value >= LOW && value <= HIGH
    if (via === 'valueOf' && inCache) {
      const hit = heap.find((o) => o.cached && o.value === value)
      if (hit) return setRefs([...refs, { name, addr: hit.addr, via }])
    }
    const obj: Obj = { addr: nextAddr, value, cached: via === 'valueOf' && inCache }
    setHeap([...heap, obj])
    setRefs([...refs, { name, addr: obj.addr, via }])
    setNextAddr(nextAddr + 0x10)
  }

  const reset = () => {
    setHeap([])
    setRefs([])
    setNextAddr(0x1a0)
  }

  const last = refs.at(-1)
  const prev = refs.at(-2)
  const valueOf = (r: Ref) => heap.find((o) => o.addr === r.addr)!.value

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-muted">
          valeur
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Math.trunc(Number(e.target.value) || 0))}
            className="w-24 rounded-md border border-line bg-surface px-2 py-1 font-code text-text"
          />
        </label>
        <button type="button" onClick={() => call('new')} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
          new Integer({value})
        </button>
        <button type="button" onClick={() => call('valueOf')} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
          Integer.valueOf({value})
        </button>
        <button type="button" onClick={reset} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-text">
          vider
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-muted">Variables (la pile)</p>
          <ul className="grid gap-1">
            {refs.length === 0 && <li className="text-xs text-muted">Aucun appel pour l'instant.</li>}
            {refs.map((r) => (
              <li key={r.name} className="flex items-center justify-between rounded border border-line px-2 py-1 font-code text-xs">
                <span>
                  {r.name} <span className="text-muted">← {r.via}</span>
                </span>
                <span className="text-accent">{hex(r.addr)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">Objets dans le tas ({heap.length})</p>
          <div className="flex flex-wrap gap-1">
            {heap.map((o) => (
              <span
                key={o.addr}
                className={`rounded border px-2 py-1 font-code text-xs ${o.cached ? 'border-pass/60 bg-pass/10' : 'border-line bg-cell-empty'}`}
                title={o.cached ? 'dans IntegerCache' : 'objet neuf'}
              >
                {o.value} <span className="text-muted">{hex(o.addr)}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Vert : instance du cache (-128 à 127), partagée.</p>
        </div>
      </div>

      <p role="status" className="text-sm">
        {last && prev ? (
          <>
            <span className="font-code">{prev.name} == {last.name}</span> vaut{' '}
            <span className={`font-code ${prev.addr === last.addr ? 'text-pass' : 'text-fail'}`}>{String(prev.addr === last.addr)}</span>
            {', '}
            <span className="font-code">equals</span> vaut{' '}
            <span className="font-code">{String(valueOf(prev) === valueOf(last))}</span>.{' '}
            {prev.addr === last.addr
              ? 'Même adresse : la fabrique a rendu l’instance qu’elle avait déjà.'
              : 'Deux adresses : == compare les références, pas les valeurs.'}
          </>
        ) : (
          'Fais au moins deux appels pour comparer les deux derniers avec == et equals.'
        )}
      </p>
    </div>
  )
}
