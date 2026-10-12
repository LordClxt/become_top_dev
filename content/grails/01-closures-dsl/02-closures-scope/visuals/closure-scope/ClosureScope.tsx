import { useState } from 'react'

export const id = 'grails-ch01-closure-scope'

type Strategy = 'OWNER_FIRST' | 'DELEGATE_FIRST' | 'OWNER_ONLY' | 'DELEGATE_ONLY'
type Member = 'name' | 'greet()' | 'version'

const STRATEGIES: { value: Strategy; order: ('owner' | 'delegate')[]; note: string }[] = [
  { value: 'OWNER_FIRST', order: ['owner', 'delegate'], note: 'Défaut de Groovy : l’owner passe avant.' },
  { value: 'DELEGATE_FIRST', order: ['delegate', 'owner'], note: 'Celle des DSL : le builder passe avant.' },
  { value: 'OWNER_ONLY', order: ['owner'], note: 'Le delegate est ignoré.' },
  { value: 'DELEGATE_ONLY', order: ['delegate'], note: 'L’owner est ignoré.' },
]
const MEMBERS: Member[] = ['name', 'greet()', 'version']

function Box({ title, subtitle, owned, onToggle }: { title: string; subtitle: string; owned: Set<Member>; onToggle: (m: Member) => void }) {
  return (
    <fieldset className="rounded-md border border-line px-3 py-2">
      <legend className="px-1 text-xs text-muted">{title}</legend>
      <p className="mb-2 text-xs text-muted">{subtitle}</p>
      <div className="flex flex-wrap gap-3">
        {MEMBERS.map((m) => (
          <label key={m} className="flex items-center gap-1.5 font-code text-sm">
            <input type="checkbox" checked={owned.has(m)} onChange={() => onToggle(m)} />
            {m}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function ClosureScope() {
  const [strategy, setStrategy] = useState<Strategy>('OWNER_FIRST')
  const [wanted, setWanted] = useState<Member>('name')
  const [owner, setOwner] = useState<Set<Member>>(new Set(['name']))
  const [delegate, setDelegate] = useState<Set<Member>>(new Set(['name', 'greet()']))

  const toggle = (set: Set<Member>, setter: (s: Set<Member>) => void) => (m: Member) => {
    const next = new Set(set)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    setter(next)
  }

  const spec = STRATEGIES.find((s) => s.value === strategy)!
  const sets = { owner, delegate }
  const steps: { who: 'owner' | 'delegate'; found: boolean }[] = []
  let winner: 'owner' | 'delegate' | null = null
  for (const who of spec.order) {
    const found = sets[who].has(wanted)
    steps.push({ who, found })
    if (found) {
      winner = who
      break
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Box title="owner" subtitle="L’objet qui contient la closure (ne change jamais)" owned={owner} onToggle={toggle(owner, setOwner)} />
        <Box title="delegate" subtitle="L’objet vers lequel on redirige (modifiable)" owned={delegate} onToggle={toggle(delegate, setDelegate)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs text-muted">resolveStrategy</span>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as Strategy)}
            className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-sm"
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">{spec.note}</span>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs text-muted">Le code de la closure utilise…</span>
          <select
            value={wanted}
            onChange={(e) => setWanted(e.target.value as Member)}
            className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-sm"
          >
            {MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="grid gap-2" aria-label="Ordre de recherche">
        {steps.map((s, i) => (
          <li
            key={s.who}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              s.found ? 'border-pass/50 bg-pass/15' : 'border-line'
            }`}
          >
            <span>
              <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
              on cherche <span className="font-code">{wanted}</span> dans le <strong>{s.who}</strong>
            </span>
            <span className={s.found ? 'text-pass' : 'text-muted'}>{s.found ? 'trouvé' : 'absent'}</span>
          </li>
        ))}
      </ol>

      <p
        className={`rounded-md border px-3 py-2 text-sm ${winner ? 'border-accent/40 bg-accent/10' : 'border-fail/40 bg-fail/10'}`}
        role="status"
      >
        {winner ? (
          <>
            Résultat : c’est le <strong>{winner}</strong> qui répond à <span className="font-code">{wanted}</span>.
          </>
        ) : (
          <>
            Résultat : <span className="font-code">MissingMethodException / MissingPropertyException</span>, personne ne connaît{' '}
            <span className="font-code">{wanted}</span>.
          </>
        )}
      </p>
    </div>
  )
}
