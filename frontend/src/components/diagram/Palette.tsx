import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { forwardRef, useMemo, useState } from 'react'
import type { PaletteItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { type CatalogIndex, familyOf } from './catalog'
import { ComponentIcon } from './icons'

export const DRAG_TYPE = 'application/x-btd-block'

type Props = {
  palette: PaletteItem[]
  catalog: CatalogIndex
  onAdd: (item: PaletteItem) => void
  collapsed: boolean
  onToggle: () => void
}

/** Palette de blocs : recherche, familles repliables, glisser-déposer ou clic pour ajouter. */
export const Palette = forwardRef<HTMLInputElement, Props>(function Palette({ palette, catalog, onAdd, collapsed, onToggle }, ref) {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: { id: string; label: string; items: PaletteItem[] }[] = []
    for (const cat of catalog.categories.values()) {
      const items = palette.filter((p) => {
        const comp = catalog.components.get(p.component)
        return comp?.category === cat.id && (!q || `${p.label} ${comp?.label ?? ''} ${p.hint}`.toLowerCase().includes(q))
      })
      if (items.length) out.push({ id: cat.id, label: cat.label, items })
    }
    return out
  }, [palette, catalog, query])

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center gap-2 border-r border-line bg-ink py-3" aria-label="Palette de blocs (réduite)">
        <button type="button" className="dtool" onClick={onToggle} aria-label="Ouvrir la palette">
          <PanelLeftOpen className="size-4" />
        </button>
        {palette.slice(0, 9).map((item) => (
          <button
            key={item.type}
            type="button"
            title={item.label}
            onClick={() => onAdd(item)}
            className="dnode-icon !size-9 !rounded-[10px]"
            style={{ '--fam': familyOf(catalog, item.component) } as React.CSSProperties}
          >
            <ComponentIcon name={catalog.components.get(item.component)?.icon ?? 'boxes'} />
          </button>
        ))}
      </aside>
    )
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-ink" aria-label="Palette de blocs">
      <div className="flex items-center gap-1.5 p-2.5 pb-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={ref}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              const first = groups[0]?.items[0]
              if (e.key === 'Enter' && first) onAdd(first)
              if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
            }}
            placeholder="Chercher un bloc  ( / )"
            aria-label="Chercher un bloc"
            className="h-8 w-full rounded-lg border border-line bg-surface pr-2 pl-8 text-[0.8rem] outline-none placeholder:text-muted focus-visible:border-accent"
          />
        </label>
        <button type="button" className="dtool" onClick={onToggle} aria-label="Réduire la palette">
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {groups.length === 0 && <p className="px-1 py-4 text-sm text-muted">Aucun bloc ne correspond.</p>}
        {groups.map((g) => {
          const open = !closed.has(g.id) || query !== ''
          return (
            <section key={g.id} className="mt-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setClosed((c) => { const n = new Set(c); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
                className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-xs font-medium text-muted hover:text-text"
              >
                {g.label}
                <ChevronDown className={cn('size-3.5 transition-transform duration-(--dur-fast)', !open && '-rotate-90')} />
              </button>
              {open && (
                <ul className="mt-1 grid gap-1.5">
                  {g.items.map((item) => (
                    <li key={item.type}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_TYPE, item.type)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onClick={() => onAdd(item)}
                        title={item.hint}
                        style={{ '--fam': familyOf(catalog, item.component) } as React.CSSProperties}
                        className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-line bg-surface p-1.5 pr-2.5 text-left transition-colors duration-(--dur-fast) hover:border-[color-mix(in_oklab,var(--fam)_60%,var(--line))] active:cursor-grabbing"
                      >
                        <span className="dnode-icon !size-8 !rounded-[9px]">
                          <ComponentIcon name={catalog.components.get(item.component)?.icon ?? 'boxes'} className="!size-4" />
                        </span>
                        <span className="min-w-0 text-[0.8rem] leading-tight font-medium">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
})
