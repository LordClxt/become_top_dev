import { Handle, NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Copy, Power, Trash2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { familyOf } from './catalog'
import { type CNode, useEditor } from './context'
import { ComponentIcon } from './icons'

const SIDES = [
  [Position.Top, 'top'],
  [Position.Right, 'right'],
  [Position.Bottom, 'bottom'],
  [Position.Left, 'left'],
] as const

/** Quatre poignées par bloc : on tire depuis n'importe laquelle, la flèche s'accroche toute seule au bord le plus proche. */
function Handles() {
  return SIDES.map(([position, id]) => <Handle key={id} id={id} type="source" position={position} />)
}

export const ComponentNode = memo(function ComponentNode({ id, data, selected }: NodeProps<CNode>) {
  const ed = useEditor()
  const comp = ed.catalog.components.get(data.component)
  const error = ed.errors.get(id)
  const flag = ed.flags.get(id)
  const role = data.props.role
  const keys = data.component === 'btree-page' ? data.props.keys : undefined
  const itemLabel = ed.palette.get(data.itemType)?.label
  const sub =
    itemLabel && itemLabel !== data.label
      ? itemLabel
      : comp && comp.label !== data.label
        ? comp.label
        : (ed.catalog.categories.get(comp?.category ?? '')?.label ?? '')

  const [editing, setEditing] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  return (
    <div
      className="dnode"
      style={{ '--fam': familyOf(ed.catalog, data.component) } as React.CSSProperties}
      data-selected={selected}
      data-state={flag === 'down' ? 'down' : error ? 'error' : undefined}
      data-sim={flag && flag !== 'down' ? flag : undefined}
      onDoubleClick={() => setEditing(true)}
      title={error}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
        <div className="dpanel">
          <button type="button" className="dtool" onClick={() => ed.actions.duplicate(id)} aria-label="Dupliquer">
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            className="dtool"
            aria-pressed={flag === 'down'}
            onClick={() => ed.actions.toggleDown(id)}
            aria-label="Simuler une panne"
            title="Simuler une panne"
          >
            <Power className="size-3.5" />
          </button>
          <button type="button" className="dtool" onClick={() => ed.actions.remove(id)} aria-label="Supprimer">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </NodeToolbar>
      <Handles />
      <span className="dnode-icon">
        <ComponentIcon name={comp?.icon ?? 'boxes'} />
      </span>
      <span className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={input}
            defaultValue={data.label}
            className="nodrag w-full rounded-md border border-line bg-ink px-1.5 py-0.5 text-[0.84rem] font-semibold text-text outline-none focus:border-accent"
            maxLength={40}
            onBlur={(e) => {
              ed.actions.rename(id, e.currentTarget.value.trim() || data.label)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
              e.stopPropagation()
            }}
          />
        ) : (
          <span className="dnode-title block">{data.label}</span>
        )}
        {keys !== undefined ? (
          <span className="dnode-keys block">{keys.trim() || '·····'}</span>
        ) : (
          sub && <span className="dnode-sub block">{sub}</span>
        )}
        {role && keys === undefined && <span className="dnode-chip">{role}</span>}
      </span>
      {error && !flag && <span className="dnode-badge" aria-label={`À corriger : ${error}`}>!</span>}
    </div>
  )
})

export const ZoneNode = memo(function ZoneNode({ data, selected }: NodeProps<CNode>) {
  return (
    <div className="dzone" data-selected={selected}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={140} lineClassName="!border-accent" handleClassName="!bg-accent !border-ink" />
      <span className="dzone-label">{data.label}</span>
    </div>
  )
})

export const NODE_TYPES = { component: ComponentNode, zone: ZoneNode }

