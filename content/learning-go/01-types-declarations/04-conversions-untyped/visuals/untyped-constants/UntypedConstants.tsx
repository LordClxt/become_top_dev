import { useState } from 'react'

export const id = 'go-ch01-untyped-constants'

type Lit =
  | { kind: 'int'; text: string; value: bigint }
  | { kind: 'float'; text: string; value: number }
  | { kind: 'rune'; text: string; value: bigint }
  | { kind: 'string'; text: string }

const LITERALS: Lit[] = [
  { kind: 'int', text: '10', value: 10n },
  { kind: 'int', text: '300', value: 300n },
  { kind: 'int', text: '-1', value: -1n },
  { kind: 'int', text: '1 << 40', value: 1n << 40n },
  { kind: 'float', text: '3.0', value: 3 },
  { kind: 'float', text: '3.5', value: 3.5 },
  { kind: 'rune', text: "'a'", value: 97n },
  { kind: 'string', text: '"go"' },
]

const INTS: Record<string, [bigint, bigint]> = {
  int: [-(2n ** 63n), 2n ** 63n - 1n],
  int8: [-128n, 127n],
  byte: [0n, 255n],
  uint: [0n, 2n ** 64n - 1n],
  rune: [-(2n ** 31n), 2n ** 31n - 1n],
}
const TYPES = ['int', 'int8', 'byte', 'uint', 'rune', 'float64', 'string', 'bool']

function check(lit: Lit, type: string): { ok: boolean; why: string } {
  if (type === 'bool') return { ok: false, why: 'aucun littéral n’est un booléen' }
  if (lit.kind === 'string') {
    return type === 'string'
      ? { ok: true, why: 'string' }
      : { ok: false, why: 'une string ne devient pas un nombre' }
  }
  if (type === 'string') return { ok: false, why: 'un nombre n’est pas une string (string(65) donnerait "A")' }
  if (type === 'float64') return { ok: true, why: 'représentable en float64' }
  const range = INTS[type]!
  let value: bigint
  if (lit.kind === 'float') {
    if (!Number.isInteger(lit.value)) return { ok: false, why: `${lit.text} tronqué : pas un entier` }
    value = BigInt(lit.value)
  } else value = lit.value
  if (value < range[0] || value > range[1]) return { ok: false, why: `déborde ${type}` }
  return { ok: true, why: `valeur ${value}` }
}

const DEFAULTS: Record<Lit['kind'], string> = { int: 'int', float: 'float64', rune: 'rune', string: 'string' }

export default function UntypedConstants() {
  const [selected, setSelected] = useState<{ lit: number; type: string } | null>({ lit: 1, type: 'byte' })
  const detail = selected ? check(LITERALS[selected.lit]!, selected.type) : null

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Un littéral peut-il être affecté à ce type ?</caption>
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-normal text-muted">littéral ↓ / type →</th>
              {TYPES.map((t) => (
                <th key={t} className="p-2 font-code text-xs font-normal text-muted">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LITERALS.map((lit, li) => (
              <tr key={lit.text} className="border-t border-line">
                <th scope="row" className="whitespace-nowrap p-2 text-left font-code text-xs font-normal">
                  {lit.text}
                  <span className="ml-2 font-ui text-[11px] text-muted">défaut : {DEFAULTS[lit.kind]}</span>
                </th>
                {TYPES.map((t) => {
                  const r = check(lit, t)
                  const active = selected?.lit === li && selected.type === t
                  return (
                    <td key={t} className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => setSelected({ lit: li, type: t })}
                        aria-label={`${lit.text} vers ${t} : ${r.ok ? 'compile' : 'refusé'}`}
                        className={`h-8 w-full min-w-9 rounded-md border text-sm ${
                          active ? 'border-accent' : 'border-transparent hover:border-line'
                        } ${r.ok ? 'text-pass' : 'text-fail'}`}
                      >
                        {r.ok ? '✓' : '✗'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-md border border-line px-3 py-2 text-sm" role="status">
        {selected && detail ? (
          <>
            <span className="font-code">
              var x {selected.type} = {LITERALS[selected.lit]!.text}
            </span>{' '}
            → <strong className={detail.ok ? 'text-pass' : 'text-fail'}>{detail.ok ? 'compile' : 'erreur de compilation'}</strong>
            <span className="text-muted"> · {detail.why}</span>
          </>
        ) : (
          'Clique sur une case pour voir le détail.'
        )}
      </p>
    </div>
  )
}
