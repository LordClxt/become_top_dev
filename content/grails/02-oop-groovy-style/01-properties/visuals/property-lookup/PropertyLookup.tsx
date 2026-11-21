import { useState } from 'react'

export const id = 'grails-ch02-property-lookup'

// Résolution de `name` en Groovy 4 (comportements vérifiés sur Groovy 4.0.33).
type Receiver = 'map' | 'bean' | 'getprop' | 'get' | 'missing' | 'none'
type Place = 'outside' | 'inside' | 'closure'
type Step = 'map' | 'field' | 'getProperty' | 'accessor' | 'get' | 'propertyMissing' | 'error'

const RECEIVERS: { k: Receiver; label: string; code: string; hasField: boolean }[] = [
  { k: 'map', label: 'une Map', code: "def obj = [name: 'Ada']", hasField: false },
  { k: 'bean', label: 'champ + getter', code: "class Obj { String name = 'ada'; String getName() { 'ADA' } }", hasField: true },
  { k: 'getprop', label: 'champ + getProperty redéfini', code: "class Obj { String name = 'ada'; def getProperty(String n) { \"intercepté : $n\" } }", hasField: true },
  { k: 'get', label: 'get(String) seul', code: "class Obj { def get(String n) { \"get($n)\" } }", hasField: false },
  { k: 'missing', label: 'propertyMissing seul', code: "class Obj { def propertyMissing(String n) { \"absent : $n\" } }", hasField: false },
  { k: 'none', label: 'rien du tout', code: 'class Obj {}', hasField: false },
]

const PLACES: { k: Place; label: string; code: string }[] = [
  { k: 'outside', label: 'hors de la classe', code: 'obj.name' },
  { k: 'inside', label: 'dans une méthode de la classe', code: 'def m() { name }' },
  { k: 'closure', label: 'dans une closure de la classe', code: 'def m() { [1].collect { name }[0] }' },
]

const CHAIN: { k: Step; label: string }[] = [
  { k: 'map', label: '1. clé de la Map' },
  { k: 'field', label: 'corps de la classe : champ déclaré ici' },
  { k: 'getProperty', label: '2. getProperty(String) redéfini' },
  { k: 'accessor', label: '3. MetaClass : getter, sinon champ' },
  { k: 'get', label: '4. get(String)' },
  { k: 'propertyMissing', label: '5. propertyMissing(String)' },
  { k: 'error', label: 'MissingPropertyException' },
]

type Out = { winner: Step; tried: Step[]; result: string; why: string }

function resolve(r: (typeof RECEIVERS)[number], p: Place): Out {
  if (r.k === 'map') {
    return { winner: 'map', tried: ['map'], result: "'Ada'", why: 'Sur une Map, la clé gagne avant tout le reste, d’où que l’on lise. C’est aussi pour ça que map.class vaut null.' }
  }
  if (p === 'inside' && r.hasField) {
    return { winner: 'field', tried: ['field'], result: "'ada'", why: 'Dans le corps de la classe, un nom de champ déclaré ici est compilé en accès direct au champ : ni getter, ni getProperty.' }
  }
  const tried: Step[] = p === 'inside' ? ['field'] : []
  if (r.k === 'getprop') {
    return { winner: 'getProperty', tried: [...tried, 'getProperty'], result: "'intercepté : name'", why: 'getProperty redéfini intercepte tous les accès dynamiques, même à une propriété qui existe. La closure, classe à part, passe aussi par lui.' }
  }
  tried.push('getProperty')
  if (r.k === 'bean') {
    return {
      winner: 'accessor',
      tried: [...tried, 'accessor'],
      result: "'ADA'",
      why: p === 'closure'
        ? 'La closure est une autre classe : elle résout name par son owner, via la MetaClass, qui préfère le getter.'
        : 'Depuis l’extérieur, obj.name est un appel dynamique : la MetaClass l’envoie au getter.',
    }
  }
  tried.push('accessor')
  if (r.k === 'get') return { winner: 'get', tried: [...tried, 'get'], result: "'get(name)'", why: 'Aucune propriété name : Groovy essaie get(String), un dernier recours qui ne sert jamais quand la propriété existe.' }
  tried.push('get')
  if (r.k === 'missing') return { winner: 'propertyMissing', tried: [...tried, 'propertyMissing'], result: "'absent : name'", why: 'Rien n’a répondu : propertyMissing reçoit le nom. C’est le crochet des DSL et des propriétés dynamiques.' }
  return { winner: 'error', tried: [...tried, 'propertyMissing', 'error'], result: 'MissingPropertyException', why: 'Personne ne répond : Groovy lève MissingPropertyException avec le nom demandé.' }
}

export default function PropertyLookup() {
  const [receiver, setReceiver] = useState<Receiver>('bean')
  const [place, setPlace] = useState<Place>('outside')
  const r = RECEIVERS.find((x) => x.k === receiver)!
  const effectivePlace: Place = receiver === 'map' ? 'outside' : place
  const p = PLACES.find((x) => x.k === effectivePlace)!
  const out = resolve(r, effectivePlace)

  const pill = (active: boolean, disabled = false) =>
    `rounded-md border px-3 py-1.5 text-xs ${active ? 'border-accent text-text' : 'border-line text-muted hover:text-text'} ${disabled ? 'opacity-40' : ''}`

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-xs text-muted">L’objet</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Objet">
          {RECEIVERS.map((x) => (
            <button key={x.k} type="button" role="radio" aria-checked={receiver === x.k} onClick={() => setReceiver(x.k)} className={pill(receiver === x.k)}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="font-code text-xs text-muted [overflow-wrap:anywhere]">{r.code}</p>
      </div>

      <div className="grid gap-2">
        <span className="text-xs text-muted">D’où on lit name</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Endroit">
          {PLACES.map((x) => {
            const disabled = receiver === 'map' && x.k !== 'outside'
            return (
              <button
                key={x.k}
                type="button"
                role="radio"
                aria-checked={effectivePlace === x.k}
                disabled={disabled}
                onClick={() => setPlace(x.k)}
                className={pill(effectivePlace === x.k, disabled)}
              >
                {x.label}
              </button>
            )
          })}
        </div>
        <p className="font-code text-xs text-muted [overflow-wrap:anywhere]">{p.code}</p>
      </div>

      <ol className="grid gap-1.5" aria-label="Chaîne de résolution">
        {CHAIN.map((s) => {
          const tried = out.tried.includes(s.k)
          const win = out.winner === s.k
          return (
            <li
              key={s.k}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 font-code text-xs ${
                win ? 'border-accent bg-accent/10 text-text' : tried ? 'border-line text-muted line-through decoration-muted/60' : 'border-line/50 text-muted/50'
              }`}
            >
              <span>{s.label}</span>
              {win && <span className="shrink-0 text-accent">répond</span>}
              {tried && !win && <span className="shrink-0">passe</span>}
            </li>
          )
        })}
      </ol>

      <p className="text-sm">
        Résultat : <span className="font-code text-accent">{out.result}</span>
      </p>
      <p role="status" className="text-sm text-muted">{out.why}</p>
    </div>
  )
}
