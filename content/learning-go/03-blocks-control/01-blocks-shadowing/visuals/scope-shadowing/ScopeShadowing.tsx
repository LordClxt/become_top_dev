import { useMemo, useState } from 'react'

export const id = 'go-ch03-scope-shadowing'

type Scope = Record<string, number>
type Step = { line: number; note: string; scopes: Scope[]; output: string[]; error?: string }

const NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u
const INT = /^-?\d+$/

/** Même langage jouet que le TP : blocs emboîtés, déclarations qui masquent, affectations qui modifient. */
function trace(program: string): Step[] {
  const steps: Step[] = []
  let scopes: Scope[] = [{}]
  const output: string[] = []
  const snapshot = () => scopes.map((s) => ({ ...s }))
  const push = (line: number, note: string, error?: string) =>
    steps.push({ line, note, scopes: snapshot(), output: [...output], error })
  const find = (name: string) => [...scopes].reverse().find((s) => name in s)

  const lines = program.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]!.trim()
    if (!text || text.startsWith('//')) continue
    const f = text.split(/\s+/)
    const fail = (message: string) => push(i, message, message)

    if (text === '{') {
      scopes.push({})
      push(i, 'Nouveau bloc : une table vide est empilée.')
    } else if (text === '}') {
      if (scopes.length === 1) return (fail('unexpected }'), steps)
      scopes.pop()
      push(i, 'Le bloc se ferme : ses variables disparaissent.')
    } else if ((f.length === 4 && f[0] === 'var' && f[2] === '=' && NAME.test(f[1]!) && INT.test(f[3]!)) || (f.length === 3 && f[1] === ':=' && NAME.test(f[0]!) && INT.test(f[2]!))) {
      const [name, value] = f[0] === 'var' ? [f[1]!, Number(f[3])] : [f[0]!, Number(f[2])]
      const scope = scopes[scopes.length - 1]!
      if (name in scope) return (fail(`${name} redeclared in this block`), steps)
      const shadows = scopes.slice(0, -1).some((s) => name in s)
      scope[name] = value
      push(i, shadows ? `${name} est déclarée dans ce bloc : elle MASQUE celle du bloc extérieur.` : `${name} est déclarée dans le bloc courant.`)
    } else if (f.length === 3 && f[1] === '=' && NAME.test(f[0]!) && INT.test(f[2]!)) {
      const scope = find(f[0]!)
      if (!scope) return (fail(`undefined: ${f[0]}`), steps)
      scope[f[0]!] = Number(f[2])
      push(i, `${f[0]} est modifiée là où elle a été déclarée (la plus proche en remontant), aucune variable créée.`)
    } else if (f.length === 2 && f[0] === 'print' && NAME.test(f[1]!)) {
      const scope = find(f[1]!)
      if (!scope) return (fail(`undefined: ${f[1]}`), steps)
      output.push(String(scope[f[1]!]))
      push(i, `${f[1]} est cherchée du bloc le plus intérieur vers l'extérieur : on lit ${scope[f[1]!]}.`)
    } else return (fail('syntax error'), steps)
  }
  if (scopes.length > 1) {
    steps.push({ line: lines.length - 1, note: 'missing }', scopes: snapshot(), output: [...output], error: 'missing }' })
  }
  return steps
}

const PRESETS: Record<string, string> = {
  'Shadowing (:=)': 'var x = 10\n{\n  print x\n  x := 5\n  print x\n}\nprint x',
  'Affectation (=)': 'var x = 10\n{\n  x = 5\n  print x\n}\nprint x',
  'Trois niveaux': 'var a = 1\n{\n  var a = 2\n  {\n    a = 3\n    print a\n  }\n  print a\n}\nprint a',
  'Hors de portée': 'var x = 1\n{\n  var y = 2\n}\nprint x\nprint y',
}

export default function ScopeShadowing() {
  const [preset, setPreset] = useState('Shadowing (:=)')
  const [program, setProgram] = useState(PRESETS['Shadowing (:=)']!)
  const steps = useMemo(() => trace(program), [program])
  const [index, setIndex] = useState(0)
  const current = steps[Math.min(index, steps.length - 1)]
  const lines = program.split('\n')

  return (
    <div className="grid gap-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Exemples">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={preset === name}
            onClick={() => {
              setPreset(name)
              setProgram(PRESETS[name]!)
              setIndex(0)
            }}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${
              preset === name ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">Programme (modifiable)</span>
            <textarea
              value={program}
              onChange={(e) => {
                setProgram(e.target.value)
                setIndex(0)
              }}
              spellCheck={false}
              rows={Math.max(7, lines.length + 1)}
              className="resize-y rounded-md border border-line bg-ink/60 p-3 font-code text-xs leading-6"
            />
          </label>
          <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">
              ← Précédent
            </button>
            <button type="button" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))} disabled={!current || index >= steps.length - 1} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">
              Suivant →
            </button>
            <span className="text-xs text-muted">
              étape {steps.length ? Math.min(index, steps.length - 1) + 1 : 0}/{steps.length}
            </span>
          </div>
        </div>

        <div className="grid content-start gap-3">
          {current ? (
            <>
              <p className="font-code text-xs leading-6">
                <span className="text-muted">Ligne {current.line + 1} : </span>
                {lines[current.line]?.trim()}
              </p>
              <ol className="grid gap-2" aria-label="Pile de blocs">
                {current.scopes.map((scope, depth) => (
                  <li key={depth} className="rounded-md border border-line bg-ink/40 p-2" style={{ marginLeft: depth * 14 }}>
                    <span className="text-[11px] text-muted">{depth === 0 ? 'niveau le plus haut' : `bloc ${depth}`}</span>
                    <div className="flex flex-wrap gap-2 pt-1 font-code text-xs">
                      {Object.entries(scope).length === 0 && <span className="text-muted">(vide)</span>}
                      {Object.entries(scope).map(([name, value]) => {
                        const hidden = current.scopes.slice(depth + 1).some((inner) => name in inner)
                        return (
                          <span key={name} className={`rounded border px-2 py-0.5 ${hidden ? 'border-line text-muted line-through' : 'border-accent'}`} title={hidden ? 'masquée par un bloc plus intérieur' : undefined}>
                            {name} = {value}
                          </span>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ol>
              <p className={`text-sm ${current.error ? 'text-fail' : ''}`} role="status">
                {current.error ? `Erreur de compilation : ${current.error}` : current.note}
              </p>
              <p className="font-code text-xs text-muted">sortie : {current.output.length ? current.output.join(' ') : '(rien)'}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Écris un programme pour voir la pile de blocs.</p>
          )}
        </div>
      </div>
    </div>
  )
}
