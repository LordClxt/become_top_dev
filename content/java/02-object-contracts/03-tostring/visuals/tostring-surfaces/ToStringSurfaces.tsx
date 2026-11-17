import { useState } from 'react'

export const id = 'java-ch02-tostring-surfaces'

type Field = 'id' | 'email' | 'plan' | 'apiToken'
type Client = Record<Field, string>

// Le scénario : deux clients qui ne diffèrent que par leur offre (plan), comparée par equals.
const EXPECTED: Client = { id: '4812', email: 'ana@example.fr', plan: 'PRO', apiToken: 'sk_live_9f3a71c2' }
const ACTUAL: Client = { ...EXPECTED, plan: 'FREE' }
const OTHER: Client = { id: '4813', email: 'leo@example.fr', plan: 'FREE', apiToken: 'sk_live_0b8e44d1' }

const FIELDS: { key: Field; label: string; note: string }[] = [
  { key: 'id', label: 'id', note: 'comparé par equals' },
  { key: 'email', label: 'email', note: 'comparé par equals' },
  { key: 'plan', label: 'plan', note: 'comparé par equals' },
  { key: 'apiToken', label: 'apiToken', note: 'secret' },
]

// Hash d'identité simulé : stable par objet, sans rapport avec ses champs.
const IDENTITY: Record<string, string> = { expected: '1b6d3586', actual: '4554617c', other: '74a14482' }

function render(c: Client, ref: string, custom: boolean, shown: Set<Field>, mask: boolean): string {
  if (!custom) return `Client@${IDENTITY[ref]}`
  const parts = FIELDS.filter((f) => shown.has(f.key)).map((f) =>
    f.key === 'apiToken' && mask ? 'apiToken=***' : `${f.key}=${c[f.key]}`,
  )
  return `Client[${parts.join(', ')}]`
}

export default function ToStringSurfaces() {
  const [custom, setCustom] = useState(false)
  const [shown, setShown] = useState<Set<Field>>(new Set(['id', 'email']))
  const [mask, setMask] = useState(false)

  const toggle = (f: Field) => {
    const next = new Set(shown)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    setShown(next)
  }

  const exp = render(EXPECTED, 'expected', custom, shown, mask)
  const act = render(ACTUAL, 'actual', custom, shown, mask)
  const oth = render(OTHER, 'other', custom, shown, mask)
  const leak = custom && shown.has('apiToken') && !mask
  const sameMessage = exp === act
  const useless = !custom

  const verdicts: { ok: boolean; text: string }[] = [
    useless
      ? { ok: false, text: 'Aucune valeur visible : impossible de savoir quel client est concerné.' }
      : { ok: true, text: 'Les valeurs apparaissent sur chaque surface, sans autre appel.' },
    sameMessage
      ? { ok: false, text: 'Le test affiche deux chaînes identiques : le champ qui diffère (plan) est invisible.' }
      : { ok: true, text: 'Le message d’assertion montre la différence.' },
    leak
      ? { ok: false, text: 'Le jeton d’API est écrit en clair dans les logs : il fuit vers tous ceux qui les lisent.' }
      : { ok: true, text: 'Aucun secret dans la chaîne.' },
  ]
  if (useless) verdicts[1] = { ok: false, text: 'Le test affiche deux hash sans rapport : on ne voit pas ce qui diffère.' }

  const surfaces: { title: string; body: string; warn: boolean }[] = [
    { title: 'Log de production', body: `WARN  facturation refusée pour ${act}`, warn: leak || useless },
    {
      title: 'Message d’assertion',
      body: `expected: <${exp}>\n but was: <${act}>`,
      warn: sameMessage || useless,
    },
    { title: 'Débogueur (variables)', body: `client = ${act}`, warn: leak || useless },
    { title: 'println(List.of(a, b))', body: `[${act}, ${oth}]`, warn: leak || useless },
  ]

  const btn = (active: boolean) =>
    `rounded-md border px-3 py-1.5 font-code text-xs ${active ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="Implémentation de toString">
        <button type="button" role="radio" aria-checked={!custom} onClick={() => setCustom(false)} className={btn(!custom)}>
          Object.toString()
        </button>
        <button type="button" role="radio" aria-checked={custom} onClick={() => setCustom(true)} className={btn(custom)}>
          toString() redéfini
        </button>
      </div>

      {custom && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Ce que ta méthode inclut :</p>
          <div className="flex flex-wrap gap-2">
            {FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={shown.has(f.key)}
                onClick={() => toggle(f.key)}
                className={btn(shown.has(f.key))}
              >
                {shown.has(f.key) ? '[x] ' : '[ ] '}
                {f.label}
                <span className={`ml-2 font-read ${f.key === 'apiToken' ? 'text-fail' : 'text-muted'}`}>({f.note})</span>
              </button>
            ))}
            {shown.has('apiToken') && (
              <button type="button" aria-pressed={mask} onClick={() => setMask(!mask)} className={btn(mask)}>
                {mask ? '[x] ' : '[ ] '}masquer le secret
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {surfaces.map((s) => (
          <div key={s.title} className={`rounded-xl border bg-surface p-3 ${s.warn ? 'border-fail/60' : 'border-line'}`}>
            <p className="mb-2 text-xs text-muted">{s.title}</p>
            <pre className="whitespace-pre-wrap break-all font-code text-xs">{s.body}</pre>
          </div>
        ))}
      </div>

      <ul role="status" className="grid gap-1 text-sm">
        {verdicts.map((v) => (
          <li key={v.text} className={v.ok ? 'text-pass' : 'text-fail'}>
            {v.ok ? 'OK : ' : 'Problème : '}
            {v.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
