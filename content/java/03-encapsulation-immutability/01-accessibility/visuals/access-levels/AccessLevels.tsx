import { useState } from 'react'

export const id = 'java-ch03-access-levels'

type Level = 'private' | 'package' | 'protected' | 'public'
const LEVELS: { id: Level; code: string }[] = [
  { id: 'private', code: 'private' },
  { id: 'package', code: '(aucun)' },
  { id: 'protected', code: 'protected' },
  { id: 'public', code: 'public' },
]

type Place = { name: string; where: string; rank: number }
// rank : niveau minimal qui donne l'accès (0 = private suffit … 3 = il faut public)
const PLACES: Place[] = [
  { name: 'Catalog (et ses classes imbriquées)', where: 'catalog', rank: 0 },
  { name: 'CatalogTest', where: 'catalog (tests)', rank: 1 },
  { name: 'Importer', where: 'catalog', rank: 1 },
  { name: 'PromoCatalog extends Catalog', where: 'promo', rank: 2 },
  { name: 'Checkout', where: 'shop', rank: 3 },
]

const ORDER: Level[] = ['private', 'package', 'protected', 'public']

export default function AccessLevels() {
  const [level, setLevel] = useState<Level>('private')
  const rank = ORDER.indexOf(level)
  const exported = rank >= 2

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Niveau d'accès du champ index">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={level === l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-md border px-3 py-1.5 font-code text-xs ${level === l.id ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {l.code}
          </button>
        ))}
      </div>

      <p className="font-code text-xs text-muted">
        {LEVELS[rank]!.code === '(aucun)' ? '' : LEVELS[rank]!.code + ' '}PriceIndex index; <span className="text-muted">// dans catalog.Catalog</span>
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        {PLACES.map((p) => {
          const ok = rank >= p.rank
          return (
            <div
              key={p.name}
              className={`rounded-md border px-3 py-2 text-sm ${ok ? 'border-accent/60 text-text' : 'border-line/50 text-muted'}`}
            >
              <p className="font-code text-xs">{p.name}</p>
              <p className="text-xs text-muted">paquetage {p.where}</p>
              <p className="mt-1 text-xs">{ok ? 'voit le champ' : 'ne le voit pas'}</p>
            </div>
          )
        })}
      </div>

      <p role="status" className={`text-sm ${exported ? 'text-text' : ''}`}>
        {exported
          ? `Le champ fait maintenant partie de l'API exportée : du code que tu ne connais pas (${rank === 2 ? 'toute sous-classe, dans n’importe quel paquetage' : 'tout le monde'}) peut en dépendre. Tu dois le maintenir à vie.`
          : rank === 1
            ? 'Visible dans tout le paquetage, y compris les tests, mais toujours un détail d’implémentation : tu peux le changer à la prochaine version.'
            : 'Le niveau le plus fermé : seul Catalog (et ses classes imbriquées) y accède. Libre de changer à tout moment.'}
      </p>
    </div>
  )
}
