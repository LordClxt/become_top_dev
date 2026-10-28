import { useState } from 'react'

export const id = 'arch-ch10-data-loss'

const PROTECTIONS = [
  { key: 'persist', label: 'Files persistantes + envoi synchrone', saves: 'broker' },
  { key: 'ack', label: 'Acquittement client', saves: 'consumer' },
  { key: 'lps', label: 'Transaction ACID + LPS', saves: 'db' },
] as const
const FAILURES = [
  { key: 'broker', label: '① Le broker redémarre avant la lecture', lost: 20 },
  { key: 'consumer', label: '② Le consommateur plante après la lecture', lost: 12 },
  { key: 'db', label: '③ L’écriture en base échoue', lost: 7 },
] as const

export default function DataLoss() {
  const [on, setOn] = useState<Record<string, boolean>>({ persist: false, ack: false, lps: false })
  const losses = FAILURES.map((f) => ({ ...f, lost: PROTECTIONS.some((p) => p.saves === f.key && on[p.key]) ? 0 : f.lost }))
  const total = losses.reduce((s, f) => s + f.lost, 0)
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">1 000 messages traversent A → file → B → base. Trois pannes surviennent. Active les protections.</p>
      <div className="flex flex-wrap gap-2">
        {PROTECTIONS.map((p) => (
          <button key={p.key} type="button" onClick={() => setOn({ ...on, [p.key]: !on[p.key] })}
            className={`rounded-md border px-3 py-1 text-sm ${on[p.key] ? 'border-pass text-pass' : 'border-line text-muted'}`}>{on[p.key] ? '✓ ' : ''}{p.label}</button>
        ))}
      </div>
      <div className="grid gap-1">
        {losses.map((f) => (
          <div key={f.key} className={`flex justify-between rounded-md border px-3 py-1 text-xs ${f.lost ? 'border-fail text-fail' : 'border-pass text-pass'}`}>
            <span>{f.label}</span><span className="font-code">{f.lost ? `${f.lost} perdus` : 'aucune perte'}</span>
          </div>
        ))}
      </div>
      <p className={`font-code text-sm ${total ? 'text-fail' : 'text-pass'}`}>messages perdus : {total} / 1 000</p>
    </div>
  )
}
