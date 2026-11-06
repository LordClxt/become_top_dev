import { useState } from 'react'

export const id = 'java-ch02-equals-relations'

type Obj = { name: string; kind: 'point' | 'color'; color?: 'rouge' | 'bleu' }
const OBJECTS: Obj[] = [
  { name: 'rouge(1,2)', kind: 'color', color: 'rouge' },
  { name: 'point(1,2)', kind: 'point' },
  { name: 'bleu(1,2)', kind: 'color', color: 'bleu' },
]

type Variant = 'strict' | 'blind' | 'composition'
const VARIANTS: { id: Variant; label: string; code: string }[] = [
  {
    id: 'strict',
    label: 'ColorPoint extends Point, exige un ColorPoint',
    code: 'o instanceof ColorPoint cp && super.equals(o) && cp.color == color',
  },
  {
    id: 'blind',
    label: 'ColorPoint extends Point, sans couleur face à un Point',
    code: 'if (!(o instanceof ColorPoint)) return o.equals(this);  // sinon : position + couleur',
  },
  {
    id: 'composition',
    label: 'ColorPoint contient un Point (composition)',
    code: 'o instanceof ColorPoint cp && cp.point.equals(point) && cp.color == color',
  },
]

// Toutes les positions sont égales ici : seule la logique de type et de couleur décide.
function equals(variant: Variant, x: Obj, y: Obj): boolean {
  if (x === y) return true
  if (x.kind === 'point') {
    // Point.equals : instanceof Point. Avec la composition, un ColorPoint n'est plus un Point.
    return variant === 'composition' ? y.kind === 'point' : true
  }
  if (variant === 'strict' || variant === 'composition') return y.kind === 'color' && x.color === y.color
  // blind : face à un Point, on délègue à Point.equals (qui ignore la couleur)
  if (y.kind === 'point') return true
  return x.color === y.color
}

export default function EqualsRelations() {
  const [variant, setVariant] = useState<Variant>('strict')
  const m = OBJECTS.map((x) => OBJECTS.map((y) => equals(variant, x, y)))

  const asym = new Set<string>()
  const intrans = new Set<string>()
  const problems: string[] = []
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      if (m[i]![j] !== m[j]![i] && i < j) {
        asym.add(`${i}-${j}`)
        asym.add(`${j}-${i}`)
        problems.push(`Symétrie : ${OBJECTS[i]!.name}.equals(${OBJECTS[j]!.name}) = ${m[i]![j]} mais l'inverse = ${m[j]![i]}.`)
      }
      for (let k = 0; k < 3; k++)
        if (i !== k && m[i]![j] && m[j]![k] && !m[i]![k] && i !== j && j !== k && i < k) {
          intrans.add(`${i}-${k}`)
          problems.push(
            `Transitivité : ${OBJECTS[i]!.name} = ${OBJECTS[j]!.name} et ${OBJECTS[j]!.name} = ${OBJECTS[k]!.name}, mais ${OBJECTS[i]!.name} ≠ ${OBJECTS[k]!.name}.`,
          )
        }
    }

  const current = VARIANTS.find((v) => v.id === variant)!

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Implémentation d'equals">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={variant === v.id}
            onClick={() => setVariant(v.id)}
            className={`rounded-md border px-3 py-1.5 ${variant === v.id ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="font-code text-xs text-muted">{current.code}</p>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-normal text-muted">x.equals(y)</th>
              {OBJECTS.map((o) => (
                <th key={o.name} className="px-2 py-1 font-code font-normal text-muted">
                  {o.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OBJECTS.map((x, i) => (
              <tr key={x.name}>
                <th className="px-2 py-1 text-left font-code font-normal text-muted">{x.name}</th>
                {OBJECTS.map((y, j) => {
                  const bad = asym.has(`${i}-${j}`) || intrans.has(`${i}-${j}`)
                  return (
                    <td
                      key={y.name}
                      className={`min-w-[5.5rem] rounded-md border px-2 py-2 text-center font-code ${
                        bad ? 'border-fail/60 bg-fail/10 text-text' : m[i]![j] ? 'border-accent/50 text-text' : 'border-line text-muted'
                      }`}
                    >
                      {String(m[i]![j])}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div role="status" className="grid gap-1 text-sm">
        {problems.length === 0 ? (
          <p>
            Aucune violation : la relation est réflexive, symétrique et transitive. Pour comparer les positions, on écrit
            explicitement <span className="font-code text-xs">rouge.asPoint().equals(point)</span>.
          </p>
        ) : (
          problems.map((p) => (
            <p key={p} className="text-text">
              {p}
            </p>
          ))
        )}
      </div>
    </div>
  )
}
