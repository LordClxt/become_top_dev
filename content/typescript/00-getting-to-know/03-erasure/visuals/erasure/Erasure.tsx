import { useState } from 'react'

export const id = 'ts-ch00-erasure'

/** Un morceau de code : `erased` = disparaît quand les types sont effacés. */
type Chunk = { text: string; erased?: boolean }
type Example = { label: string; code: Chunk[]; result: string; note: string }

const EXAMPLES: Example[] = [
  {
    label: 'Annotations',
    code: [
      { text: 'function greet(who' },
      { text: ': string', erased: true },
      { text: ') {\n  console.log("Bonjour", who);\n}\n' },
    ],
    result: 'Le JavaScript ne contient plus que la fonction : « : string » a disparu.',
    note: 'Les annotations sont de la syntaxe réservée à TypeScript.',
  },
  {
    label: 'Interface et alias',
    code: [
      { text: 'interface Square { width: number }\n', erased: true },
      { text: 'type Shape = Square | Rectangle;\n\n', erased: true },
      { text: 'function area(s' },
      { text: ': Shape', erased: true },
      { text: ') {\n  return s.width ** 2;\n}\n' },
    ],
    result: 'interface et type disparaissent entièrement : on ne peut pas les tester avec instanceof.',
    note: 'Ils ne créent qu’un type, aucune valeur.',
  },
  {
    label: 'Assertion as',
    code: [
      { text: 'function asNumber(val' },
      { text: ': number | string', erased: true },
      { text: ')' },
      { text: ': number', erased: true },
      { text: ' {\n  return val' },
      { text: ' as number', erased: true },
      { text: ';\n}\n' },
    ],
    result: 'Il reste « return val » : aucune conversion. asNumber("42") renvoie toujours la chaîne.',
    note: '`as` est une opération de type, elle ne change pas la valeur.',
  },
  {
    label: 'Classe',
    code: [
      { text: 'class Rectangle {\n  width' },
      { text: ': number', erased: true },
      { text: ';\n  constructor(width' },
      { text: ': number', erased: true },
      { text: ') {\n    this.width = width;\n  }\n}\n\nconst r = new Rectangle(2);\nconsole.log(r instanceof Rectangle);\n' },
    ],
    result: 'La classe reste : elle crée un type ET une valeur, donc instanceof fonctionne.',
    note: '`class` est l’une des rares constructions à exister dans les deux mondes.',
  },
]

export default function Erasure() {
  const [index, setIndex] = useState(0)
  const [erased, setErased] = useState(false)
  const ex = EXAMPLES[index]!

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.label}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-md border px-3 py-1 text-sm ${i === index ? 'border-accent text-text' : 'border-line text-muted'}`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={erased} onChange={() => setErased((v) => !v)} />
        Compiler : effacer les types
      </label>

      <div className="grid gap-2 rounded-md border border-line p-3">
        <p className="text-xs text-muted">{erased ? 'JavaScript exécuté' : 'TypeScript écrit'}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap font-code text-xs leading-5">
          {ex.code.map((c, i) =>
            c.erased ? (
              erased ? null : (
                <span key={i} className="rounded bg-fail/15 text-fail">
                  {c.text}
                </span>
              )
            ) : (
              <span key={i}>{c.text}</span>
            ),
          )}
        </pre>
      </div>

      <p className="text-sm">{erased ? ex.result : 'En rouge : ce que le compilateur va supprimer.'}</p>
      <p className="text-xs text-muted">{ex.note}</p>
    </div>
  )
}
