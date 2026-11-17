import { useState } from 'react'

export const id = 'java-ch00-sealed-switch'

type Variant = { name: string; components: string; label: string }

const VARIANTS: Variant[] = [
  { name: 'Approved', components: 'String authCode, long amountCents', label: '"payé " + a.amountCents()' },
  { name: 'Declined', components: 'String reason, boolean retryable', label: '"refusé : " + d.reason()' },
  { name: 'Pending', components: 'String redirectUrl', label: '"en attente"' },
  { name: 'Refunded', components: 'long amountCents', label: '"remboursé"' },
]

const varName = (v: Variant) => v.name[0]!.toLowerCase()

export default function SealedSwitch() {
  // Variantes déclarées dans permits, et cases écrits dans le switch.
  const [declared, setDeclared] = useState<Set<string>>(new Set(['Approved', 'Declined', 'Pending']))
  const [cases, setCases] = useState<Set<string>>(new Set(['Approved', 'Declined', 'Pending']))
  const [useDefault, setUseDefault] = useState(false)

  const flip = (set: Set<string>, k: string) => {
    const n = new Set(set)
    n.has(k) ? n.delete(k) : n.add(k)
    return n
  }

  const permitted = VARIANTS.filter((v) => declared.has(v.name))
  const missing = permitted.filter((v) => !cases.has(v.name))
  const unknownCase = VARIANTS.filter((v) => cases.has(v.name) && !declared.has(v.name))
  const compiles = permitted.length > 0 && unknownCase.length === 0 && (missing.length === 0 || useDefault)

  let verdict: string
  if (permitted.length === 0) verdict = 'error: un type scellé doit avoir au moins un sous-type permis.'
  else if (unknownCase.length > 0)
    verdict = `error: ${unknownCase[0]!.name} n’est pas un sous-type de PaymentResult (absent de permits) : ce case ne compile pas.`
  else if (missing.length > 0 && !useDefault)
    verdict = `error: the switch expression does not cover all possible input values. Il manque ${missing.map((v) => v.name).join(', ')}.`
  else if (missing.length > 0)
    verdict = `Compile, mais le default avale ${missing.map((v) => v.name).join(', ')} en silence : le jour où une variante arrive, le compilateur ne te dit plus rien.`
  else verdict = 'Compile : chaque variante permise a son case, sans default. Ajoute une variante et ce switch cassera, exactement là où il faut.'

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-xs text-muted">Variantes dans permits (le type somme)</span>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((v) => (
            <button
              key={v.name}
              type="button"
              aria-pressed={declared.has(v.name)}
              onClick={() => setDeclared(flip(declared, v.name))}
              className={`rounded-md border px-3 py-1.5 font-code text-xs ${declared.has(v.name) ? 'border-accent text-accent' : 'border-line text-muted hover:text-text'}`}
            >
              {v.name}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">Cases écrits dans le switch</span>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((v) => (
            <button
              key={v.name}
              type="button"
              aria-pressed={cases.has(v.name)}
              onClick={() => setCases(flip(cases, v.name))}
              className={`rounded-md border px-3 py-1.5 font-code text-xs ${cases.has(v.name) ? 'border-accent text-accent' : 'border-line text-muted hover:text-text'}`}
            >
              case {v.name}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={useDefault}
            onClick={() => setUseDefault(!useDefault)}
            className={`rounded-md border px-3 py-1.5 font-code text-xs ${useDefault ? 'border-fail text-fail' : 'border-line text-muted hover:text-text'}`}
          >
            default
          </button>
        </div>
      </div>

      <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-3 font-code text-xs leading-relaxed" aria-label="Code">
        <div>sealed interface PaymentResult permits {permitted.map((v) => v.name).join(', ') || '…'} {'{ }'}</div>
        {permitted.map((v) => (
          <div key={v.name} className="text-muted">
            record {v.name}({v.components}) implements PaymentResult {'{ }'}
          </div>
        ))}
        <div> </div>
        <div>String label(PaymentResult r) {'{'}</div>
        <div>    return switch (r) {'{'}</div>
        {VARIANTS.filter((v) => cases.has(v.name)).map((v) => (
          <div key={v.name} className={declared.has(v.name) ? '' : 'text-fail'}>
            {'        '}case {v.name} {varName(v)} -&gt; {v.label};
          </div>
        ))}
        {useDefault && <div className="text-fail">{'        '}default -&gt; "?";</div>}
        {missing.length > 0 && !useDefault && (
          <div className="text-fail">{'        '}// manque : {missing.map((v) => v.name).join(', ')}</div>
        )}
        <div>    {'};'}</div>
        <div>{'}'}</div>
      </pre>

      <div className="flex items-center gap-2 text-xs text-muted" aria-hidden="true">
        {permitted.map((v) => (
          <span key={v.name} title={v.name} className={`h-3 w-3 rounded-sm ${cases.has(v.name) ? 'bg-pass' : useDefault ? 'bg-fail' : 'bg-cell-empty'}`} />
        ))}
        <span className="font-code">
          {permitted.filter((v) => cases.has(v.name)).length}/{permitted.length} variantes traitées
        </span>
      </div>

      <p role="status" className={`text-sm ${compiles ? 'text-pass' : 'text-fail'}`}>
        {verdict}
      </p>
    </div>
  )
}
