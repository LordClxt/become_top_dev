import { useState } from 'react'

export const id = 'go-ch02-struct-literals'

type Field = { name: string; type: string; zero: string }

const BASE: Field[] = [
  { name: 'Name', type: 'string', zero: '""' },
  { name: 'Age', type: 'int', zero: '0' },
  { name: 'Pet', type: 'string', zero: '""' },
]
const EMAIL: Field = { name: 'Email', type: 'string', zero: '""' }
const TAGS: Field = { name: 'Tags', type: '[]string', zero: 'nil' }

/** Valeurs données par chaque littéral ; un champ absent prend sa valeur zéro. */
const POSITIONAL = ['"Julia"', '40', '"chat"']
const NAMED: Record<string, string> = { Name: '"Beth"', Age: '30' }

export default function StructLiterals() {
  const [email, setEmail] = useState(false)
  const [tags, setTags] = useState(false)
  const fields = [...BASE, ...(email ? [EMAIL] : []), ...(tags ? [TAGS] : [])]

  // Le littéral positionnel exige une valeur par champ, dans l'ordre.
  const positionalError = fields.length !== POSITIONAL.length
  const comparable = fields.every((f) => !f.type.startsWith('[]') && !f.type.startsWith('map'))

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2 text-sm" aria-label="Modifier la struct Person">
        <Toggle on={email} onClick={() => setEmail(!email)}>
          Ajouter le champ Email string
        </Toggle>
        <Toggle on={tags} onClick={() => setTags(!tags)}>
          Ajouter le champ Tags []string
        </Toggle>
      </div>

      <pre className="font-code text-xs leading-relaxed">
        {'type Person struct {\n'}
        {fields.map((f) => (
          <span key={f.name} className={f === EMAIL || f === TAGS ? 'text-accent' : ''}>
            {`    ${f.name.padEnd(5)} ${f.type}\n`}
          </span>
        ))}
        {'}'}
      </pre>

      <div className="grid gap-4 md:grid-cols-2">
        <Literal
          title="Littéral positionnel"
          code={'julia := Person{"Julia", 40, "chat"}'}
          error={positionalError ? 'erreur de compilation : too few values in struct literal of type Person' : null}
          fields={fields}
          value={(_f, i) => POSITIONAL[i] ?? null}
        />
        <Literal
          title="Littéral nommé"
          code={'beth := Person{Name: "Beth", Age: 30}'}
          error={null}
          fields={fields}
          value={(f) => NAMED[f.name] ?? null}
        />
      </div>

      <div className="border-t border-line pt-5">
        <pre className="font-code text-xs">fmt.Println(julia == beth)</pre>
        <p className={`mt-2 font-code text-xs ${comparable && !positionalError ? 'text-pass' : 'text-fail'}`}>
          {!comparable
            ? 'erreur de compilation : invalid operation: julia == beth (struct containing []string cannot be compared)'
            : positionalError
              ? 'ne compile pas : julia n’existe pas tant que son littéral est faux'
              : 'false : les champs sont comparés un par un'}
        </p>
      </div>
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 ${on ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
    >
      {children}
    </button>
  )
}

function Literal({
  title,
  code,
  error,
  fields,
  value,
}: {
  title: string
  code: string
  error: string | null
  fields: Field[]
  value: (f: Field, i: number) => string | null
}) {
  return (
    <div className="rounded-md border border-line bg-surface-2/40 p-3">
      <p className="text-xs text-muted">{title}</p>
      <pre className="mt-1 font-code text-xs whitespace-pre-wrap">{code}</pre>
      {error ? (
        <p className="mt-3 font-code text-xs text-fail">{error}</p>
      ) : (
        <dl className="mt-3 grid gap-1">
          {fields.map((f, i) => {
            const v = value(f, i)
            return (
              <div key={f.name} className="flex justify-between gap-3 rounded bg-surface px-2 py-1 font-code text-xs">
                <dt className="text-muted">{f.name}</dt>
                <dd className={v ? 'text-text' : 'text-muted'}>{v ?? `${f.zero} (zéro)`}</dd>
              </div>
            )
          })}
        </dl>
      )}
    </div>
  )
}
