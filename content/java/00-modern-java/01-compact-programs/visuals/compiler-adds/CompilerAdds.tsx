import { useState } from 'react'

export const id = 'java-ch00-compiler-adds'

type Piece = 'imports' | 'klass' | 'ctor' | 'launcher'

// Chaque ligne appartient soit au source écrit par l'apprenant (piece null), soit à une pièce ajoutée.
type Line = { text: string; piece: Piece | null }

const PIECES: { key: Piece; label: string; why: string }[] = [
  {
    key: 'imports',
    label: 'imports automatiques',
    why: 'Un fichier compact importe tout le module java.base : Map et LinkedHashMap sont visibles sans une ligne d’import.',
  },
  {
    key: 'klass',
    label: 'classe implicite',
    why: 'javac entoure les membres d’une classe final, dans le paquetage sans nom, qui étend Object. Son nom (ici celui du fichier sous OpenJDK) ne doit apparaître dans aucun code.',
  },
  {
    key: 'ctor',
    label: 'constructeur par défaut',
    why: 'Comme toute classe sans constructeur déclaré, elle reçoit un constructeur sans argument. C’est lui qui exécute l’initialiseur du champ totals.',
  },
  {
    key: 'launcher',
    label: 'ce que fait le lanceur',
    why: 'main n’est pas static : le lanceur crée donc une instance avec ce constructeur, puis appelle main() dessus. Ce code n’est pas écrit dans la classe, c’est le lanceur qui l’exécute.',
  },
]

function build(on: Record<Piece, boolean>): Line[] {
  const ind = on.klass ? '    ' : ''
  const lines: Line[] = []
  if (on.imports) lines.push({ text: 'import module java.base;', piece: 'imports' }, { text: '', piece: 'imports' })
  if (on.klass) lines.push({ text: 'final class Tally extends Object {', piece: 'klass' })
  lines.push({ text: ind + 'final Map<String, Long> totals = new LinkedHashMap<>();', piece: null })
  if (on.ctor) lines.push({ text: '', piece: 'ctor' }, { text: ind + 'Tally() { super(); /* puis totals = new LinkedHashMap<>() */ }', piece: 'ctor' })
  lines.push(
    { text: '', piece: null },
    { text: ind + 'void add(String item, long cents) { totals.merge(item, cents, Long::sum); }', piece: null },
    { text: '', piece: null },
    { text: ind + 'void main() {', piece: null },
    { text: ind + '    add("café", 250);', piece: null },
    { text: ind + '    IO.println(totals);', piece: null },
    { text: ind + '}', piece: null },
  )
  if (on.klass) lines.push({ text: '}', piece: 'klass' })
  if (on.launcher)
    lines.push(
      { text: '', piece: 'launcher' },
      { text: '// exécuté par java Tally.java, hors de la classe :', piece: 'launcher' },
      { text: 'new Tally().main();', piece: 'launcher' },
    )
  return lines
}

const NONE: Record<Piece, boolean> = { imports: false, klass: false, ctor: false, launcher: false }
const ALL: Record<Piece, boolean> = { imports: true, klass: true, ctor: true, launcher: true }

export default function CompilerAdds() {
  const [on, setOn] = useState<Record<Piece, boolean>>(NONE)
  const [last, setLast] = useState<Piece | null>(null)
  const lines = build(on)
  const count = PIECES.filter((p) => on[p.key]).length

  const toggle = (k: Piece) => {
    setOn({ ...on, [k]: !on[k] })
    setLast(on[k] ? null : k)
  }

  const info = last ? PIECES.find((p) => p.key === last)!.why : count === 0
    ? 'Voici le fichier tel que tu l’écris. Active chaque pièce pour voir ce que javac et le lanceur y ajoutent.'
    : 'Pièce retirée.'

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 text-sm" aria-label="Pièces ajoutées par le compilateur">
        {PIECES.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={on[p.key]}
            onClick={() => toggle(p.key)}
            className={`rounded-md border px-3 py-1.5 text-xs ${on[p.key] ? 'border-accent text-accent' : 'border-line text-muted hover:text-text'}`}
          >
            {on[p.key] ? '− ' : '+ '}
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const full = count < PIECES.length
            setOn(full ? ALL : NONE)
            setLast(null)
          }}
          className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-accent"
        >
          {count < PIECES.length ? 'tout afficher' : 'revenir au fichier compact'}
        </button>
      </div>

      <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-3 font-code text-xs leading-relaxed" aria-label="Code effectif">
        {lines.map((l, i) => (
          <div
            key={i}
            className={l.piece ? `${l.piece === last ? 'bg-accent/15' : 'bg-cell-empty/40'} text-accent` : ''}
          >
            {l.text || ' '}
          </div>
        ))}
      </pre>

      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Pièces ajoutées</span>
        {PIECES.map((p) => (
          <span key={p.key} className={`h-3 w-3 rounded-sm ${on[p.key] ? 'bg-accent' : 'bg-cell-empty'}`} />
        ))}
        <span className="font-code">{count}/{PIECES.length}</span>
      </div>

      <p role="status" className="text-sm">
        {info}
      </p>
    </div>
  )
}
