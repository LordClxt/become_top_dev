import { useState } from 'react'

export const id = 'java-ch03-structural-sharing'

type Node = { id: number; value: string; next: number | null }
type Version = { name: string; head: number | null; size: number }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MAX_VERSIONS = 8

export default function StructuralSharing() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [versions, setVersions] = useState<Version[]>([{ name: 'v0', head: null, size: 0 }])
  const [selected, setSelected] = useState(0)
  const [copied, setCopied] = useState(0) // ce qu'aurait alloué une pile qui copie tout à chaque opération
  const [log, setLog] = useState('Choisis une version, puis push ou pop : la version choisie ne change jamais.')

  const base = versions[selected]!
  const full = versions.length >= MAX_VERSIONS

  const chain = (v: Version): Node[] => {
    const out: Node[] = []
    let cur = v.head
    while (cur !== null) {
      const n = nodes[cur]!
      out.push(n)
      cur = n.next
    }
    return out
  }

  const addVersion = (v: Version, message: string) => {
    setVersions([...versions, v])
    setSelected(versions.length)
    setLog(message)
  }

  const push = () => {
    if (full) return setLog('Assez de versions pour la démo : réinitialise.')
    const value = LETTERS[nodes.length % LETTERS.length]!
    const node: Node = { id: nodes.length, value, next: base.head }
    setNodes([...nodes, node])
    setCopied(copied + base.size + 1)
    addVersion(
      { name: `v${versions.length}`, head: node.id, size: base.size + 1 },
      `${base.name}.push(${value}) : 1 nœud créé, qui pointe vers la tête de ${base.name}. Les ${base.size} autres sont partagés.`,
    )
  }

  const pop = () => {
    if (full) return setLog('Assez de versions pour la démo : réinitialise.')
    if (base.head === null) return setLog(`${base.name} est vide : pop lèverait une exception.`)
    const top = nodes[base.head]!
    setCopied(copied + base.size - 1)
    addVersion(
      { name: `v${versions.length}`, head: top.next, size: base.size - 1 },
      `${base.name}.pop() : aucun nœud créé. La nouvelle version pointe simplement vers le 2e nœud de ${base.name}.`,
    )
  }

  const reset = () => {
    setNodes([])
    setVersions([{ name: 'v0', head: null, size: 0 }])
    setSelected(0)
    setCopied(0)
    setLog('Réinitialisé.')
  }

  // Un nœud est partagé s'il apparaît dans plus d'une version.
  const uses = new Map<number, number>()
  for (const v of versions) for (const n of chain(v)) uses.set(n.id, (uses.get(n.id) ?? 0) + 1)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={push} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
          {base.name}.push(…)
        </button>
        <button type="button" onClick={pop} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
          {base.name}.pop()
        </button>
        <button type="button" onClick={reset} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-text">
          réinitialiser
        </button>
      </div>

      <div className="grid gap-1" role="radiogroup" aria-label="Versions de la pile">
        {versions.map((v, i) => (
          <button
            key={v.name}
            type="button"
            role="radio"
            aria-checked={selected === i}
            onClick={() => setSelected(i)}
            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left ${selected === i ? 'border-accent' : 'border-line/50 hover:border-line'}`}
          >
            <span className="w-8 font-code text-xs text-muted">{v.name}</span>
            <span className="flex flex-1 flex-wrap items-center gap-1">
              {chain(v).map((n) => (
                <span
                  key={n.id}
                  title={`nœud #${n.id}`}
                  className={`rounded border px-2 py-0.5 font-code text-xs ${(uses.get(n.id) ?? 0) > 1 ? 'border-accent text-text' : 'border-line text-muted'}`}
                >
                  {n.value}
                  <span className="ml-1 text-[10px] text-muted">#{n.id}</span>
                </span>
              ))}
              {v.size === 0 && <span className="font-code text-xs text-muted">vide</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <span>
          Nœuds alloués (partage) : <span className="font-code">{nodes.length}</span>
        </span>
        <span>
          Avec une copie complète à chaque opération : <span className="font-code">{copied}</span>
        </span>
      </div>

      <p role="status" className="text-sm">
        {log}
      </p>
    </div>
  )
}
