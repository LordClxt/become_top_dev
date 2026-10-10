/**
 * Éditeur de nœuds façon n8n, bâti sur React Flow (@xyflow/react) : on pose des blocs depuis la palette,
 * on les relie dans le sens où circulent les données. Le graphe est sérialisé dans diagram.json.
 */
import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Building2,
  Database,
  Layers,
  type LucideIcon,
  MonitorSmartphone,
  Server,
  Zap,
} from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DiagramGraph, PaletteItem } from '@/lib/api'
import { cn } from '@/lib/utils'

export const SHAPE_ICON: Record<PaletteItem['shape'], LucideIcon> = {
  client: MonitorSmartphone,
  service: Server,
  queue: Layers,
  database: Database,
  external: Building2,
  cache: Zap,
}

type BlockData = { item: PaletteItem }
type BlockNode = Node<BlockData, 'block'>

const DRAG_TYPE = 'application/x-btd-block'

/** Une flèche qui touche une file est asynchrone : pointillée et animée. */
function styleEdge(edge: Edge, shapes: Map<string, PaletteItem['shape']>): Edge {
  const async = shapes.get(edge.source) === 'queue' || shapes.get(edge.target) === 'queue'
  return {
    ...edge,
    type: 'smoothstep',
    animated: async,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: async ? 'var(--accent)' : 'var(--text-muted)' },
    className: async ? 'edge-async' : 'edge-sync',
  }
}

export function parseGraph(raw: string): DiagramGraph {
  try {
    const g = JSON.parse(raw) as Partial<DiagramGraph>
    return { nodes: g.nodes ?? [], edges: g.edges ?? [] }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export function DiagramEditor(props: {
  palette: PaletteItem[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  )
}

function Editor({ palette, value, onChange }: { palette: PaletteItem[]; value: string; onChange: (v: string) => void }) {
  const byType = useMemo(() => new Map(palette.map((p) => [p.type, p])), [palette])
  // Seul l'état de départ vient de `value` : pour repartir de zéro, le parent remonte l'éditeur (key).
  const [initial] = useState(() => parseGraph(value))
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNode>(
    initial.nodes.flatMap((n) => {
      const item = byType.get(n.type)
      return item ? [{ id: n.id, type: 'block' as const, position: { x: n.x, y: n.y }, data: { item } }] : []
    }),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initial.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  )
  const { screenToFlowPosition, fitView } = useReactFlow()

  // Cadrage une fois les blocs mesurés (le `fitView` initial se trompe tant que leur taille est inconnue).
  const measured = useNodesInitialized()
  const framed = useRef(false)
  useEffect(() => {
    if (measured && !framed.current) {
      framed.current = true
      fitView({ padding: 0.15, maxZoom: 1 })
    }
  }, [measured, fitView])
  const wrapper = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  const shapes = useMemo(() => new Map(nodes.map((n) => [n.id, n.data.item.shape])), [nodes])
  const styledEdges = useMemo(() => edges.map((e) => styleEdge(e, shapes)), [edges, shapes])

  // Le parent reçoit le graphe sérialisé à chaque changement (positions arrondies : un JSON stable).
  const emit = useRef(onChange)
  emit.current = onChange
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const graph: DiagramGraph = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.data.item.type, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }
    emit.current(JSON.stringify(graph, null, 2))
  }, [nodes, edges])

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return
      setEdges((list) =>
        list.some((e) => e.source === c.source && e.target === c.target)
          ? list
          : addEdge({ ...c, id: `e-${c.source}-${c.target}` }, list),
      )
    },
    [setEdges],
  )

  const addBlock = useCallback(
    (item: PaletteItem, at?: { x: number; y: number }) => {
      const rect = wrapper.current?.getBoundingClientRect()
      const position =
        at ??
        screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 80 + (seq.current % 4) * 24,
          y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 30 + (seq.current % 4) * 24,
        })
      seq.current += 1
      const id = `${item.type}-${Date.now().toString(36)}-${seq.current}`
      setNodes((list) => [...list, { id, type: 'block', position, data: { item }, selected: true }])
    },
    [screenToFlowPosition, setNodes],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const item = byType.get(e.dataTransfer.getData(DRAG_TYPE))
    if (item) addBlock(item, screenToFlowPosition({ x: e.clientX - 80, y: e.clientY - 28 }))
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
      <aside className="overflow-y-auto border-r border-line bg-ink p-3" aria-label="Palette de blocs">
        <p className="px-1 pb-2 text-xs text-muted">Glisse un bloc sur le canvas, ou clique pour l’ajouter.</p>
        <ul className="grid gap-1.5">
          {palette.map((item) => {
            const Icon = SHAPE_ICON[item.shape]
            return (
              <li key={item.type}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_TYPE, item.type)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => addBlock(item)}
                  title={item.hint}
                  className="flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-left text-sm transition-colors duration-(--dur-fast) hover:border-accent active:cursor-grabbing"
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-md',
                      item.shape === 'queue' ? 'border border-dashed border-accent text-accent' : 'bg-accent/12 text-accent',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 grid gap-2 border-t border-line px-1 pt-3 text-xs text-muted">
          <p className="flex items-center gap-2">
            <span className="h-0.5 w-6 bg-text/70" /> appel direct
          </p>
          <p className="flex items-center gap-2">
            <span className="h-0 w-6 border-t-2 border-dashed border-accent" /> via une file, asynchrone
          </p>
          <p className="mt-1 leading-relaxed">
            Relie la pastille droite d’un bloc à la pastille gauche d’un autre. Sélectionne puis{' '}
            <kbd className="font-code">Suppr</kbd> pour effacer.
          </p>
        </div>
      </aside>

      <div ref={wrapper} className="diagram-canvas min-h-0" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={['Backspace', 'Delete']}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}

function Block({ data, selected }: NodeProps<BlockNode>) {
  const { item } = data
  const Icon = SHAPE_ICON[item.shape]
  const queue = item.shape === 'queue'
  return (
    <div
      className={cn(
        'flex w-40 items-center gap-2.5 rounded-xl border-2 bg-surface px-3 py-2.5 transition-colors duration-(--dur-fast)',
        queue ? 'border-dashed border-accent/70' : 'border-line',
        selected && 'border-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_22%,transparent)]',
      )}
    >
      <Handle type="target" position={Position.Left} />
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          item.shape === 'external' ? 'border border-line text-muted' : 'bg-accent/12 text-accent',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 text-sm leading-tight font-medium text-text">{item.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const NODE_TYPES = { block: Block }
