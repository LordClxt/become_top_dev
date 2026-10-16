import { useState } from 'react'

export const id = 'java-ch01-twr-suppressed'

type Failures = { read: boolean; closeOut: boolean; closeIn: boolean }
type Outcome = { steps: string[]; thrown: string | null; suppressed: string[] }

const READ = 'IOException("lecture impossible")'
const CLOSE_OUT = 'IOException("fermeture out impossible")'
const CLOSE_IN = 'IOException("fermeture in impossible")'

/** try { try { corps } finally { out.close() } } finally { in.close() } : la dernière exception gagne. */
function tryFinally(f: Failures): Outcome {
  const steps = ['ouvre in', 'ouvre out']
  let thrown: string | null = null
  steps.push(f.read ? 'corps : read() lève une exception' : 'corps : copie terminée')
  if (f.read) thrown = READ
  steps.push(f.closeOut ? 'finally : out.close() lève une exception' : 'finally : out.close()')
  if (f.closeOut) thrown = CLOSE_OUT
  steps.push(f.closeIn ? 'finally : in.close() lève une exception' : 'finally : in.close()')
  if (f.closeIn) thrown = CLOSE_IN
  return { steps, thrown, suppressed: [] }
}

/** try (in; out) { corps } : la première exception gagne, les suivantes lui sont attachées. */
function tryWithResources(f: Failures): Outcome {
  const steps = ['ouvre in', 'ouvre out']
  let thrown: string | null = null
  const suppressed: string[] = []
  const raise = (e: string) => (thrown === null ? (thrown = e) : suppressed.push(e))
  steps.push(f.read ? 'corps : read() lève une exception' : 'corps : copie terminée')
  if (f.read) raise(READ)
  steps.push(f.closeOut ? 'fermeture auto : out.close() lève une exception' : 'fermeture auto : out.close()')
  if (f.closeOut) raise(CLOSE_OUT)
  steps.push(f.closeIn ? 'fermeture auto : in.close() lève une exception' : 'fermeture auto : in.close()')
  if (f.closeIn) raise(CLOSE_IN)
  return { steps, thrown, suppressed }
}

function Panel({ title, code, outcome, cause }: { title: string; code: string; outcome: Outcome; cause: string | null }) {
  const lost = cause !== null && outcome.thrown !== cause && !outcome.suppressed.includes(cause)
  return (
    <div className="grid content-start gap-3 rounded-md border border-line p-3">
      <p className="text-sm font-medium">{title}</p>
      <pre className="overflow-x-auto rounded bg-ink/60 p-2 font-code text-xs leading-5">{code}</pre>
      <ol className="grid gap-1 text-xs text-muted">
        {outcome.steps.map((s, i) => (
          <li key={i} className={s.includes('lève') ? 'text-text' : ''}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <div className="rounded-md border border-line px-3 py-2 font-code text-xs">
        <p className="font-ui text-muted">exception reçue par l'appelant</p>
        <p className={outcome.thrown ? (outcome.thrown === cause ? 'text-pass' : 'text-fail') : ''}>{outcome.thrown ?? 'aucune'}</p>
        {outcome.suppressed.length > 0 && (
          <>
            <p className="mt-2 font-ui text-muted">getSuppressed()</p>
            {outcome.suppressed.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </>
        )}
      </div>
      {lost && <p className="text-xs text-fail">La cause d'origine ({cause}) a disparu : rien dans la trace ne la mentionne.</p>}
    </div>
  )
}

export default function TwrSuppressed() {
  const [f, setF] = useState<Failures>({ read: true, closeOut: false, closeIn: true })
  const cause = f.read ? READ : f.closeOut ? CLOSE_OUT : f.closeIn ? CLOSE_IN : null
  const toggle = (k: keyof Failures) => setF((s) => ({ ...s, [k]: !s[k] }))

  return (
    <div className="grid gap-4">
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-2 text-xs text-muted">Qu'est-ce qui échoue ?</legend>
        {(
          [
            ['read', 'la lecture (corps)'],
            ['closeOut', 'out.close()'],
            ['closeIn', 'in.close()'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={f[k]} onChange={() => toggle(k)} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel
          title="try / finally imbriqués"
          code={'try {\n  try { copie } finally { out.close(); }\n} finally { in.close(); }'}
          outcome={tryFinally(f)}
          cause={cause}
        />
        <Panel title="try-with-resources" code={'try (in; out) {\n  copie\n}'} outcome={tryWithResources(f)} cause={cause} />
      </div>
    </div>
  )
}
