import { useState } from 'react'

export const id = 'go-ch00-semicolon-insertion'

/** Même règle que le lexer de Go (et que le TP) : on regarde le dernier token de la ligne. */
const KEYWORDS = new Set(
  'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(
    ' ',
  ),
)
const TERMINATING = new Set(['break', 'continue', 'fallthrough', 'return'])

function stripComment(line: string): string {
  let quote = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (quote) {
      if (c === '\\' && quote !== '`') i++
      else if (c === quote) quote = ''
    } else if (c === '"' || c === '`' || c === "'") quote = c
    else if (c === '/' && line[i + 1] === '/') return line.slice(0, i)
  }
  return line
}

/** Renvoie le dernier token et la raison de la décision, ou null si la ligne est vide. */
function analyze(line: string): { code: string; token: string; inserts: boolean; why: string } | null {
  const code = stripComment(line).replace(/[ \t]+$/, '')
  if (!code.trim()) return null
  if (code.endsWith('++') || code.endsWith('--')) return { code, token: code.slice(-2), inserts: true, why: 'opérateur ++ ou --' }
  const last = code.at(-1)!
  if (')]}'.includes(last)) return { code, token: last, inserts: true, why: `${last} ferme un bloc ou une expression` }
  if ('"`\''.includes(last)) return { code, token: last, inserts: true, why: 'littéral (string ou rune)' }
  const word = /[\p{L}\p{N}_]+$/u.exec(code)?.[0]
  if (!word) return { code, token: last, inserts: false, why: `« ${last} » : l'instruction continue` }
  if (KEYWORDS.has(word))
    return TERMINATING.has(word)
      ? { code, token: word, inserts: true, why: `mot-clé ${word}` }
      : { code, token: word, inserts: false, why: `mot-clé ${word} : il attend la suite` }
  return { code, token: word, inserts: true, why: /^\d/.test(word) ? 'littéral numérique' : 'identifiant' }
}

const PRESETS: Record<string, { title: string; code: string; verdict: string }> = {
  ok: {
    title: 'Code correct',
    code: 'func main() {\n\tcount := 0\n\tcount++\n\tfmt.Println("total :", count)\n}',
    verdict: 'Chaque instruction se termine au bon endroit.',
  },
  brace: {
    title: 'Accolade à la ligne',
    code: 'func main()\n{\n\tfmt.Println("Bonjour")\n}',
    verdict: 'func main(); est une déclaration sans corps → syntax error: unexpected semicolon or newline before {',
  },
  comma: {
    title: 'Virgule finale oubliée',
    code: 'ports := []int{\n\t8080,\n\t8443\n}',
    verdict: 'Un ; tombe au milieu de la liste → syntax error: unexpected newline in composite literal; possibly missing comma or }',
  },
  operator: {
    title: 'Expression coupée',
    code: 'total := price\n\t+ tax\nok := price +\n\ttax',
    verdict: 'La première forme coupe après price : + tax devient une instruction isolée, refusée par le compilateur (+tax is not used). La seconde coupe après l\'opérateur et compile.',
  },
}

export default function SemicolonInsertion() {
  const [preset, setPreset] = useState('brace')
  const [code, setCode] = useState(PRESETS.brace!.code)
  const lines = code.split('\n')
  const edited = code !== PRESETS[preset]?.code

  return (
    <div className="grid gap-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Exemples">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={preset === key}
            onClick={() => {
              setPreset(key)
              setCode(p.code)
            }}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${
              preset === key ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs text-muted">Ton code (modifiable)</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={Math.max(5, lines.length + 1)}
            className="resize-y rounded-md border border-line bg-ink/60 p-3 font-code text-xs leading-6 [tab-size:4]"
          />
        </label>
        <div className="grid content-start gap-1.5">
          <span className="text-xs text-muted">Ce que lit le compilateur</span>
          <ol className="rounded-md border border-line bg-ink/60 p-3 font-code text-xs leading-6 [tab-size:4]">
            {lines.map((line, i) => {
              const a = analyze(line)
              return (
                <li key={i} className="grid grid-cols-[1fr_auto] gap-3 whitespace-pre">
                  <span className="min-w-0 overflow-hidden text-ellipsis">
                    {a ? a.code : line || ' '}
                    {a?.inserts && <span className="font-semibold text-accent">;</span>}
                  </span>
                  {a && (
                    <span className={`font-ui text-[11px] ${a.inserts ? 'text-accent' : 'text-muted'}`}>
                      {a.inserts ? `; après ${a.token}` : 'continue'}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <p className="text-sm">
        {edited ? (
          <span className="text-muted">
            Les <span className="font-code text-accent">;</span> en couleur sont ceux que le lexer ajoute. La liste ci-dessous donne le dernier token de chaque ligne.
          </span>
        ) : (
          PRESETS[preset]?.verdict
        )}
      </p>
      <ul className="grid gap-1 text-xs text-muted">
        {lines.map((line, i) => {
          const a = analyze(line)
          return a ? (
            <li key={i}>
              Ligne {i + 1} : {a.why}
            </li>
          ) : null
        })}
      </ul>
    </div>
  )
}
