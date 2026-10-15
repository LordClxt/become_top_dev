import { Reorder } from 'motion/react'
import { ArrowDown, ArrowUp, Check, GripVertical } from 'lucide-react'
import { useState } from 'react'
import type { WSBlock, WSOption } from '@/lib/api'
import { cn } from '@/lib/utils'

export type Answer = unknown

/** Réponse à un bloc : valeur courante et fonction pour la changer. */
type Props<T = Answer> = { block: WSBlock; value: T | undefined; onChange: (v: T) => void }

export function NumberBlock({ block, value, onChange }: Props<string | number>) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        className="ws-input w-44 text-right tabular-nums"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={block.title}
        placeholder="0"
        autoComplete="off"
      />
      {block.unit && <span className="text-sm text-muted">{block.unit}</span>}
    </div>
  )
}

export function ChoiceBlock({ block, value, onChange }: Props<string>) {
  return (
    <div role="radiogroup" aria-label={block.title} className="grid gap-2 sm:grid-cols-2">
      {block.options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className="ws-option"
          onClick={() => onChange(o.id)}
        >
          <span className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
                value === o.id ? 'border-accent bg-accent' : 'border-muted',
              )}
              aria-hidden="true"
            >
              {value === o.id && <span className="size-1.5 rounded-full bg-ink" />}
            </span>
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{o.hint}</span>}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function MultiBlock({ block, value, onChange }: Props<string[]>) {
  const chosen = new Set(value ?? [])
  const toggle = (id: string) => {
    const next = new Set(chosen)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(block.options.filter((o) => next.has(o.id)).map((o) => o.id))
  }
  return (
    <div role="group" aria-label={block.title} className="grid gap-2 sm:grid-cols-2">
      {block.options.map((o) => (
        <button key={o.id} type="button" role="checkbox" aria-checked={chosen.has(o.id)} className="ws-option" onClick={() => toggle(o.id)}>
          <span className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border',
                chosen.has(o.id) ? 'border-accent bg-accent text-accent-ink' : 'border-muted',
              )}
              aria-hidden="true"
            >
              {chosen.has(o.id) && <Check className="size-3" strokeWidth={3.5} />}
            </span>
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{o.hint}</span>}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function OrderBlock({ block, value, onChange }: Props<string[]>) {
  const ids = value && value.length === block.items.length ? value : block.items.map((i) => i.id)
  const byId = new Map(block.items.map((i) => [i.id, i]))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return
    const next = [...ids]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x!)
    onChange(next)
  }
  return (
    <div>
      <Reorder.Group axis="y" values={ids} onReorder={onChange} className="grid gap-2" aria-label={block.title}>
        {ids.map((id, i) => {
          const item = byId.get(id)
          if (!item) return null
          return (
            <Reorder.Item
              key={id}
              value={id}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-line bg-ink px-3 py-2.5 active:cursor-grabbing"
              whileDrag={{ scale: 1.015, boxShadow: '0 12px 28px -14px rgba(0,0,0,.6)' }}
            >
              <GripVertical className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 font-code text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm">
                {item.label}
                {item.hint && <span className="block text-xs text-muted">{item.hint}</span>}
              </span>
              <span className="flex shrink-0 gap-0.5">
                <button type="button" className="dtool" aria-label={`Monter « ${item.label} »`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" className="dtool" aria-label={`Descendre « ${item.label} »`} disabled={i === ids.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown className="size-3.5" />
                </button>
              </span>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
      {!value && <p className="mt-2 text-xs text-muted">Glisse les lignes ou utilise les flèches, puis vérifie.</p>}
    </div>
  )
}

export function MatchBlock({ block, value, onChange }: Props<Record<string, string>>) {
  const placed = value ?? {}
  const [picked, setPicked] = useState<string | null>(null)
  const place = (item: string, cat: string) => {
    onChange({ ...placed, [item]: cat })
    setPicked(null)
  }
  const unplace = (item: string) => {
    const next = { ...placed }
    delete next[item]
    onChange(next)
  }
  const pool = block.items.filter((i) => !placed[i.id])
  const chip = (it: WSOption, inCat: boolean) => (
    <button
      key={it.id}
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', it.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => setPicked(picked === it.id ? null : it.id)}
      aria-pressed={picked === it.id}
      className={cn(
        'cursor-grab rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors duration-(--dur-fast) active:cursor-grabbing',
        picked === it.id ? 'border-accent bg-accent/12' : 'border-line bg-surface hover:border-muted',
        inCat && 'bg-ink',
      )}
    >
      {it.label}
    </button>
  )
  return (
    <div>
      <div
        className="min-h-14 rounded-xl border border-dashed border-line p-2.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          unplace(e.dataTransfer.getData('text/plain'))
        }}
      >
        <p className="mb-1.5 text-xs text-muted">{pool.length ? 'À ranger' : 'Tout est rangé'}</p>
        <div className="flex flex-wrap gap-2">{pool.map((i) => chip(i, false))}</div>
      </div>
      <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(block.categories.length, 3)}, minmax(0, 1fr))` }}>
        {block.categories.map((c) => (
          <div
            key={c.id}
            role="group"
            aria-label={c.label}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) place(id, c.id)
            }}
            onClick={() => picked && place(picked, c.id)}
            className={cn(
              'min-h-24 rounded-xl border bg-ink p-2.5 transition-colors duration-(--dur-fast)',
              picked ? 'cursor-pointer border-accent/60 hover:bg-accent/8' : 'border-line',
            )}
          >
            <p className="text-sm font-medium">{c.label}</p>
            {c.hint && <p className="text-xs text-muted">{c.hint}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {block.items.filter((i) => placed[i.id] === c.id).map((i) => chip(i, true))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Glisse un élément dans une catégorie, ou clique l’élément puis la catégorie.</p>
    </div>
  )
}

export function TableBlock({ block, value, onChange }: Props<Record<string, string>>) {
  const cells = value ?? {}
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-2 text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium" />
            {block.columns.map((c) => (
              <th key={c.id} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {r.label}
              </th>
              {block.columns.map((c) => {
                const given = r.cells?.[c.id]
                return (
                  <td key={c.id} className="px-2 py-1.5">
                    {given !== undefined ? (
                      <span className="px-1 font-code text-[0.85rem]">{given}</span>
                    ) : (
                      <input
                        className="ws-input !h-8 w-full"
                        value={cells[`${r.id}.${c.id}`] ?? ''}
                        onChange={(e) => onChange({ ...cells, [`${r.id}.${c.id}`]: e.target.value })}
                        aria-label={`${r.label}, ${c.label}`}
                        autoComplete="off"
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
