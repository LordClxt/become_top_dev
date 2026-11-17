import { useRef, useState } from 'react'

export const id = 'java-ch01-alert-builder'

type Severity = 'INFO' | 'WARN' | 'PAGE'
type Stage = 'ctor' | 'option' | 'build'
type Check = { stage: Stage; ok: boolean; text: string }
// Une alerte construite garde SA liste : copie ou même tableau que le builder.
type Built = { n: number; name: string; severity: Severity; threshold: number; minutes: number; channels: string[] }

const STAGES: { id: Stage; label: string; rule: string }[] = [
  { id: 'ctor', label: 'Constructeur du Builder', rule: 'name non vide' },
  { id: 'option', label: "Méthode d'option", rule: 'threshold entre 0 et 1' },
  { id: 'build', label: 'build()', rule: 'PAGE exige minutes > 0' },
]
const CHANNELS = ['#ops', '#oncall', '#db']

const btn = 'rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40'

export default function AlertBuilder() {
  const [name, setName] = useState('cpu')
  const [severity, setSeverity] = useState<Severity>('WARN')
  const [threshold, setThreshold] = useState(0.9)
  const [thresholdInput, setThresholdInput] = useState('0.9')
  const [minutes, setMinutes] = useState(5)
  const [copy, setCopy] = useState(true)
  // La liste mutable du builder : un vrai tableau partagé, muté sur place comme une ArrayList.
  const channels = useRef<string[]>([])
  const [, tick] = useState(0)
  const [built, setBuilt] = useState<Built[]>([])
  const [checks, setChecks] = useState<Partial<Record<Stage, Check>>>({})

  const ctorOk = name.trim() !== ''
  const ctorCheck: Check = ctorOk
    ? { stage: 'ctor', ok: true, text: `new Alert.Builder("${name}", ${severity}) : obligatoires vérifiés.` }
    : { stage: 'ctor', ok: false, text: 'new Alert.Builder("", …) : IllegalArgumentException("name"). Aucun builder, donc aucune alerte possible.' }

  const callThreshold = (raw: string) => {
    setThresholdInput(raw)
    const t = Number(raw)
    if (raw.trim() === '' || Number.isNaN(t) || t < 0 || t > 1) {
      setChecks((c) => ({ ...c, option: { stage: 'option', ok: false, text: `threshold(${raw || '?'}) : IllegalArgumentException("threshold doit être entre 0 et 1"). Le builder garde ${threshold}.` } }))
      return
    }
    setThreshold(t)
    setChecks((c) => ({ ...c, option: { stage: 'option', ok: true, text: `threshold(${t}) accepté dès son arrivée.` } }))
  }

  const addChannel = (ch: string) => {
    channels.current.push(ch) // mutation sur place, comme headers.add(...)
    tick((x) => x + 1)
  }

  const newBuilder = () => {
    channels.current = [] // nouveau builder, nouvelle liste
    setChecks({})
    tick((x) => x + 1)
  }

  const build = () => {
    if (!ctorOk) return
    if (severity === 'PAGE' && minutes <= 0) {
      setChecks((c) => ({ ...c, build: { stage: 'build', ok: false, text: `build() : IllegalArgumentException("minutes doit être > 0 pour PAGE"). Invariant entre deux champs : vérifiable seulement une fois tout reçu.` } }))
      return
    }
    const list = copy ? [...channels.current] : channels.current // List.copyOf(b.channels) ou b.channels
    setBuilt((b) => [{ n: b.length + 1, name, severity, threshold, minutes, channels: list }, ...b].slice(0, 4))
    setChecks((c) => ({ ...c, build: { stage: 'build', ok: true, text: `build() : invariants vérifiés sur les champs copiés, alerte #${built.length + 1} créée.` } }))
  }

  const all: Partial<Record<Stage, Check>> = { ...checks, ctor: ctorCheck }
  const code =
    `new Alert.Builder("${name}", ${severity})\n` +
    `    .threshold(${threshold})\n` +
    `    .forMinutes(${minutes})\n` +
    channels.current.map((c) => `    .channel("${c}")\n`).join('') +
    `    .build();`

  return (
    <div className="grid gap-5 text-sm">
      {/* Appels du builder */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-muted">name (obligatoire)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1 font-code" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">severity (obligatoire)</span>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="rounded-md border border-line bg-surface px-2 py-1 font-code">
            <option>INFO</option>
            <option>WARN</option>
            <option>PAGE</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">.threshold(…) (essaie 1.5)</span>
          <input value={thresholdInput} disabled={!ctorOk} onChange={(e) => callThreshold(e.target.value)} inputMode="decimal" className="rounded-md border border-line bg-surface px-2 py-1 font-code" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted">.forMinutes(…) (essaie 0 avec PAGE)</span>
          <input type="number" value={minutes} disabled={!ctorOk} onChange={(e) => setMinutes(Number(e.target.value) || 0)} className="rounded-md border border-line bg-surface px-2 py-1 font-code" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CHANNELS.map((ch) => (
          <button key={ch} type="button" disabled={!ctorOk} onClick={() => addChannel(ch)} className={btn}>
            .channel("{ch}")
          </button>
        ))}
        <button type="button" disabled={!ctorOk} onClick={build} className={`${btn} border-accent text-accent`}>
          .build()
        </button>
        <button type="button" onClick={newBuilder} className={`${btn} text-muted`}>
          Nouveau builder
        </button>
        <label className="flex items-center gap-2 sm:ml-auto">
          <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
          <span className="text-xs">copie défensive <span className="font-code">List.copyOf</span></span>
        </label>
      </div>

      {/* Où chaque validation se déclenche */}
      <ol className="grid gap-2 md:grid-cols-3" aria-label="Points de validation">
        {STAGES.map((s) => {
          const c = all[s.id]
          return (
            <li key={s.id} className={`rounded-xl border px-3 py-2 ${c ? (c.ok ? 'border-pass/60' : 'border-fail/70 bg-fail/10') : 'border-line'}`}>
              <p className="font-read text-sm">{s.label}</p>
              <p className="text-xs text-muted">{s.rule}</p>
              <p className={`mt-1 text-xs ${c ? (c.ok ? 'text-pass' : 'text-fail') : 'text-muted'}`}>{c ? c.text : 'Pas encore appelé.'}</p>
            </li>
          )
        })}
      </ol>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-line bg-surface p-3">
          <p className="mb-1 text-xs text-muted">État du builder (mutable)</p>
          <pre className="overflow-x-auto font-code text-xs">{code}</pre>
          <p className="mt-2 font-code text-xs">channels = [{channels.current.join(', ')}]</p>
        </div>
        <div className="min-w-0 rounded-xl border border-line bg-surface p-3">
          <p className="mb-1 text-xs text-muted">Alertes produites par build() (immuables… en principe)</p>
          {built.length === 0 && <p className="text-xs text-muted">Aucune pour l'instant. Appelle .build().</p>}
          <ul className="grid gap-2">
            {built.map((a) => {
              const shared = a.channels === channels.current
              return (
                <li key={a.n} className={`rounded-md border px-2 py-1 font-code text-xs ${shared && a.channels.length > 0 ? 'border-fail/70' : 'border-line'}`}>
                  #{a.n} {a.name} {a.severity} t={a.threshold} m={a.minutes} channels=[{a.channels.join(', ')}]
                  {shared && <span className="block font-read text-fail">Même liste que le builder : un .channel() ajouté maintenant la modifie.</span>}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <p role="status" className="text-xs text-muted">
        {copy
          ? "Avec la copie, chaque alerte fige sa liste au moment de build() : continuer à utiliser le builder ne la change plus."
          : 'Sans copie, construis une alerte, puis ajoute un canal : regarde l’alerte « immuable » changer.'}
      </p>
    </div>
  )
}
