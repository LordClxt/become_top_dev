import { useState } from 'react'

export const id = 'java-ch02-compare-consistency'

// BigDecimal simplifié : valeur non mise à l'échelle + échelle (1.00 = 100, échelle 2).
type Dec = { text: string; unscaled: number; scale: number }
const VALUES: Dec[] = [
  { text: '1.0', unscaled: 10, scale: 1 },
  { text: '1.00', unscaled: 100, scale: 2 },
  { text: '2.5', unscaled: 25, scale: 1 },
  { text: '1', unscaled: 1, scale: 0 },
]
const numeric = (d: Dec) => d.unscaled / 10 ** d.scale
const equalsDec = (a: Dec, b: Dec) => a.unscaled === b.unscaled && a.scale === b.scale // equals : valeur ET échelle
const compareDec = (a: Dec, b: Dec) => Math.sign(numeric(a) - numeric(b)) // compareTo : la valeur seulement

const OVERFLOW_PAIRS: [number, number][] = [
  [3, 7],
  [2_000_000_000, -2_000_000_000],
  [2147483647, -1],
  [-2147483648, 1],
]

export default function CompareConsistency() {
  const [mode, setMode] = useState<'sets' | 'overflow'>('sets')
  const [hash, setHash] = useState<Dec[]>([])
  const [tree, setTree] = useState<Dec[]>([])
  const [log, setLog] = useState<{ hash: string; tree: string } | null>(null)
  const [pair, setPair] = useState(1)

  const insert = (d: Dec) => {
    const hDup = hash.find((x) => equalsDec(x, d))
    const tDup = tree.find((x) => compareDec(x, d) === 0)
    if (!hDup) setHash([...hash, d])
    if (!tDup) setTree([...tree, d].sort(compareDec))
    setLog({
      hash: hDup ? `${d.text}.equals(${hDup.text}) == true : refusé (doublon).` : `aucun élément x tel que ${d.text}.equals(x) : ajouté.`,
      tree: tDup ? `${d.text}.compareTo(${tDup.text}) == 0 : refusé (déjà présent).` : `compareTo ≠ 0 avec chaque élément : ajouté à sa place triée.`,
    })
  }

  const clear = () => {
    setHash([])
    setTree([])
    setLog(null)
  }

  const [a, b] = OVERFLOW_PAIRS[pair]!
  const diff = (a - b) | 0 // soustraction int Java sur 32 bits
  const truth = Math.sign(a - b)

  const tab = (k: 'sets' | 'overflow', text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === k}
      onClick={() => setMode(k)}
      className={`rounded-md border px-3 py-1.5 text-xs ${mode === k ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
    >
      {text}
    </button>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mode">
        {tab('sets', 'HashSet contre TreeSet')}
        {tab('overflow', 'comparateur a - b')}
      </div>

      {mode === 'sets' ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {VALUES.map((v) => (
              <button key={v.text} type="button" onClick={() => insert(v)} className="rounded-md border border-line px-3 py-1.5 font-code text-xs hover:border-accent">
                add(new BigDecimal("{v.text}"))
              </button>
            ))}
            <button type="button" onClick={clear} className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-text">
              vider
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['HashSet', 'demande equals (valeur et échelle)', hash, log?.hash],
                ['TreeSet', 'demande compareTo (valeur seulement)', tree, log?.tree],
              ] as const
            ).map(([name, q, items, line]) => (
              <div key={name} className="rounded-2xl border border-line bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-code text-sm text-accent">{name}</span>
                  <span className="font-code text-xs">size() = {items.length}</span>
                </div>
                <p className="mb-2 text-xs text-muted">{q}</p>
                <div className="flex min-h-[2rem] flex-wrap gap-1">
                  {items.map((d) => (
                    <span key={d.text} className="rounded border border-line bg-cell-empty px-2 py-0.5 font-code text-xs">
                      {d.text} <span className="text-muted">(échelle {d.scale})</span>
                    </span>
                  ))}
                </div>
                {line && <p className="mt-2 font-code text-[11px] break-words">{line}</p>}
              </div>
            ))}
          </div>
          <p role="status" className="text-sm">
            {hash.length !== tree.length
              ? `Les deux ensembles ont reçu les mêmes valeurs mais ne s'accordent plus : ${hash.length} contre ${tree.length}.`
              : 'Essaie 1.0 puis 1.00 : même valeur numérique, échelles différentes.'}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Paire de scores">
            {OVERFLOW_PAIRS.map(([x, y], i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={pair === i}
                onClick={() => setPair(i)}
                className={`rounded-md border px-3 py-1.5 font-code text-xs ${pair === i ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
              >
                a = {x}, b = {y}
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-2xl border border-line bg-surface p-3 font-code text-xs">
            <div className="break-words">a - b mathématique = {(a - b).toLocaleString('fr-FR')}</div>
            <div className="break-words">
              a - b en int Java (32 bits) = <span className={Math.sign(diff) === truth ? 'text-pass' : 'text-fail'}>{diff.toLocaleString('fr-FR')}</span>
            </div>
            <div>
              (a, b) -&gt; a - b dit : a {diff < 0 ? '<' : diff > 0 ? '>' : '=='} b
              {Math.sign(diff) !== truth && <span className="text-fail"> (faux)</span>}
            </div>
            <div className="text-pass">Integer.compare(a, b) = {truth} : a {truth < 0 ? '<' : truth > 0 ? '>' : '=='} b</div>
          </div>
          <p role="status" className="text-sm">
            {Math.sign(diff) !== truth
              ? "Le résultat dépasse 2 147 483 647 : il « fait le tour » et change de signe. Le tri reçoit un mensonge."
              : 'Petites valeurs : la soustraction tient dans un int, le signe est juste. Choisis une paire plus grande.'}
          </p>
        </>
      )}
    </div>
  )
}
