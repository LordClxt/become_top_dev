import { useState } from 'react'

export const id = 'java-ch02-hash-buckets'

const BUCKETS = 8
type Route = { from: string; to: string }
type Entry = { route: Route; storedHash: number; mutated: boolean }
type HashKind = 'recipe' | 'constant' | 'ignoreTo'

const ROUTES: Route[] = [
  { from: 'CDG', to: 'JFK' }, { from: 'CDG', to: 'LHR' }, { from: 'CDG', to: 'FCO' }, { from: 'CDG', to: 'MAD' },
  { from: 'CDG', to: 'BCN' }, { from: 'CDG', to: 'AMS' }, { from: 'CDG', to: 'BER' }, { from: 'CDG', to: 'LIS' },
  { from: 'CDG', to: 'ATH' }, { from: 'CDG', to: 'DUB' },
]

// String.hashCode de Java : s[0]*31^(n-1) + … + s[n-1], sur 32 bits signés.
function strHash(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return h
}

function hashOf(kind: HashKind, r: Route): number {
  if (kind === 'constant') return 42
  if (kind === 'ignoreTo') return strHash(r.from)
  return (Math.imul(31, strHash(r.from)) + strHash(r.to)) | 0
}

// Comme HashMap : h ^ (h >>> 16), puis (n - 1) & h.
const bucketOf = (h: number) => ((h ^ (h >>> 16)) & (BUCKETS - 1)) >>> 0
const label = (r: Route) => `${r.from}→${r.to}`

export default function HashBuckets() {
  const [kind, setKind] = useState<HashKind>('recipe')
  const [entries, setEntries] = useState<Entry[]>([])
  const [log, setLog] = useState('Ajoute des trajets, puis cherche-les.')

  const reset = (k: HashKind) => {
    setKind(k)
    setEntries([])
    setLog('Table vidée : nouvelle fonction de hash.')
  }

  const add = () => {
    const next = ROUTES[entries.length]
    if (!next) return setLog('Plus de trajets dans cette démo.')
    const route = { ...next }
    const h = hashOf(kind, route)
    setEntries([...entries, { route, storedHash: h, mutated: false }])
    setLog(`put(${label(route)}) : hash = ${h}, compartiment ${bucketOf(h)}.`)
  }

  const get = (target: Route) => {
    const h = hashOf(kind, target)
    const b = bucketOf(h)
    let compared = 0
    let found = false
    for (const e of entries) {
      if (bucketOf(e.storedHash) !== b) continue
      compared++
      // HashMap compare le hash mémorisé avant d'appeler equals.
      if (e.storedHash === h && e.route.from === target.from && e.route.to === target.to) {
        found = true
        break
      }
    }
    setLog(
      `get(${label(target)}) : compartiment ${b}, ${compared} entrée(s) examinée(s) → ${found ? 'trouvé' : 'null'}.` +
        (compared > 3 ? ' Avec 100 000 clés dans ce compartiment, chaque recherche les parcourt toutes.' : ''),
    )
  }

  const mutate = () => {
    const i = entries.findIndex((e) => !e.mutated)
    if (i === -1) return setLog('Ajoute d’abord un trajet.')
    const copy = [...entries]
    const e = copy[i]!
    const before = label(e.route)
    e.route.to = 'XXX' // la clé change APRÈS insertion ; le hash mémorisé, lui, ne bouge pas
    e.mutated = true
    setEntries(copy)
    setLog(
      `La clé ${before} devient ${label(e.route)} après insertion. Elle reste rangée au compartiment ${bucketOf(e.storedHash)} ` +
        `avec son ancien hash : get(${label(e.route)}) cherche ailleurs, get(${before}) trouve le bon compartiment mais equals échoue.`,
    )
  }

  const byBucket = Array.from({ length: BUCKETS }, (_, b) => entries.filter((e) => bucketOf(e.storedHash) === b))
  const mutated = entries.find((e) => e.mutated)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="Fonction de hash">
        {(
          [
            ['recipe', '31 * from + to'],
            ['ignoreTo', 'ignore la destination'],
            ['constant', 'return 42'],
          ] as const
        ).map(([k, text]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => reset(k)}
            className={`rounded-md border px-3 py-1.5 font-code text-xs ${kind === k ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={add} className="rounded-md border border-line px-3 py-1.5 hover:border-accent">
          put(trajet suivant)
        </button>
        <button
          type="button"
          onClick={() => entries.length > 0 && get(ROUTES[entries.length - 1]!)}
          className="rounded-md border border-line px-3 py-1.5 hover:border-accent"
        >
          get(dernier trajet)
        </button>
        <button type="button" onClick={mutate} className="rounded-md border border-line px-3 py-1.5 hover:border-accent">
          modifier une clé rangée
        </button>
        {mutated && (
          <>
            <button type="button" onClick={() => get(mutated.route)} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
              get({label(mutated.route)})
            </button>
            <button
              type="button"
              onClick={() => get(ROUTES[entries.indexOf(mutated)]!)}
              className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent"
            >
              get({label(ROUTES[entries.indexOf(mutated)]!)})
            </button>
          </>
        )}
      </div>

      <div className="grid gap-1" aria-label="Compartiments de la HashMap">
        {byBucket.map((list, b) => (
          <div key={b} className="flex items-center gap-2">
            <span className="w-10 font-code text-[10px] text-muted">[{b}]</span>
            <div className="flex min-h-[2rem] flex-1 flex-wrap gap-1 rounded-md border border-line/50 px-1 py-1">
              {list.map((e) => (
                <span
                  key={label(ROUTES[entries.indexOf(e)]!)}
                  className={`rounded border px-2 py-0.5 font-code text-xs ${e.mutated ? 'border-fail/60 bg-fail/10' : 'border-line'}`}
                >
                  {label(e.route)}
                </span>
              ))}
            </div>
            <span className="w-16 text-right text-[10px] text-muted">{list.length > 0 ? `${list.length} entrée(s)` : ''}</span>
          </div>
        ))}
      </div>

      <p role="status" className="text-sm">
        {log}
      </p>
    </div>
  )
}
