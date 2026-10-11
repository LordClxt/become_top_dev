import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, type TunerPreview, type WSBlock } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatMetric } from './format'

type Props = {
  exerciseId: string
  block: WSBlock
  value: Record<string, number | string> | undefined
  /** Contenu complet d'answers.json : le calcul en direct passe par le backend, qui reste l'unique évaluateur. */
  answersJson: string
  onChange: (v: Record<string, number>) => void
}

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return d
}

/** Curseurs, métriques calculées en direct, contraintes à satisfaire. */
export function Tuner({ exerciseId, block, value, onChange }: Props & { block: WSBlock }) {
  const current = Object.fromEntries(
    block.params.map((p) => {
      const raw = value?.[p.id]
      const n = typeof raw === 'string' ? Number(raw) : raw
      return [p.id, Number.isFinite(n) ? (n as number) : p.default]
    }),
  )
  const key = useDebounced(JSON.stringify(current), 160)
  const { data } = useQuery<Record<string, TunerPreview>>({
    queryKey: ['preview', exerciseId, block.id, key],
    queryFn: () => api.preview(exerciseId, { 'answers.json': JSON.stringify({ [block.id]: JSON.parse(key) }) }),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })
  const preview = data?.[block.id]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {block.params.map((p) => {
          const v = current[p.id] ?? p.default
          const fill = ((v - p.min) / (p.max - p.min)) * 100
          return (
            <label key={p.id} className="grid gap-2">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="font-code text-accent tabular-nums">
                  {v.toLocaleString('fr-FR')} {p.unit}
                </span>
              </span>
              <input
                type="range"
                className="ws-slider"
                style={{ ['--fill' as string]: `${fill}%` }}
                min={p.min}
                max={p.max}
                step={p.step}
                value={v}
                aria-label={p.label}
                onChange={(e) => onChange({ ...current, [p.id]: Number(e.target.value) })}
              />
              <span className="flex justify-between font-code text-[0.68rem] text-muted tabular-nums">
                <span>{p.min.toLocaleString('fr-FR')}</span>
                <span>{p.max.toLocaleString('fr-FR')}</span>
              </span>
            </label>
          )
        })}
      </div>

      <div className="grid content-start gap-4">
        {block.metrics.length > 0 && (
          <dl className="grid grid-cols-2 gap-2.5">
            {block.metrics.map((m) => (
              <div key={m.id} className="rounded-xl border border-line bg-ink px-3 py-2.5">
                <dt className="text-xs text-muted">{m.label}</dt>
                <dd className="mt-0.5 font-code text-lg font-semibold tabular-nums">
                  {preview && m.id in preview.metrics ? formatMetric(preview.metrics[m.id]!, m.format, m.unit) : '…'}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="grid gap-1.5" aria-label="Contraintes">
          {block.goals.map((g) => {
            const ok = preview?.goals[g.id]
            return (
              <li
                key={g.id}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors duration-(--dur-fast)',
                  ok ? 'border-pass/50 bg-pass/10' : 'border-line',
                )}
              >
                <span
                  className={cn('grid size-5 shrink-0 place-items-center rounded-full', ok ? 'bg-pass text-ink' : 'bg-surface-2 text-muted')}
                  aria-hidden="true"
                >
                  {ok ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <span className="sr-only">{ok ? 'Satisfaite : ' : 'Non satisfaite : '}</span>
                {g.label}
              </li>
            )
          })}
        </ul>
        {preview?.error && <p className="text-xs text-fail">{preview.error}</p>}
      </div>
    </div>
  )
}
