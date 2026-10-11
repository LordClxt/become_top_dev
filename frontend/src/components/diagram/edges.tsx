import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react'
import { memo } from 'react'
import { edgeColor } from './catalog'
import { type EdgeData, useEditor } from './context'

type Rect = { x: number; y: number; w: number; h: number }

function rectOf(n: InternalNode): Rect {
  const { x, y } = n.internals.positionAbsolute
  return { x, y, w: n.measured.width ?? 200, h: n.measured.height ?? 60 }
}

/** Point où le segment centre→cible sort du rectangle, et le côté touché. */
function border(r: Rect, toward: { x: number; y: number }) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const dx = toward.x - cx
  const dy = toward.y - cy
  const kx = Math.abs(dx) / (r.w / 2 || 1)
  const ky = Math.abs(dy) / (r.h / 2 || 1)
  const k = Math.max(kx, ky) || 1
  const side = kx > ky ? (dx > 0 ? Position.Right : Position.Left) : dy > 0 ? Position.Bottom : Position.Top
  return { x: cx + dx / k, y: cy + dy / k, side }
}

const DURATION = { sync: 2.8, read: 2.8, write: 2.8, async: 4.2, replication: 3.4 } as const
const PULSE_COLOR = { req: 'var(--accent)', res: 'var(--pass)', async: 'var(--c-orange)', repl: 'var(--c-violet)', fail: 'var(--fail)' } as const

/** Flèche « flottante » : elle part du bord du bloc le plus proche, sans dépendre d'une poignée précise. */
export const FlowEdge = memo(function FlowEdge({ id, source, target, markerEnd, data, selected }: EdgeProps) {
  const ed = useEditor()
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t) return null
  const kind = (data as EdgeData | undefined)?.kind ?? 'sync'
  const label = (data as EdgeData | undefined)?.label ?? ''
  const a = rectOf(s)
  const b = rectOf(t)
  const sp = border(a, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
  const tp = border(b, { x: a.x + a.w / 2, y: a.y + a.h / 2 })
  const [path, labelX, labelY] = getBezierPath({
    sourceX: sp.x,
    sourceY: sp.y,
    sourcePosition: sp.side,
    targetX: tp.x,
    targetY: tp.y,
    targetPosition: tp.side,
    curvature: 0.28,
  })
  const color = edgeColor(kind)
  const error = ed.errors.get(id) ?? ed.errors.get(`${source}>${target}`)
  const pulses = ed.pulses.filter((p) => p.edge === id)

  return (
    <g
      className="fedge"
      data-kind={kind}
      data-selected={selected}
      data-state={error ? 'error' : undefined}
      style={{ '--edge': color } as React.CSSProperties}
    >
      <path className="fedge-path fedge-base" d={path} markerEnd={kind === 'replication' ? undefined : markerEnd} />
      {kind === 'replication' && <path className="fedge-path fedge-core" d={path} markerEnd={markerEnd} />}
      {/* zone de clic confortable */}
      <BaseEdge path={path} interactionWidth={22} style={{ stroke: 'transparent', fill: 'none' }} />
      {ed.flow && !error && (
        <>
          <circle className="fedge-dot" r="3">
            <animateMotion dur={`${DURATION[kind]}s`} repeatCount="indefinite" path={path} />
          </circle>
          <circle className="fedge-dot" r="3">
            <animateMotion dur={`${DURATION[kind]}s`} begin={`-${DURATION[kind] / 2}s`} repeatCount="indefinite" path={path} />
          </circle>
        </>
      )}
      {pulses.map((p) => (
        <circle key={p.key} className="fedge-pulse" r="6" style={{ '--pulse': PULSE_COLOR[p.tone] } as React.CSSProperties}>
          <animateMotion
            dur="0.62s"
            fill="freeze"
            path={path}
            calcMode="linear"
            keyPoints={p.reverse ? '1;0' : '0;1'}
            keyTimes="0;1"
          />
        </circle>
      ))}
      {(label || selected) && (
        <EdgeLabelRenderer>
          <div
            className="fedge-label nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, ['--edge' as string]: color }}
          >
            {label || kindLabel(kind)}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  )
})

function kindLabel(kind: string): string {
  return { sync: 'appel', async: 'asynchrone', read: 'lecture', write: 'écriture', replication: 'réplication' }[kind] ?? kind
}

export const EDGE_TYPES = { flow: FlowEdge }
