import { useState } from 'react'

export const id = 'arch-ch07-pipeline-builder'

type Metric = { kind: 'duration' | 'uptime' | 'db-wait' | 'cpu'; value: number }
const STREAM: Metric[] = [
  { kind: 'duration', value: 42 }, { kind: 'cpu', value: 71 }, { kind: 'uptime', value: 1 },
  { kind: 'db-wait', value: 12 }, { kind: 'duration', value: 7 }, { kind: 'db-wait', value: 30 },
]
const TESTERS = [
  { kind: 'duration', label: 'Duration Filter → Duration Calculator' },
  { kind: 'uptime', label: 'Uptime Filter → Uptime Calculator' },
  { kind: 'db-wait', label: 'Connection Wait Filter → Calculator (nouveau)' },
] as const

export default function PipelineBuilder() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ duration: true, uptime: true, 'db-wait': false })
  const routed = STREAM.map((m) => {
    const t = TESTERS.find((x) => x.kind === m.kind && enabled[x.kind])
    return { m, out: t ? `${m.kind}:${m.value}` : null }
  })
  return (
    <div className="grid gap-4">
      <p className="text-sm"><span className="font-code text-accent">Kafka → Service Info Capture</span> (producteur) puis la cascade de testeurs :</p>
      <div className="grid gap-2">
        {TESTERS.map((t) => (
          <button key={t.kind} type="button" onClick={() => setEnabled({ ...enabled, [t.kind]: !enabled[t.kind] })}
            className={`rounded-md border px-3 py-1 text-left text-sm ${enabled[t.kind] ? 'border-accent text-text' : 'border-line text-muted'}`}>
            {enabled[t.kind] ? '✓ ' : '+ '}{t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-1">
        {routed.map(({ m, out }, k) => (
          <div key={k} className="flex items-center gap-2 font-code text-xs">
            <span className="w-28 text-muted">{m.kind} {m.value}</span>
            <span>→</span>
            <span className={out ? 'text-pass' : 'text-fail'}>{out ? `Database Output (${out})` : 'écarté : aucun testeur intéressé'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Ajouter un testeur ne modifie aucun des filtres existants.</p>
    </div>
  )
}
