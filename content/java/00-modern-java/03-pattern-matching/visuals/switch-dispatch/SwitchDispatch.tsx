import { useState } from 'react'

export const id = 'java-ch00-switch-dispatch'

type Kind = 'null' | 'Approved' | 'Declined' | 'Pending' | 'Refunded'
type Input = { label: string; kind: Kind; cents?: number; retry?: boolean }
type Case = { code: string; kind: Kind | 'default'; guard?: (i: Input) => boolean; guardText?: string }

const INPUTS: Input[] = [
  { label: 'null', kind: 'null' },
  { label: 'Approved("A1B2C3", 1250)', kind: 'Approved', cents: 1250 },
  { label: 'Approved("Z9Z9Z9", 250_000)', kind: 'Approved', cents: 250_000 },
  { label: 'Declined("timeout", true)', kind: 'Declined', retry: true },
  { label: 'Declined("stolen", false)', kind: 'Declined', retry: false },
  { label: 'Pending("https://3ds…")', kind: 'Pending' },
]
const REFUNDED: Input = { label: 'Refunded("A1B2C3", 500)', kind: 'Refunded' }

const CASES: Case[] = [
  { code: 'case null -> "aucune réponse";', kind: 'null' },
  { code: 'case Approved(var code, long cents) when cents >= 100_000 -> "contrôle manuel";', kind: 'Approved', guard: (i) => (i.cents ?? 0) >= 100_000, guardText: 'cents >= 100_000' },
  { code: 'case Approved a -> "OK " + a.authCode();', kind: 'Approved' },
  { code: 'case Declined(var reason, boolean retry) when retry -> "réessayer";', kind: 'Declined', guard: (i) => i.retry === true, guardText: 'retry' },
  { code: 'case Declined d -> "refusé : " + d.reason();', kind: 'Declined' },
  { code: 'case Pending p -> "redirection 3-D Secure";', kind: 'Pending' },
]
const DEFAULT: Case = { code: 'default -> "rien à faire";   // « au cas où »', kind: 'default' }

type Verdict = 'type' | 'guard' | 'match' | 'skip'

export default function SwitchDispatch() {
  const [refunded, setRefunded] = useState(false)
  const [withDefault, setWithDefault] = useState(false)
  const [input, setInput] = useState<Input>(INPUTS[1]!)

  const cases = withDefault ? [...CASES, DEFAULT] : CASES
  const inputs = refunded ? [...INPUTS, REFUNDED] : INPUTS
  const compileError = refunded && !withDefault

  // Évaluation de haut en bas : le premier case dont le type ET la garde réussissent gagne.
  const verdicts: Verdict[] = []
  let matched = -1
  cases.forEach((c, i) => {
    if (matched >= 0) return verdicts.push('skip')
    if (c.kind !== 'default' && c.kind !== input.kind) return verdicts.push('type')
    if (c.guard && !c.guard(input)) return verdicts.push('guard')
    matched = i
    verdicts.push('match')
  })

  const mark: Record<Verdict, string> = { type: 'type ✗', guard: 'garde ✗', match: '✓ choisi', skip: 'pas essayé' }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={refunded} onChange={(e) => { setRefunded(e.target.checked); if (!e.target.checked && input.kind === 'Refunded') setInput(INPUTS[1]!) }} />
          ajouter <span className="font-code text-xs">Refunded</span> à <span className="font-code text-xs">permits</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={withDefault} onChange={(e) => setWithDefault(e.target.checked)} />
          ajouter un <span className="font-code text-xs">default</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Valeur passée au switch">
        {inputs.map((i) => (
          <button
            key={i.label}
            type="button"
            role="radio"
            aria-checked={input.label === i.label}
            onClick={() => setInput(i)}
            className={`rounded-md border px-2 py-1 font-code text-xs ${input.label === i.label ? 'border-accent text-text' : 'border-line text-muted hover:border-accent'}`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-line p-3 font-code text-xs">
        <div className="text-muted">return switch (result) {'{'}</div>
        {cases.map((c, i) => {
          const v = verdicts[i]!
          return (
            <div key={c.code} className={`flex items-baseline justify-between gap-4 rounded px-2 py-1 ${v === 'match' && !compileError ? 'bg-accent/15 text-text' : 'text-muted'}`}>
              <span className="pl-4">{c.code}</span>
              {!compileError && <span className={`shrink-0 ${v === 'match' ? 'text-accent' : ''}`}>{mark[v]}</span>}
            </div>
          )
        })}
        <div className="text-muted">{'};'}</div>
      </div>

      <p role="status" className="text-sm">
        {compileError ? (
          <>
            <strong>Erreur de compilation :</strong> <span className="font-code text-xs">the switch expression does not cover all possible input values</span>. Le compilateur te montre ce switch avant la mise en production : c'est le filet.
          </>
        ) : refunded && input.kind === 'Refunded' ? (
          <>Refunded tombe dans le <span className="font-code text-xs">default</span> : ça compile, et chaque remboursement est silencieusement traité comme « rien à faire ». Décoche default pour voir l'erreur qu'il cachait.</>
        ) : matched >= 0 ? (
          <>Les cases sont essayés dans l'ordre : le type d'abord, puis la garde. Le premier qui réussit gagne, les suivants ne sont jamais évalués.</>
        ) : (
          <>Aucun case ne correspond.</>
        )}
      </p>
    </div>
  )
}
