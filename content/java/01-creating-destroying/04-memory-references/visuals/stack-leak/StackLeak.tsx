import { useState } from 'react'

export const id = 'java-ch01-stack-leak'

const CAPACITY = 8
const NAMES = ['commande#1', 'commande#2', 'commande#3', 'commande#4', 'commande#5', 'commande#6', 'commande#7', 'commande#8']

type State = { slots: (string | null)[]; size: number; created: string[]; log: string }

const initial: State = { slots: Array(CAPACITY).fill(null), size: 0, created: [], log: 'Pile vide. Empile quelques commandes.' }

export default function StackLeak() {
  const [fixed, setFixed] = useState(false)
  const [state, setState] = useState<State>(initial)
  const { slots, size, created } = state

  const push = () =>
    setState((s) => {
      if (s.size === CAPACITY) return { ...s, log: 'Tableau plein (capacité 8 dans cette démo).' }
      const name = NAMES[s.created.length % NAMES.length]!
      const next = [...s.slots]
      next[s.size] = name
      return {
        slots: next,
        size: s.size + 1,
        created: s.created.includes(name) ? s.created : [...s.created, name],
        log: `push : elements[${s.size}] = ${name}, size = ${s.size + 1}.`,
      }
    })

  const pop = () =>
    setState((s) => {
      if (s.size === 0) return { ...s, log: 'Pile vide : pop lèverait EmptyStackException.' }
      const i = s.size - 1
      const next = [...s.slots]
      const value = next[i]
      if (fixed) next[i] = null
      return {
        ...s,
        slots: next,
        size: i,
        log: fixed
          ? `pop : renvoie ${value}, puis elements[${i}] = null. Le client a fini avec ${value} : plus rien ne le retient.`
          : `pop : renvoie ${value} et fait juste size = ${i}. La case ${i} pointe toujours vers ${value}.`,
      }
    })

  // Un objet est accessible tant qu'une case du tableau le référence (le client, lui, l'a lâché après pop).
  const status = (name: string) => {
    const at = slots.indexOf(name)
    if (at === -1) return 'gc'
    return at < size ? 'live' : 'leak'
  }
  const leaked = created.filter((n) => status(n) === 'leak').length

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={push} className="rounded-md border border-line px-3 py-1.5 hover:border-accent">
          push
        </button>
        <button type="button" onClick={pop} className="rounded-md border border-line px-3 py-1.5 hover:border-accent">
          pop
        </button>
        <button type="button" onClick={() => setState(initial)} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-text">
          Recommencer
        </button>
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          <span className="font-code text-xs">elements[size] = null;</span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">
          Object[] elements · size = <span className="font-code text-text">{size}</span> (les cases à gauche du trait sont la partie active)
        </p>
        <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Tableau interne de la pile">
          {slots.map((v, i) => (
            <div
              key={i}
              className={`min-w-[5.5rem] rounded-md border px-2 py-2 text-center font-code text-xs ${
                i === size ? 'border-l-4 border-l-accent' : ''
              } ${i < size ? 'border-line text-text' : v ? 'border-fail/60 bg-fail/10 text-text' : 'border-line/50 text-muted'}`}
            >
              <div className="text-[10px] text-muted">[{i}]</div>
              {v ?? 'null'}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-3">
        {(['live', 'leak', 'gc'] as const).map((kind) => (
          <div key={kind} className="rounded-md border border-line px-3 py-2">
            <p className="text-xs text-muted">
              {kind === 'live' ? 'Dans la pile (utilisés)' : kind === 'leak' ? 'Dépilés mais retenus (fuite)' : 'Récupérables par le GC'}
            </p>
            <p className="mt-1 font-code text-xs">
              {created.filter((n) => status(n) === kind).join(', ') || '—'}
            </p>
          </div>
        ))}
      </div>

      <p role="status" className="text-sm">
        {state.log}
        {leaked > 0 && !fixed && (
          <span className="text-muted"> {leaked} objet(s) inutile(s) mais vivant(s) : avec de gros objets, c'est l'OutOfMemoryError à terme.</span>
        )}
      </p>
    </div>
  )
}
