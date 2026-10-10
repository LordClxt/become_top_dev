import { useState } from 'react'

export const id = 'go-ch01-float-precision'

/** JS utilise aussi des float64 IEEE 754 : toFixed(n) révèle la valeur réellement stockée. */
const stored = (x: number) => x.toFixed(25).replace(/0+$/, '')

const PRESETS = [
  { a: '0.1', b: '0.2', target: '0.3' },
  { a: '0.1', b: '0.7', target: '0.8' },
  { a: '1.1', b: '2.2', target: '3.3' },
  { a: '19.99', b: '0.01', target: '20' },
  { a: '0.5', b: '0.25', target: '0.75' },
]

export default function FloatPrecision() {
  const [a, setA] = useState('0.1')
  const [b, setB] = useState('0.2')
  const [target, setTarget] = useState('0.3')
  const [exp, setExp] = useState(9)

  const x = Number(a)
  const y = Number(b)
  const want = Number(target)
  const valid = [x, y, want].every((n) => Number.isFinite(n))
  const sum = x + y
  const eps = 10 ** -exp

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={`${p.a}+${p.b}`}
            type="button"
            onClick={() => {
              setA(p.a)
              setB(p.b)
              setTarget(p.target)
            }}
            className="rounded-md border border-line px-2.5 py-1 font-code text-xs text-muted hover:text-text"
          >
            {p.a} + {p.b}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['a', a, setA],
          ['b', b, setB],
          ['attendu', target, setTarget],
        ].map(([label, value, set]) => (
          <label key={label as string} className="grid gap-1.5 text-xs text-muted">
            {label as string}
            <input
              value={value as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
              inputMode="decimal"
              spellCheck={false}
              className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-sm text-text"
            />
          </label>
        ))}
      </div>

      {!valid ? (
        <p className="rounded-md border border-line px-3 py-2 text-sm text-muted" role="status">
          Entre des nombres décimaux avec un point.
        </p>
      ) : (
        <>
          <dl className="grid gap-2 rounded-md border border-line bg-ink/40 p-4 font-code text-xs">
            <div className="grid gap-0.5">
              <dt className="font-ui text-muted">a est stocké comme</dt>
              <dd className="break-all">{stored(x)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-ui text-muted">b est stocké comme</dt>
              <dd className="break-all">{stored(y)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-ui text-muted">a + b vaut en réalité</dt>
              <dd className="break-all text-accent">{stored(sum)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-ui text-muted">attendu est stocké comme</dt>
              <dd className="break-all">{stored(want)}</dd>
            </div>
          </dl>

          <div className="grid gap-2 text-sm">
            <p role="status">
              <span className="font-code">a + b == attendu</span> →{' '}
              <strong className={sum === want ? 'text-pass' : 'text-fail'}>{String(sum === want)}</strong>
              <span className="text-muted"> · Println affiche {String(sum)}</span>
            </p>
            <label className="grid gap-1.5 text-xs text-muted">
              Tolérance epsilon = 10^-{exp}
              <input
                type="range"
                min={1}
                max={16}
                value={exp}
                onChange={(e) => setExp(Number(e.target.value))}
                aria-label="Exposant de la tolérance"
              />
            </label>
            <p role="status">
              <span className="font-code">math.Abs(a+b-attendu) &lt;= {eps.toExponential(0)}</span> →{' '}
              <strong className={Math.abs(sum - want) <= eps ? 'text-pass' : 'text-fail'}>
                {String(Math.abs(sum - want) <= eps)}
              </strong>
              <span className="text-muted"> · écart réel {Math.abs(sum - want).toExponential(2)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
