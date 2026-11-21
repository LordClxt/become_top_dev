import { useState } from 'react'

export const id = 'grails-ch02-dispatch'

// Choix de surcharge pour notifier.on(e) selon le mode de compilation (vérifié sur Groovy 4.0.33 et Java).
type Value = 'closed' | 'assigned' | 'urgent' | 'null'
type Origin = 'local' | 'param' | 'list'
type Mode = 'java' | 'groovy' | 'static'
type Overload = 'on(Object)' | 'on(Event)' | 'on(TicketClosed)' | 'on(TicketAssigned)'

const OVERLOADS: Overload[] = ['on(Object)', 'on(Event)', 'on(TicketClosed)', 'on(TicketAssigned)']

const VALUES: { k: Value; label: string; code: string; closest: Overload | null }[] = [
  { k: 'closed', label: 'TicketClosed', code: 'new TicketClosed()', closest: 'on(TicketClosed)' },
  { k: 'assigned', label: 'TicketAssigned', code: 'new TicketAssigned()', closest: 'on(TicketAssigned)' },
  { k: 'urgent', label: 'Urgent (extends TicketAssigned)', code: 'new Urgent()', closest: 'on(TicketAssigned)' },
  { k: 'null', label: 'null', code: 'null', closest: null },
]

const ORIGINS: { k: Origin; label: string }[] = [
  { k: 'local', label: 'variable locale initialisée ici' },
  { k: 'param', label: 'paramètre de méthode' },
  { k: 'list', label: 'élément d’une List<Event>' },
]

const MODES: { k: Mode; label: string }[] = [
  { k: 'java', label: 'Java' },
  { k: 'groovy', label: 'Groovy dynamique' },
  { k: 'static', label: 'Groovy @CompileStatic' },
]

function codeFor(o: Origin, v: (typeof VALUES)[number]): string {
  if (o === 'local') return `Event e = ${v.code}; notifier.on(e)`
  if (o === 'param') return `void handle(Event e) { notifier.on(e) }   // appelé avec ${v.code}`
  return `events.each { Event e -> notifier.on(e) }   // la liste contient ${v.code}`
}

function choose(v: (typeof VALUES)[number], o: Origin, m: Mode): { pick: Overload; why: string } {
  if (m === 'groovy') {
    if (v.closest === null) return { pick: 'on(Object)', why: 'null n’a pas de type réel : Groovy choisit sans prévenir, ici la surcharge la plus générale. Java aurait suivi le type déclaré.' }
    return {
      pick: v.closest,
      why: v.k === 'urgent'
        ? 'Pas de on(Urgent) : Groovy remonte la hiérarchie de la classe réelle et prend la surcharge la plus proche.'
        : 'Le choix se fait à l’exécution, sur la classe réelle de l’objet : la façon dont la variable est déclarée ne compte pas.',
    }
  }
  if (m === 'static' && o === 'local') {
    if (v.closest === null) return { pick: 'on(Event)', why: 'Event e = null : rien à inférer de plus précis, le compilateur garde Event.' }
    return { pick: v.closest, why: '@CompileStatic fait de l’inférence par flux : il voit l’affectation juste au-dessus et retient sa classe, malgré la déclaration Event. Le choix reste fait à la compilation.' }
  }
  return {
    pick: 'on(Event)',
    why: m === 'java'
      ? 'Java choisit à la compilation, d’après le type déclaré Event, quelle que soit la valeur réelle.'
      : 'La valeur arrive de l’extérieur (paramètre, collection) : à la compilation, seul le type déclaré Event est connu. Tous les événements partent vers on(Event).',
  }
}

export default function Dispatch() {
  const [value, setValue] = useState<Value>('closed')
  const [origin, setOrigin] = useState<Origin>('list')
  const [mode, setMode] = useState<Mode>('groovy')
  const v = VALUES.find((x) => x.k === value)!
  const out = choose(v, origin, mode)

  const pill = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-xs ${active ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`

  const group = <T extends string>(label: string, items: { k: T; label: string }[], current: T, set: (k: T) => void) => (
    <div className="grid gap-2">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {items.map((x) => (
          <button key={x.k} type="button" role="radio" aria-checked={current === x.k} onClick={() => set(x.k)} className={pill(current === x.k)}>
            {x.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="grid gap-4">
      {group('Mode de compilation', MODES, mode, setMode)}
      {group('D’où vient e (déclaré Event)', ORIGINS, origin, setOrigin)}
      {group('Classe réelle de la valeur', VALUES, value, setValue)}

      <p className="font-code text-xs text-muted [overflow-wrap:anywhere]">{codeFor(origin, v)}</p>

      <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Surcharges de on">
        {OVERLOADS.map((ov) => {
          const win = out.pick === ov
          return (
            <li key={ov} className={`rounded-lg border px-3 py-2 font-code text-xs ${win ? 'border-accent bg-accent/10 text-text' : 'border-line text-muted'}`}>
              {ov}
              {win && <span className="ml-2 text-accent">← appelée</span>}
            </li>
          )
        })}
      </ul>

      <p role="status" className="text-sm text-muted">{out.why}</p>
    </div>
  )
}
