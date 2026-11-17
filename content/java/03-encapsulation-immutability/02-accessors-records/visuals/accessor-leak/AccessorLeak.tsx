import { useState } from 'react'

export const id = 'java-ch03-accessor-leak'

// Un tableau Java simulé : une identité (comme @1b6d) et un contenu mutable.
type Arr = { ref: string; values: number[] }

type World = {
  caller: Arr // le tableau que l'appelant a passé au constructeur
  internal: Arr // ce que le champ du record désigne
  returned: Arr | null // ce que le dernier appel à scores() a renvoyé
  log: string[]
}

const INITIAL = [10, 20, 30]

function build(copyIn: boolean): World {
  const caller: Arr = { ref: '@4e1a', values: [...INITIAL] }
  // Sans copie, le champ désigne LE MÊME objet que l'appelant.
  const internal: Arr = copyIn ? { ref: '@7c2f', values: [...INITIAL] } : caller
  return { caller, internal, returned: null, log: [] }
}

function Cells({ arr, label, hint }: { arr: Arr; label: string; hint: string }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-code text-xs text-muted">{hint} {arr.ref}</p>
      <div className="mt-2 flex gap-1.5">
        {arr.values.map((v, i) => (
          <span
            key={i}
            className={`flex h-9 w-11 items-center justify-center rounded border font-code text-sm ${
              v === INITIAL[i] ? 'border-line bg-cell-empty' : 'border-fail text-fail'
            }`}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function AccessorLeak() {
  const [copyIn, setCopyIn] = useState(false)
  const [copyOut, setCopyOut] = useState(false)
  const [w, setW] = useState<World>(() => build(false))

  const reset = (ci: boolean) => setW(build(ci))

  const toggleIn = () => {
    setCopyIn(!copyIn)
    reset(!copyIn)
  }
  const toggleOut = () => {
    setCopyOut(!copyOut)
    reset(copyIn)
  }

  // Attaque 1 : l'appelant garde sa référence et modifie son tableau.
  const attackIn = () =>
    setW((s) => {
      s.caller.values[0] = 99
      return { ...s, log: [...s.log, 'scores[0] = 99;   // sur le tableau passé au constructeur'] }
    })

  // Attaque 2 : un lecteur modifie ce que l'accesseur lui a donné.
  const attackOut = () =>
    setW((s) => {
      const got: Arr = copyOut ? { ref: '@9d03', values: [...s.internal.values] } : s.internal
      got.values[2] = -1
      return { ...s, returned: got, log: [...s.log, 'r.scores()[2] = -1;   // sur le tableau renvoyé'] }
    })

  const intact = w.internal.values.every((v, i) => v === INITIAL[i])
  const sharedIn = w.internal === w.caller
  const sharedOut = w.returned !== null && w.returned === w.internal

  const toggle = (on: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs ${on ? 'border-accent text-accent' : 'border-line text-muted hover:text-text'}`}
    >
      {label} : {on ? 'oui' : 'non'}
    </button>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {toggle(copyIn, "Copie à l'entrée", toggleIn)}
        {toggle(copyOut, 'Copie à la sortie', toggleOut)}
      </div>

      <pre className="overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 font-code text-xs leading-relaxed">
        {`record Scores(int[] scores) {
    Scores { ${copyIn ? 'scores = scores.clone();' : '// aucune copie'} }
    public int[] scores() { return ${copyOut ? 'scores.clone()' : 'scores'}; }
}
int[] scores = {10, 20, 30};
Scores r = new Scores(scores);`}
      </pre>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={attackIn} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-fail">
          Attaque 1 : modifier le tableau d'origine
        </button>
        <button type="button" onClick={attackOut} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-fail">
          Attaque 2 : modifier le tableau renvoyé
        </button>
        <button type="button" onClick={() => reset(copyIn)} className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-text">
          Recommencer
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Cells arr={w.caller} label="Tableau de l'appelant" hint="scores →" />
        <Cells arr={w.internal} label="État interne du record" hint={sharedIn ? 'champ → même objet' : 'champ →'} />
        {w.returned ? (
          <Cells arr={w.returned} label="Renvoyé par r.scores()" hint={sharedOut ? 'même objet' : 'copie'} />
        ) : (
          <div className="rounded-md border border-line/50 px-3 py-2 text-xs text-muted">r.scores() pas encore appelé</div>
        )}
      </div>

      {w.log.length > 0 && (
        <ul className="font-code text-xs text-muted">
          {w.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}

      <p role="status" className={`text-sm ${intact ? 'text-pass' : 'text-fail'}`}>
        {intact
          ? w.log.length === 0
            ? "Lance une attaque. Regarde les identités (@…) : deux cases au même @ sont le même tableau."
            : "État interne intact : chaque attaque n'a touché qu'une copie."
          : `L'état du record a changé alors que son champ est final : fuite par ${
              w.internal.values[0] !== INITIAL[0] && w.internal.values[2] !== INITIAL[2]
                ? "l'entrée et la sortie"
                : w.internal.values[0] !== INITIAL[0]
                  ? "l'entrée (il faut copier dans le constructeur compact)"
                  : "la sortie (il faut copier dans l'accesseur)"
            }.`}
      </p>
    </div>
  )
}
