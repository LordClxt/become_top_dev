import { useState } from 'react'

export const id = 'go-ch03-range-string'

const encoder = new TextEncoder()

type Row = { offset: number; char: string; codePoint: number; bytes: number[] }

/** Équivalent de `for offset, r := range s` : une ligne par rune, avec son décalage en octets. */
function decode(text: string): Row[] {
  const rows: Row[] = []
  let offset = 0
  for (const char of text) {
    const bytes = [...encoder.encode(char)]
    rows.push({ offset, char, codePoint: char.codePointAt(0)!, bytes })
    offset += bytes.length
  }
  return rows
}

const PRESETS = ['hello', 'apple_π!', 'héllo', 'a世b', 'go 🚀', 'Été']
const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')

export default function RangeString() {
  const [text, setText] = useState('apple_π!')
  const rows = decode(text)
  const totalBytes = rows.reduce((n, r) => n + r.bytes.length, 0)

  return (
    <div className="grid gap-5">
      <label className="grid gap-1.5">
        <span className="text-xs text-muted">Une string (accents, idéogrammes, emojis…)</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="rounded-md border border-line bg-ink/60 px-3 py-2 font-code text-base"
          aria-label="String à parcourir"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setText(p)}
            className={`rounded-md border px-2.5 py-1 font-code text-xs ${text === p ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1" aria-hidden="true">
          {rows.map((row, i) => (
            <div key={i} className="grid gap-1 rounded-md border border-accent/50 p-1.5 text-center">
              <span className="font-code text-lg">{row.char}</span>
              <span className="flex gap-1">
                {row.bytes.map((b, j) => (
                  <span key={j} className="rounded bg-ink/60 px-1 font-code text-[11px] text-muted">
                    {hex(b)}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <caption className="sr-only">Tours de la boucle for-range</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="p-1.5 font-normal">tour</th>
              <th className="p-1.5 font-normal">i (décalage en octets)</th>
              <th className="p-1.5 font-normal">r (rune)</th>
              <th className="p-1.5 font-normal">octets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, tour) => (
              <tr key={tour} className="border-t border-line font-code text-xs">
                <td className="p-1.5 text-muted">{tour}</td>
                <td className="p-1.5">{row.offset}</td>
                <td className="p-1.5">
                  {row.codePoint} <span className="text-muted">U+{row.codePoint.toString(16).toUpperCase().padStart(4, '0')}</span> {row.char}
                </td>
                <td className="p-1.5 text-muted">{row.bytes.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm" role="status">
        <span className="font-code">len(s)</span> = <strong>{totalBytes}</strong> octets · <span className="font-code">utf8.RuneCountInString(s)</span> = <strong>{rows.length}</strong> runes
        {totalBytes !== rows.length && ' · l’indice saute dès qu’une rune occupe plus d’un octet.'}
      </p>
    </div>
  )
}
