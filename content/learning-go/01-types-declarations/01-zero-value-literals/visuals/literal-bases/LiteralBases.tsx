import { useState } from 'react'

export const id = 'go-ch01-literal-bases'

type Parsed = { value: bigint; base: number; note?: string } | { error: string }

/** Lit un littéral entier comme le fait Go : préfixe 0b / 0o / 0x, zéro initial = octal, _ entre deux chiffres. */
function parse(raw: string): Parsed {
  const s = raw.trim()
  if (!s) return { error: 'Tape un littéral entier.' }
  let base = 10
  let digits = s
  let note: string | undefined
  const prefix = s.slice(0, 2).toLowerCase()
  if (prefix === '0b') [base, digits] = [2, s.slice(2)]
  else if (prefix === '0o') [base, digits] = [8, s.slice(2)]
  else if (prefix === '0x') [base, digits] = [16, s.slice(2)]
  else if (s.length > 1 && s[0] === '0') {
    base = 8
    note = 'Zéro initial sans lettre : Go lit de l’octal. Écris 0o… si c’est voulu.'
  }
  if (!digits) return { error: 'Un préfixe doit être suivi d’au moins un chiffre.' }
  if (/(^_|_$|__)/.test(digits)) return { error: 'Un _ doit séparer deux chiffres.' }
  const clean = digits.replaceAll('_', '')
  const allowed = '0123456789abcdef'.slice(0, base)
  for (const c of clean.toLowerCase()) {
    if (!allowed.includes(c)) return { error: `« ${c} » n’est pas un chiffre en base ${base}.` }
  }
  let value = 0n
  for (const c of clean.toLowerCase()) value = value * BigInt(base) + BigInt(allowed.indexOf(c))
  return { value, base, note }
}

function group(text: string, size: number): string {
  const out: string[] = []
  for (let end = text.length; end > 0; end -= size) out.unshift(text.slice(Math.max(0, end - size), end))
  return out.join('_')
}

const PRESETS = ['255', '0xFF', '0b1111_1111', '0o377', '0377', '010', '0o10', '1_000_000', '0xDEAD_BEEF', '08']

export default function LiteralBases() {
  const [text, setText] = useState('010')
  const parsed = parse(text)

  return (
    <div className="grid gap-5">
      <label className="grid gap-1.5">
        <span className="text-xs text-muted">Littéral entier Go</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-base"
          aria-label="Littéral entier"
        />
      </label>
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setText(p)}
            className={`rounded-md border px-2.5 py-1 font-code text-xs ${
              text === p ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {'error' in parsed ? (
        <p className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm" role="status">
          Erreur de compilation : {parsed.error}
        </p>
      ) : (
        <>
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Décimal', base: 10, text: group(parsed.value.toString(10), 3) },
              { label: 'Binaire (0b)', base: 2, text: '0b' + group(parsed.value.toString(2).padStart(8, '0'), 4) },
              { label: 'Octal (0o)', base: 8, text: '0o' + parsed.value.toString(8) },
              { label: 'Hexadécimal (0x)', base: 16, text: '0x' + group(parsed.value.toString(16).toUpperCase().padStart(2, '0'), 2) },
            ].map((row) => (
              <div
                key={row.label}
                className={`rounded-md border px-3 py-2 ${row.base === parsed.base ? 'border-accent' : 'border-line'}`}
              >
                <dt className="text-xs text-muted">
                  {row.label}
                  {row.base === parsed.base && <span className="text-accent"> · base lue</span>}
                </dt>
                <dd className="break-all font-code text-sm">{row.text}</dd>
              </div>
            ))}
          </dl>
          {parsed.note && (
            <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm" role="status">
              {parsed.note} Valeur : <span className="font-code">{parsed.value.toString()}</span>.
            </p>
          )}
        </>
      )}
    </div>
  )
}
