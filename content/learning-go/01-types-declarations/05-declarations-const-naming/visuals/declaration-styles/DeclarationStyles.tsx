import { useState } from 'react'

export const id = 'go-ch01-declaration-styles'

type Where = 'func' | 'package'
type What = 'zero' | 'default' | 'other' | 'result' | 'constant'

const WHERE: { key: Where; label: string }[] = [
  { key: 'func', label: 'Dans une fonction' },
  { key: 'package', label: 'Au niveau du package' },
]

const WHAT: { key: What; label: string }[] = [
  { key: 'zero', label: 'Je veux la valeur zéro' },
  { key: 'default', label: 'Un littéral du type par défaut (42, 3.14, "go")' },
  { key: 'other', label: 'Un littéral d’un autre type (un byte, un float32)' },
  { key: 'result', label: 'Le résultat d’un appel ou d’une expression' },
  { key: 'constant', label: 'Un nom pour une valeur fixe, connue à la compilation' },
]

function advise(where: Where, what: What): { code: string; why: string } {
  if (what === 'constant')
    return {
      code: 'const maxRetries = 3',
      why: 'Une constante donne un nom à un littéral. Laisse-la non typée pour qu’elle s’adapte à son contexte. Rien d’autre n’est immuable en Go.',
    }
  if (where === 'package') {
    const code = {
      zero: 'var total int',
      default: 'var port = 8080',
      other: 'var ratio float32 = 0.5',
      result: 'var logger = newLogger()',
    }[what]
    return {
      code,
      why: '`:=` est interdit hors d’une fonction : on utilise var. Et garde le niveau package pour ce qui ne change pas : une variable modifiable partagée complique le suivi des données.',
    }
  }
  return {
    zero: {
      code: 'var total int',
      why: 'La forme var sans valeur dit « zéro, et c’est voulu ». `total := 0` est légal, mais moins explicite.',
    },
    default: {
      code: 'count := 10',
      why: 'C’est le cas courant : `:=` avec déduction de type. 10 est un int par défaut, c’est ce qu’on veut.',
    },
    other: {
      code: 'var flags byte = 20',
      why: 'Le littéral 20 serait un int. Pour un autre type, la forme longue `var x T = v` est idiomatique (plutôt que `x := byte(20)`).',
    },
    result: {
      code: 'user, err := lookup(id)',
      why: 'Le type vient de la fonction. `:=` convient, et il accepte de réutiliser une variable existante si une autre est nouvelle. Attention à ne pas créer une nouvelle `err` sans le vouloir.',
    },
  }[what as Exclude<What, 'constant'>]
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-xs text-muted">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.key}
          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            value === o.key ? 'border-accent' : 'border-line hover:border-muted'
          }`}
        >
          <input type="radio" name={legend} checked={value === o.key} onChange={() => onChange(o.key)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export default function DeclarationStyles() {
  const [where, setWhere] = useState<Where>('func')
  const [what, setWhat] = useState<What>('zero')
  const advice = advise(where, what)

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Choice legend="Où déclares-tu ?" options={WHERE} value={where} onChange={setWhere} />
        <Choice legend="Que veux-tu stocker ?" options={WHAT} value={what} onChange={setWhat} />
      </div>
      <div className="grid gap-2 rounded-md border border-accent/40 bg-accent/10 p-4" role="status">
        <span className="text-xs text-muted">Déclaration conseillée</span>
        <code className="font-code text-base">{advice.code}</code>
        <p className="text-sm">{advice.why}</p>
      </div>
    </div>
  )
}
