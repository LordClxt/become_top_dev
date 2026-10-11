import { Copy, Power, Trash2, X } from 'lucide-react'
import type { EdgeKind } from '@/lib/api'
import { cn } from '@/lib/utils'
import { type CatalogIndex, EDGE_KINDS, familyOf } from './catalog'
import type { CNode, EdgeData } from './context'
import { ComponentIcon } from './icons'

type EdgeSel = { id: string; sourceLabel: string; targetLabel: string; data: EdgeData }

type Props = {
  catalog: CatalogIndex
  node?: CNode
  edge?: EdgeSel
  down: boolean
  onNode: (id: string, patch: { label?: string; props?: Record<string, string> }) => void
  onEdge: (id: string, patch: Partial<EdgeData>) => void
  onRemove: () => void
  onDuplicate: () => void
  onToggleDown: () => void
  onClose: () => void
}

/** Panneau flottant : les propriétés du bloc ou de la flèche sélectionné(e). */
export function Inspector({ catalog, node, edge, down, onNode, onEdge, onRemove, onDuplicate, onToggleDown, onClose }: Props) {
  if (!node && !edge) return null
  const comp = node ? catalog.components.get(node.data.component) : undefined

  return (
    <section
      className="dpanel !block w-[252px] max-w-full !p-3"
      aria-label={node ? 'Propriétés du bloc' : 'Propriétés de la flèche'}
      style={node ? ({ '--fam': familyOf(catalog, node.data.component) } as React.CSSProperties) : undefined}
    >
      <header className="flex items-center gap-2">
        {node && comp && (
          <span className="dnode-icon !size-8 !rounded-[9px]">
            <ComponentIcon name={comp.icon} className="!size-4" />
          </span>
        )}
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{node ? (comp?.label ?? 'Bloc') : 'Flèche'}</h3>
        <button type="button" className="dtool" onClick={onClose} aria-label="Fermer le panneau">
          <X className="size-3.5" />
        </button>
      </header>

      {node && (
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs text-muted">
            Nom
            <input
              value={node.data.label}
              maxLength={40}
              onChange={(e) => onNode(node.id, { label: e.target.value })}
              className="h-8 rounded-lg border border-line bg-ink px-2.5 text-sm text-text outline-none focus-visible:border-accent"
            />
          </label>
          {comp?.props.map((spec) => (
            <div key={spec.id} className="grid gap-1 text-xs text-muted">
              <span id={`prop-${spec.id}`}>{spec.label}</span>
              {spec.options.length > 0 ? (
                <div role="radiogroup" aria-labelledby={`prop-${spec.id}`} className="flex flex-wrap gap-1.5">
                  {spec.options.map((opt) => {
                    const on = (node.data.props[spec.id] ?? spec.default) === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onNode(node.id, { props: { ...node.data.props, [spec.id]: opt } })}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors duration-(--dur-fast)',
                          on ? 'border-[var(--fam)] bg-[color-mix(in_oklab,var(--fam)_16%,transparent)] text-[var(--fam)]' : 'border-line text-text hover:border-muted',
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <input
                  value={node.data.props[spec.id] ?? spec.default}
                  onChange={(e) => onNode(node.id, { props: { ...node.data.props, [spec.id]: e.target.value } })}
                  placeholder={spec.id === 'keys' ? 'ex. 10 20 30' : ''}
                  aria-labelledby={`prop-${spec.id}`}
                  className="h-8 rounded-lg border border-line bg-ink px-2.5 font-code text-sm text-text outline-none focus-visible:border-accent"
                />
              )}
            </div>
          ))}
          <div className="flex gap-1.5 border-t border-line pt-3">
            <button type="button" className="dtool !border !border-line" onClick={onDuplicate}>
              <Copy className="size-3.5" /> Dupliquer
            </button>
            <button type="button" className="dtool !border !border-line" aria-pressed={down} onClick={onToggleDown}>
              <Power className="size-3.5" /> Panne
            </button>
            <button type="button" className="dtool !border !border-line" onClick={onRemove} aria-label="Supprimer le bloc">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {edge && (
        <div className="mt-3 grid gap-3">
          <p className="text-xs text-muted">
            {edge.sourceLabel} <span aria-hidden="true">→</span> {edge.targetLabel}
          </p>
          <div className="grid gap-1 text-xs text-muted">
            <span id="edge-kind">Nature</span>
            <div role="radiogroup" aria-labelledby="edge-kind" className="grid gap-1.5">
              {EDGE_KINDS.map((k) => {
                const on = edge.data.kind === k.kind
                return (
                  <button
                    key={k.kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onEdge(edge.id, { kind: k.kind as EdgeKind })}
                    style={{ '--k': k.color } as React.CSSProperties}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors duration-(--dur-fast)',
                      on ? 'border-[var(--k)] bg-[color-mix(in_oklab,var(--k)_12%,transparent)] text-text' : 'border-line text-text hover:border-muted',
                    )}
                  >
                    <svg width="28" height="8" aria-hidden="true">
                      <line
                        x1="1"
                        y1="4"
                        x2="27"
                        y2="4"
                        stroke="var(--k)"
                        strokeWidth={k.kind === 'replication' ? 4 : 2}
                        strokeDasharray={k.kind === 'async' ? '5 4' : undefined}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="min-w-0">
                      <span className="block font-medium">{k.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <label className="grid gap-1 text-xs text-muted">
            Étiquette
            <input
              value={edge.data.label}
              maxLength={30}
              placeholder="ex. GET /user"
              onChange={(e) => onEdge(edge.id, { label: e.target.value })}
              className="h-8 rounded-lg border border-line bg-ink px-2.5 text-sm text-text outline-none focus-visible:border-accent"
            />
          </label>
          <div className="border-t border-line pt-3">
            <button type="button" className="dtool !border !border-line" onClick={onRemove}>
              <Trash2 className="size-3.5" /> Supprimer la flèche
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
