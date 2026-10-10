import { useMemo, useState } from 'react'

export const id = 'go-ch02-utf8-bytes'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8')

export default function Utf8Bytes() {
  const [text, setText] = useState('café 🙂')
  const [cut, setCut] = useState(4)

  const runes = useMemo(() => {
    let offset = 0
    return Array.from(text).map((ch) => {
      const bytes = Array.from(encoder.encode(ch))
      const r = { ch, bytes, offset, code: ch.codePointAt(0) ?? 0 }
      offset += bytes.length
      return r
    })
  }, [text])

  const totalBytes = runes.reduce((n, r) => n + r.bytes.length, 0)
  const safeCut = Math.min(cut, totalBytes)
  const sliced = decoder.decode(encoder.encode(text).slice(0, safeCut))
  const broken = sliced.includes('�')

  return (
    <div>
      <label className="block text-sm">
        <span className="text-muted">Tape un texte (accents, emojis…)</span>
        <input
          value={text}
          maxLength={24}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-code outline-none focus:border-accent"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        {runes.map((r) => (
          <div key={r.offset} className="rounded-md border border-line p-2 text-center">
            <div className="font-read text-2xl leading-none">{r.ch === ' ' ? '␠' : r.ch}</div>
            <div className="mt-1 font-code text-[0.65rem] text-muted">U+{r.code.toString(16).toUpperCase().padStart(4, '0')}</div>
            <div className="mt-2 flex gap-0.5">
              {r.bytes.map((b, i) => (
                <span
                  key={i}
                  className={`rounded px-1 font-code text-[0.65rem] ${
                    r.offset + i < safeCut ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'
                  }`}
                  title={`byte ${r.offset + i}`}
                >
                  {b.toString(16).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <div>
          <dt className="text-muted">len(s)</dt>
          <dd className="font-code text-lg">{totalBytes}</dd>
        </div>
        <div>
          <dt className="text-muted">utf8.RuneCountInString(s)</dt>
          <dd className="font-code text-lg">{runes.length}</dd>
        </div>
      </dl>

      <label className="mt-5 flex items-center gap-3 text-sm">
        <span className="font-code">s[:{safeCut}]</span>
        <input
          type="range"
          min={0}
          max={totalBytes}
          value={safeCut}
          onChange={(e) => setCut(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
      </label>
      <p className={`mt-2 font-code ${broken ? 'text-fail' : 'text-pass'}`}>
        "{sliced}" {broken ? '← coupé au milieu d’un caractère' : '← découpage valide'}
      </p>
    </div>
  )
}
