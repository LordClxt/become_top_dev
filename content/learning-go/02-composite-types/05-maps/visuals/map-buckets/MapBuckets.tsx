import { useState } from 'react'

export const id = 'go-ch02-map-buckets'

/**
 * Modèle simplifié d'une map Go : la clé est hachée vers un bucket.
 * Le parcours démarre à un bucket et à une position tirés au hasard, comme le runtime,
 * d'où un ordre qui change d'un range à l'autre.
 */
const BUCKETS = 4
type Entry = { k: string; v: number }
type MapState = Entry[][] | null // null = map nil

function hash(key: string): number {
  // FNV-1a 32 bits. Le vrai runtime utilise un hash avec une graine aléatoire par map.
  let h = 0x811c9dc5
  for (const ch of key) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193) >>> 0
  return h % BUCKETS
}

function put(m: Entry[][], k: string, v: number): Entry[][] {
  const b = hash(k)
  return m.map((bucket, i) => {
    if (i !== b) return bucket
    return bucket.some((e) => e.k === k) ? bucket.map((e) => (e.k === k ? { k, v } : e)) : [...bucket, { k, v }]
  })
}

function rangeOrder(m: Entry[][]): Entry[] {
  const startBucket = Math.floor(Math.random() * BUCKETS)
  const offset = Math.floor(Math.random() * 8)
  const out: Entry[] = []
  for (let i = 0; i < BUCKETS; i++) {
    const bucket = m[(startBucket + i) % BUCKETS]!
    for (let j = 0; j < bucket.length; j++) out.push(bucket[(offset + j) % bucket.length]!)
  }
  return out
}

const initial = (): Entry[][] =>
  [
    ['Orcas', 3],
    ['Bears', 1],
    ['Hawks', 2],
  ].reduce<Entry[][]>((m, [k, v]) => put(m, k as string, v as number), Array.from({ length: BUCKETS }, () => []))

type Log = { code: string; result: string; kind: 'ok' | 'info' | 'error' }

export default function MapBuckets() {
  const [m, setM] = useState<MapState>(initial)
  const [key, setKey] = useState('Lions')
  const [value, setValue] = useState(4)
  const [log, setLog] = useState<Log[]>([{ code: 'wins := map[string]int{"Orcas": 3, "Bears": 1, "Hawks": 2}', result: '', kind: 'info' }])
  const [hit, setHit] = useState<string | null>(null)

  const k = key.trim() || 'Lions'
  const push = (entry: Log) => setLog((l) => [...l.slice(-5), entry])

  const write = () => {
    const code = `wins[${JSON.stringify(k)}] = ${value}`
    if (m === null) return push({ code, result: 'panic: assignment to entry in nil map', kind: 'error' })
    setM(put(m, k, value))
    setHit(k)
    push({ code, result: `bucket ${hash(k)}`, kind: 'ok' })
  }
  const read = () => {
    const found = m?.flat().find((e) => e.k === k)
    setHit(found ? k : null)
    push({
      code: `v, ok := wins[${JSON.stringify(k)}]`,
      result: found ? `v = ${found.v}, ok = true` : 'v = 0, ok = false  (valeur zéro : la clé est absente)',
      kind: found ? 'ok' : 'info',
    })
  }
  const remove = () => {
    if (m) setM(m.map((b) => b.filter((e) => e.k !== k)))
    setHit(null)
    push({ code: `delete(wins, ${JSON.stringify(k)})`, result: 'ne fait rien si la clé est absente', kind: 'info' })
  }
  const range = () => {
    const order = m ? rangeOrder(m) : []
    push({
      code: 'for k := range wins',
      result: order.length ? order.map((e) => e.k).join(' → ') : 'aucune itération',
      kind: 'info',
    })
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {m === null ? (
          <p className="col-span-full rounded-md border border-dashed border-line p-4 text-sm text-muted">
            <code className="font-code">var wins map[string]int</code> : map nil, aucun bucket alloué. La lecture
            renvoie la valeur zéro, l'écriture provoque une panic.
          </p>
        ) : (
          m.map((bucket, i) => (
            <div key={i} className="rounded-md border border-line bg-surface-2/60 p-2">
              <p className="mb-2 text-xs text-muted">bucket {i}</p>
              <ul className="grid gap-1">
                {bucket.map((e) => (
                  <li
                    key={e.k}
                    className={`flex justify-between rounded px-2 py-1 font-code text-xs transition-colors duration-300 ${
                      hit === e.k ? 'bg-accent text-accent-ink' : 'bg-surface'
                    }`}
                  >
                    <span>{JSON.stringify(e.k)}</span>
                    <span>{e.v}</span>
                  </li>
                ))}
                {bucket.length === 0 && <li className="px-2 py-1 font-code text-xs text-muted">vide</li>}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-muted">Clé</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.slice(0, 12))}
            className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 font-code text-xs"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">Valeur</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value) || 0)}
            className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 font-code text-xs"
          />
        </label>
        <button type="button" onClick={write} className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink">
          Écrire
        </button>
        <button type="button" onClick={read} className="rounded-md border border-line px-3 py-1.5">
          Lire avec comma ok
        </button>
        <button type="button" onClick={remove} className="rounded-md border border-line px-3 py-1.5">
          delete
        </button>
        <button type="button" onClick={range} className="rounded-md border border-line px-3 py-1.5">
          Parcourir avec range
        </button>
        <button
          type="button"
          onClick={() => {
            setM(m === null ? initial() : null)
            setHit(null)
            push({
              code: m === null ? 'wins = map[string]int{"Orcas": 3, "Bears": 1, "Hawks": 2}' : 'var wins map[string]int',
              result: '',
              kind: 'info',
            })
          }}
          className="ml-auto text-xs text-muted underline underline-offset-4 hover:text-text"
        >
          {m === null ? 'Initialiser la map' : 'Repartir d’une map nil'}
        </button>
      </div>

      <ol className="grid gap-1 rounded-md bg-ink/60 p-3 font-code text-xs" aria-live="polite">
        {log.map((l, i) => (
          <li key={i}>
            <span className="text-text">{l.code}</span>
            {l.result && (
              <span className={l.kind === 'error' ? 'text-fail' : l.kind === 'ok' ? 'text-pass' : 'text-muted'}>
                {'  // '}
                {l.result}
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        Clique plusieurs fois sur « Parcourir avec range » : l'ordre change, comme dans un vrai programme.
      </p>
    </div>
  )
}
