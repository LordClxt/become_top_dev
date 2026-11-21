import { useState } from 'react'

export const id = 'grails-ch02-trait-stack'

// Chaînage de save() à travers des traits qui appellent super (règles vérifiées sur Groovy 4.0.33).
type TraitK = 'Persistent' | 'Timestamped' | 'Audited' | 'Validated'

const TRAITS: Record<TraitK, { code: string; callsSuper: boolean; word: string }> = {
  Persistent: { code: "String save() { 'save' }", callsSuper: false, word: 'save' },
  Timestamped: { code: "String save() { touch(); 'horodaté > ' + super.save() }", callsSuper: true, word: 'horodaté' },
  Audited: { code: "String save() { 'audité > ' + super.save() }", callsSuper: true, word: 'audité' },
  Validated: { code: "String save() { if (!valid()) return 'refusé'; 'validé > ' + super.save() }", callsSuper: true, word: 'validé' },
}

const ALL: TraitK[] = ['Persistent', 'Timestamped', 'Audited', 'Validated']

export default function TraitStack() {
  const [order, setOrder] = useState<TraitK[]>(['Persistent', 'Timestamped', 'Audited'])
  const [classOverride, setClassOverride] = useState(false)

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setOrder(next)
  }
  const toggle = (t: TraitK) => setOrder(order.includes(t) ? order.filter((x) => x !== t) : [...order, t])

  // Exécution : le dernier trait déclaré s'exécute d'abord ; super remonte vers la gauche, puis la classe mère.
  const chain: string[] = []
  let result = ''
  if (classOverride) {
    chain.push('Ticket.save()  (écrite dans la classe : elle gagne sur tous les traits)')
    result = "'à la main'"
  } else {
    const words: string[] = []
    let stopped = false
    for (let i = order.length - 1; i >= 0; i--) {
      const t = order[i]!
      chain.push(`${t}.save()`)
      words.push(TRAITS[t].word)
      if (!TRAITS[t].callsSuper) { stopped = true; break }
    }
    if (!stopped) {
      chain.push('Object : pas de save()  →  MissingMethodException')
      result = 'erreur : aucun trait ne termine la chaîne'
    } else {
      result = `'${words.join(' > ')}'`
    }
  }

  const btn = 'rounded border border-line px-1.5 text-xs text-muted hover:text-text disabled:opacity-30'

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" aria-label="Traits disponibles">
        {ALL.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={order.includes(t)}
            onClick={() => toggle(t)}
            className={`rounded-md border px-3 py-1.5 font-code text-xs ${order.includes(t) ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {t}
          </button>
        ))}
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={classOverride} onChange={(e) => setClassOverride(e.target.checked)} />
          la classe écrit son propre save()
        </label>
      </div>

      <div className="rounded-xl border border-line bg-surface p-3 font-code text-xs">
        <div className="mb-2 text-muted">class Ticket implements</div>
        <ol className="flex flex-wrap items-center gap-2">
          {order.map((t, i) => (
            <li key={t} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1">
              <button type="button" className={btn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`déplacer ${t} à gauche`}>←</button>
              <span className="text-text">{t}</span>
              <button type="button" className={btn} onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`déplacer ${t} à droite`}>→</button>
              {i < order.length - 1 && <span className="text-muted">,</span>}
            </li>
          ))}
          {order.length === 0 && <li className="text-muted">(aucun trait)</li>}
        </ol>
      </div>

      <div className="grid gap-1.5" aria-label="Chaîne d'appels de save()">
        <span className="text-xs text-muted">ticket.save() exécute, dans l’ordre :</span>
        {chain.map((c, i) => (
          <div key={i} className="flex items-center gap-2 font-code text-xs" style={{ paddingLeft: `${i * 14}px` }}>
            <span className="text-accent">{i === 0 ? '▸' : '↳ super'}</span>
            <span className={c.includes('Missing') ? 'text-fail' : 'text-text'}>{c}</span>
          </div>
        ))}
      </div>

      <ul className="grid gap-1 text-xs text-muted">
        {order.map((t) => (
          <li key={t} className="font-code [overflow-wrap:anywhere]">
            trait {t} {'{'} {TRAITS[t].code} {'}'}
          </li>
        ))}
      </ul>

      <p role="status" className="text-sm">
        Résultat : <span className="font-code text-accent">{result}</span>
      </p>
    </div>
  )
}
