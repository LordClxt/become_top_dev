import { useState } from 'react'

export const id = 'go-ch01-int-overflow'

const TYPES = {
  int8: { bits: 8, signed: true },
  uint8: { bits: 8, signed: false },
  int16: { bits: 16, signed: true },
  uint16: { bits: 16, signed: false },
  int32: { bits: 32, signed: true },
} as const
type TypeName = keyof typeof TYPES

const OPS = [
  { label: '+ 1', apply: (x: bigint) => x + 1n },
  { label: '− 1', apply: (x: bigint) => x - 1n },
  { label: '× 2', apply: (x: bigint) => x * 2n },
  { label: '+ 100', apply: (x: bigint) => x + 100n },
]

function range(t: TypeName) {
  const { bits, signed } = TYPES[t]
  return signed
    ? { min: -(2n ** BigInt(bits - 1)), max: 2n ** BigInt(bits - 1) - 1n }
    : { min: 0n, max: 2n ** BigInt(bits) - 1n }
}

/** Ce que calcule le processeur : on garde les `bits` bits de poids faible, puis on relit le signe. */
function wrap(t: TypeName, x: bigint) {
  const { bits, signed } = TYPES[t]
  return signed ? BigInt.asIntN(bits, x) : BigInt.asUintN(bits, x)
}

function bitString(t: TypeName, x: bigint) {
  const { bits } = TYPES[t]
  return BigInt.asUintN(bits, x).toString(2).padStart(bits, '0')
}

function Bits({ t, x, accent }: { t: TypeName; x: bigint; accent?: boolean }) {
  const s = bitString(t, x)
  const groups = s.match(/.{1,8}/g) ?? []
  return (
    <span className={`font-code text-sm tracking-wider ${accent ? 'text-accent' : ''}`}>
      {groups.map((g, i) => (
        <span key={i} className="mr-2 inline-block">
          {g}
        </span>
      ))}
    </span>
  )
}

export default function IntOverflow() {
  const [type, setType] = useState<TypeName>('int8')
  const [raw, setRaw] = useState('127')
  const [opIndex, setOpIndex] = useState(0)
  const { min, max } = range(type)

  let start: bigint | null = null
  if (/^-?\d+$/.test(raw)) {
    const n = BigInt(raw)
    if (n >= min && n <= max) start = n
  }
  const op = OPS[opIndex]!
  const exact = start === null ? null : op.apply(start)
  const result = exact === null ? null : wrap(type, exact)
  const overflowed = exact !== null && result !== exact

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <label className="grid gap-1.5 text-xs text-muted">
          Type
          <select
            value={type}
            onChange={(e) => {
              const next = e.target.value as TypeName
              setType(next)
              setRaw(range(next).max.toString())
            }}
            className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-sm text-text"
          >
            {Object.keys(TYPES).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Valeur de départ ({min.toString()} à {max.toString()})
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="numeric"
            spellCheck={false}
            className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-sm text-text"
          />
        </label>
        <div className="flex gap-2" role="group" aria-label="Opération">
          {OPS.map((o, i) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setOpIndex(i)}
              aria-pressed={i === opIndex}
              className={`rounded-md border px-3 py-2 font-code text-sm ${
                i === opIndex ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {start === null || exact === null || result === null ? (
        <p className="rounded-md border border-line px-3 py-2 text-sm text-muted" role="status">
          Choisis une valeur entière comprise dans la plage de {type}.
        </p>
      ) : (
        <div className="grid gap-3 rounded-md border border-line bg-ink/40 p-4">
          <div className="grid gap-1">
            <span className="text-xs text-muted">Avant</span>
            <span className="font-code text-sm">
              var x {type} = {start.toString()}
            </span>
            <Bits t={type} x={start} />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted">
              Résultat mathématique de x {op.label.replace('−', '-').replace('×', '*')} :{' '}
              <span className="font-code text-text">{exact.toString()}</span>
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted">Ce que Go range dans x (les {TYPES[type].bits} bits de poids faible)</span>
            <span className="font-code text-sm">x = {result.toString()}</span>
            <Bits t={type} x={result} accent={overflowed} />
          </div>
          <p className="text-sm" role="status">
            {overflowed
              ? `Débordement : ${exact.toString()} ne tient pas dans ${type}. Go ne signale rien et x vaut ${result.toString()}.`
              : 'Le résultat tient dans le type : pas de débordement.'}
          </p>
        </div>
      )}
    </div>
  )
}
