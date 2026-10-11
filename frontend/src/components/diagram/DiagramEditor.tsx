/**
 * Éditeur de schémas d'architecture façon n8n, bâti sur React Flow (@xyflow/react).
 *
 * On pose des composants du catalogue (bases, caches, files, services…), on les relie par des flèches typées
 * (appel, asynchrone, lecture, écriture, réplication) et on les range dans des zones. Le graphe est sérialisé dans
 * diagram.json (format v2 : voir `DiagramGraph`). Un mode « Simuler » fait voyager une requête dans le schéma.
 */
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Activity,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Maximize,
  Play,
  Redo2,
  Repeat,
  Undo2,
  Waves,
} from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DiagramGraph, EdgeKind, PaletteItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { type CatalogIndex, defaultKind, edgeColor, familyOf, indexCatalog, catalogQuery } from './catalog'
import {
  type CNode,
  type EdgeData,
  EditorContext,
  type EditorCtx,
  type NodeFlag,
  type Pulse,
} from './context'
import { EDGE_TYPES } from './edges'
import { Inspector } from './Inspector'
import { layeredLayout } from './layout'
import { NODE_TYPES } from './nodes'
import { DRAG_TYPE, Palette } from './Palette'
import { plan, type SimGraph } from './simulate'
import { useQuery } from '@tanstack/react-query'

type CEdge = Edge<EdgeData>

const DEFAULT_ZONE = { w: 380, h: 250 }
const NODE_SIZE = { w: 204, h: 68 }
const CACHE_COMPONENTS = ['cache', 'redis', 'memcached']

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
  /** Blocs/flèches fautifs après « Vérifier » : identifiant → ce qu'il y a à corriger. */
  errors?: Map<string, string>
}) {
  const { data } = useQuery(catalogQuery)
  const catalog = useMemo(() => (data ? indexCatalog(data) : null), [data])
  if (!catalog) return <p className="p-6 text-sm text-muted">Chargement des composants…</p>
  return (
    <ReactFlowProvider>
      <Editor {...props} catalog={catalog} />
    </ReactFlowProvider>
  )
}

const marker = (kind: EdgeKind) => ({ type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeColor(kind) })

function Editor({
  palette,
  value,
  onChange,
  errors: errorsProp,
  catalog,
}: {
  palette: PaletteItem[]
  value: string
  onChange: (v: string) => void
  errors?: Map<string, string>
  catalog: CatalogIndex
}) {
  const byType = useMemo(() => new Map(palette.map((p) => [p.type, p])), [palette])
  const isZone = useCallback((component: string) => catalog.components.get(component)?.zone ?? false, [catalog])

  // Seul l'état de départ vient de `value` : pour repartir de zéro, le parent remonte l'éditeur (key).
  const [initial] = useState(() => buildInitial(parseGraph(value), byType, isZone))
  const [nodes, setNodes, onNodesChange] = useNodesState<CNode>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CEdge>(initial.edges)
  const { screenToFlowPosition, fitView } = useReactFlow<CNode, CEdge>()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  // --- cadrage initial, une fois les blocs mesurés ---
  const measured = useNodesInitialized()
  const framed = useRef(false)
  useEffect(() => {
    if (measured && !framed.current) {
      framed.current = true
      fitView({ padding: 0.18, maxZoom: 1 })
    }
  }, [measured, fitView])

  // --- historique (annuler / rétablir) ---
  type Snap = { nodes: CNode[]; edges: CEdge[] }
  const past = useRef<Snap[]>([])
  const future = useRef<Snap[]>([])
  const [, bump] = useState(0)
  const snapshot = useCallback(() => {
    past.current.push({ nodes: nodesRef.current, edges: edgesRef.current })
    if (past.current.length > 60) past.current.shift()
    future.current = []
    bump((n) => n + 1)
  }, [])
  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push({ nodes: nodesRef.current, edges: edgesRef.current })
    setNodes(prev.nodes)
    setEdges(prev.edges)
    bump((n) => n + 1)
  }, [setNodes, setEdges])
  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push({ nodes: nodesRef.current, edges: edgesRef.current })
    setNodes(next.nodes)
    setEdges(next.edges)
    bump((n) => n + 1)
  }, [setNodes, setEdges])

  // --- sérialisation vers le parent ---
  const emit = useRef(onChange)
  emit.current = onChange
  const lastJson = useRef<string | null>(null)
  const [staleErrors, setStaleErrors] = useState(false)
  useEffect(() => {
    const json = JSON.stringify(serialize(nodes, edges), null, 2)
    if (lastJson.current === null) {
      lastJson.current = json
      return
    }
    if (json !== lastJson.current) {
      lastJson.current = json
      setStaleErrors(true)
      emit.current(json)
    }
  }, [nodes, edges])
  useEffect(() => setStaleErrors(false), [errorsProp])
  const errors = useMemo(() => (staleErrors ? new Map<string, string>() : (errorsProp ?? new Map<string, string>())), [staleErrors, errorsProp])

  // --- actions sur les blocs ---
  const [downIds, setDownIds] = useState<Set<string>>(new Set())
  const idSeq = useRef(0)
  const newId = (type: string) => `${type}-${Date.now().toString(36)}${(idSeq.current += 1)}`

  const absolute = useCallback((n: CNode, list: CNode[]) => {
    const parent = n.parentId ? list.find((p) => p.id === n.parentId) : undefined
    return { x: n.position.x + (parent?.position.x ?? 0), y: n.position.y + (parent?.position.y ?? 0) }
  }, [])

  const zoneAt = useCallback(
    (point: { x: number; y: number }, list: CNode[], except?: string) =>
      [...list]
        .reverse()
        .find((z) => {
          if (z.type !== 'zone' || z.id === except) return false
          const w = z.width ?? z.measured?.width ?? DEFAULT_ZONE.w
          const h = z.height ?? z.measured?.height ?? DEFAULT_ZONE.h
          return point.x >= z.position.x && point.x <= z.position.x + w && point.y >= z.position.y && point.y <= z.position.y + h
        }),
    [],
  )

  const makeNode = useCallback(
    (item: PaletteItem, at: { x: number; y: number }, list: CNode[]): CNode => {
      const comp = catalog.components.get(item.component)
      const zone = comp?.zone ?? false
      const props = Object.fromEntries((comp?.props ?? []).map((p) => [p.id, p.default]).filter(([, v]) => v !== ''))
      const node: CNode = {
        id: newId(item.type),
        type: zone ? 'zone' : 'component',
        position: at,
        data: { itemType: item.type, component: item.component, label: item.label, props },
        selected: true,
        ...(zone ? { width: DEFAULT_ZONE.w, height: DEFAULT_ZONE.h, zIndex: -1 } : {}),
      }
      if (!zone) {
        const parent = zoneAt({ x: at.x + NODE_SIZE.w / 2, y: at.y + NODE_SIZE.h / 2 }, list)
        if (parent) {
          node.parentId = parent.id
          node.position = { x: at.x - parent.position.x, y: at.y - parent.position.y }
        }
      }
      return node
    },
    [catalog, zoneAt],
  )

  const addBlock = useCallback(
    (item: PaletteItem, at?: { x: number; y: number }) => {
      snapshot()
      const rect = wrapper.current?.getBoundingClientRect()
      const offset = (idSeq.current % 5) * 26
      const position =
        at ??
        screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 - NODE_SIZE.w / 2 + offset,
          y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - NODE_SIZE.h / 2 + offset,
        })
      setNodes((list) => {
        const node = makeNode(item, position, list)
        const cleared = list.map((n) => (n.selected ? { ...n, selected: false } : n))
        return node.type === 'zone' ? [node, ...cleared] : [...cleared, node]
      })
      setEdges((list) => list.map((e) => (e.selected ? { ...e, selected: false } : e)))
    },
    [makeNode, screenToFlowPosition, setNodes, setEdges, snapshot],
  )

  const removeNode = useCallback(
    (id: string) => {
      snapshot()
      setNodes((list) =>
        list
          .filter((n) => n.id !== id)
          .map((n) => (n.parentId === id ? { ...n, parentId: undefined, position: absolute(n, list) } : n)),
      )
      setEdges((list) => list.filter((e) => e.source !== id && e.target !== id))
      setDownIds((s) => { const n = new Set(s); n.delete(id); return n })
    },
    [absolute, setEdges, setNodes, snapshot],
  )

  const duplicateNode = useCallback(
    (id: string) => {
      const src = nodesRef.current.find((n) => n.id === id)
      if (!src) return
      snapshot()
      const copy: CNode = {
        ...src,
        id: newId(src.data.itemType),
        position: { x: src.position.x + 32, y: src.position.y + 32 },
        data: { ...src.data, props: { ...src.data.props } },
        selected: true,
      }
      setNodes((list) => [...list.map((n) => (n.selected ? { ...n, selected: false } : n)), copy])
    },
    [setNodes, snapshot],
  )

  const patchNode = useCallback(
    (id: string, patch: { label?: string; props?: Record<string, string> }) =>
      setNodes((list) =>
        list.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...(patch.label !== undefined && { label: patch.label }), ...(patch.props && { props: patch.props }) } } : n,
        ),
      ),
    [setNodes],
  )

  const patchEdge = useCallback(
    (id: string, patch: Partial<EdgeData>) =>
      setEdges((list) => list.map((e) => (e.id === id ? { ...e, data: { ...(e.data as EdgeData), ...patch } } : e))),
    [setEdges],
  )

  const toggleDown = useCallback(
    (id: string) => setDownIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }),
    [],
  )

  // --- connexion de blocs ---
  const [connecting, setConnecting] = useState(false)
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return
      const list = nodesRef.current
      const s = list.find((n) => n.id === c.source)
      const t = list.find((n) => n.id === c.target)
      if (!s || !t || s.type === 'zone' || t.type === 'zone') return
      if (edgesRef.current.some((e) => e.source === c.source && e.target === c.target)) return
      snapshot()
      const kind = defaultKind(catalog, { component: s.data.component, props: s.data.props }, { component: t.data.component, props: t.data.props })
      const edge: CEdge = {
        id: `e-${c.source}-${c.target}`,
        source: c.source,
        target: c.target,
        type: 'flow',
        data: { kind, label: '' },
        selected: true,
      }
      setEdges((l) => [...l.map((e) => (e.selected ? { ...e, selected: false } : e)), edge])
      setNodes((l) => l.map((n) => (n.selected ? { ...n, selected: false } : n)))
    },
    [catalog, setEdges, setNodes, snapshot],
  )

  // Poser un bloc dans une zone (ou l'en sortir) quand on le lâche.
  const onNodeDragStop = useCallback(
    (_: unknown, node: CNode) => {
      if (node.type === 'zone') return
      setNodes((list) => {
        const current = list.find((n) => n.id === node.id)
        if (!current) return list
        const abs = absolute(current, list)
        const center = { x: abs.x + (current.measured?.width ?? NODE_SIZE.w) / 2, y: abs.y + (current.measured?.height ?? NODE_SIZE.h) / 2 }
        const zone = zoneAt(center, list, node.id)
        if ((zone?.id ?? undefined) === current.parentId) return list
        return list.map((n) =>
          n.id !== node.id
            ? n
            : zone
              ? { ...n, parentId: zone.id, position: { x: abs.x - zone.position.x, y: abs.y - zone.position.y } }
              : { ...n, parentId: undefined, position: abs },
        )
      })
    },
    [absolute, setNodes, zoneAt],
  )

  // --- organisation automatique ---
  const organize = useCallback(
    (direction: 'LR' | 'TB') => {
      snapshot()
      const free = nodesRef.current.filter((n) => n.type === 'component' && !n.parentId)
      const pos = layeredLayout(
        free.map((n) => ({ id: n.id, w: n.measured?.width ?? NODE_SIZE.w, h: n.measured?.height ?? NODE_SIZE.h })),
        edgesRef.current.map((e) => ({ source: e.source, target: e.target })),
        direction,
      )
      setNodes((list) => list.map((n) => (pos.has(n.id) ? { ...n, position: pos.get(n.id)! } : n)))
      requestAnimationFrame(() => fitView({ padding: 0.18, maxZoom: 1, duration: 280 }))
    },
    [fitView, setNodes, snapshot],
  )

  // --- simulation ---
  const [flow, setFlow] = useState(true)
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [simFlags, setSimFlags] = useState<Map<string, NodeFlag>>(new Map())
  const [caption, setCaption] = useState('')
  const [requestNo, setRequestNo] = useState(0)
  const [playing, setPlaying] = useState(false)
  const run = useRef(0)
  const pulseKey = useRef(0)

  const simGraph = useCallback((): SimGraph => {
    const comps = nodesRef.current.filter((n) => n.type === 'component')
    return {
      nodes: comps.map((n) => ({
        id: n.id,
        component: n.data.component,
        role: n.data.props.role ?? '',
        label: n.data.label,
        down: downIds.has(n.id),
        isCache: CACHE_COMPONENTS.includes(n.data.component) && (n.data.props.role ?? 'cache') === 'cache',
      })),
      edges: edgesRef.current.map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.data?.kind ?? 'sync' })),
    }
  }, [downIds])

  const play = useCallback(async () => {
    if (playing) return
    const myRun = ++run.current
    const no = requestNo + 1
    setRequestNo(no)
    setPlaying(true)
    setCaption(no === 1 ? 'Requête 1 : le cache est froid.' : `Requête ${no}`)
    const steps = plan(simGraph(), no)
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    for (const step of steps) {
      if (run.current !== myRun) return
      if (step.t === 'caption') setCaption(step.text)
      else if (step.t === 'mark') {
        setSimFlags((m) => new Map(m).set(step.node, step.mark))
        await wait(step.mark === 'visit' ? 120 : 420)
      } else {
        const p: Pulse = { key: ++pulseKey.current, edge: step.edge, reverse: step.reverse, tone: step.tone }
        setPulses((l) => [...l, p])
        await wait(680)
        setPulses((l) => l.filter((x) => x.key !== p.key))
      }
    }
    await wait(900)
    if (run.current !== myRun) return
    setSimFlags(new Map())
    setPlaying(false)
  }, [playing, requestNo, simGraph])

  const resetSim = () => {
    run.current++
    setPulses([])
    setSimFlags(new Map())
    setRequestNo(0)
    setCaption('')
    setPlaying(false)
  }

  const flags = useMemo(() => {
    const m = new Map(simFlags)
    for (const id of downIds) m.set(id, 'down')
    return m
  }, [simFlags, downIds])

  // --- sélection et panneau ---
  const selNodes = nodes.filter((n) => n.selected)
  const selEdges = edges.filter((e) => e.selected)
  const single = selNodes.length === 1 && selEdges.length === 0 ? selNodes[0] : undefined
  const singleEdge = selEdges.length === 1 && selNodes.length === 0 ? selEdges[0] : undefined
  const selectionKey = single?.id ?? singleEdge?.id ?? ''
  const [closedFor, setClosedFor] = useState('')
  const showInspector = (single || singleEdge) && closedFor !== selectionKey

  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id

  // --- presse-papiers et raccourcis ---
  const clipboard = useRef<{ nodes: CNode[]; edges: CEdge[] } | null>(null)
  const copy = () => {
    const picked = nodesRef.current.filter((n) => n.selected && n.type === 'component')
    if (!picked.length) return
    const ids = new Set(picked.map((n) => n.id))
    clipboard.current = { nodes: picked, edges: edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target)) }
  }
  const paste = () => {
    const clip = clipboard.current
    if (!clip) return
    snapshot()
    const map = new Map<string, string>()
    const copies = clip.nodes.map((n) => {
      const id = newId(n.data.itemType)
      map.set(n.id, id)
      const abs = absolute(n, nodesRef.current)
      return { ...n, id, parentId: undefined, position: { x: abs.x + 36, y: abs.y + 36 }, data: { ...n.data, props: { ...n.data.props } }, selected: true }
    })
    const links = clip.edges.map((e) => ({ ...e, id: `e-${map.get(e.source)}-${map.get(e.target)}`, source: map.get(e.source)!, target: map.get(e.target)!, selected: false }))
    setNodes((l) => [...l.map((n) => ({ ...n, selected: false })), ...copies])
    setEdges((l) => [...l, ...links])
  }

  const wrapper = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('input, textarea, select, [contenteditable="true"]')) return
    const mod = e.metaKey || e.ctrlKey
    const key = e.key.toLowerCase()
    if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
    else if (mod && key === 'y') { e.preventDefault(); redo() }
    else if (mod && key === 'c') copy()
    else if (mod && key === 'v') { e.preventDefault(); paste() }
    else if (mod && key === 'd' && single) { e.preventDefault(); duplicateNode(single.id) }
    else if (key === '/' ) { e.preventDefault(); setPaletteCollapsed(false); setTimeout(() => search.current?.focus(), 0) }
  }

  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const item = byType.get(e.dataTransfer.getData(DRAG_TYPE))
    if (item) addBlock(item, screenToFlowPosition({ x: e.clientX - NODE_SIZE.w / 2, y: e.clientY - NODE_SIZE.h / 2 }))
  }

  const styledEdges = useMemo(
    () => edges.map((e) => ({ ...e, type: 'flow', markerEnd: marker(e.data?.kind ?? 'sync') })),
    [edges],
  )

  const ctx: EditorCtx = useMemo(
    () => ({
      catalog,
      palette: byType,
      flow,
      pulses,
      errors,
      flags,
      actions: { rename: (id, label) => { snapshot(); patchNode(id, { label }) }, remove: removeNode, duplicate: duplicateNode, toggleDown },
    }),
    [catalog, byType, flow, pulses, errors, flags, patchNode, removeNode, duplicateNode, toggleDown, snapshot],
  )

  return (
    <EditorContext.Provider value={ctx}>
      <div
        className="grid h-full min-h-0"
        style={{ gridTemplateColumns: paletteCollapsed ? '56px minmax(0,1fr)' : '224px minmax(0,1fr)' }}
        onKeyDown={onKeyDown}
      >
        <Palette
          ref={search}
          palette={palette}
          catalog={catalog}
          onAdd={(item) => addBlock(item)}
          collapsed={paletteCollapsed}
          onToggle={() => setPaletteCollapsed((c) => !c)}
        />

        <div ref={wrapper} className="diagram-canvas relative min-h-0 outline-none" tabIndex={-1} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow<CNode, CEdge>
            nodes={nodes}
            edges={styledEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={() => setConnecting(true)}
            onConnectEnd={() => setConnecting(false)}
            onNodeDragStart={snapshot}
            onNodeDragStop={onNodeDragStop}
            onBeforeDelete={async () => { snapshot(); return true }}
            deleteKeyCode={['Backspace', 'Delete']}
            snapToGrid
            snapGrid={[12, 12]}
            minZoom={0.25}
            maxZoom={1.6}
            className={cn(connecting && 'is-connecting')}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.6} />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              style={{ width: 150, height: 96 }}
              nodeColor={(n) => familyOf(catalog, (n as CNode).data.component)}
              nodeStrokeWidth={0}
              maskColor="var(--xy-minimap-mask-background-color)"
            />

            <Panel position="top-left">
              <div className="dpanel" role="toolbar" aria-label="Outils du diagramme">
                <button type="button" className="dtool" onClick={undo} disabled={past.current.length === 0} aria-label="Annuler" title="Annuler (⌘Z)">
                  <Undo2 className="size-4" />
                </button>
                <button type="button" className="dtool" onClick={redo} disabled={future.current.length === 0} aria-label="Rétablir" title="Rétablir (⇧⌘Z)">
                  <Redo2 className="size-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
                <button type="button" className="dtool" onClick={() => organize('LR')} title="Organiser de gauche à droite">
                  <AlignHorizontalSpaceAround className="size-4" /> Organiser
                </button>
                <button type="button" className="dtool" onClick={() => organize('TB')} aria-label="Organiser de haut en bas" title="Organiser de haut en bas">
                  <AlignVerticalSpaceAround className="size-4" />
                </button>
                <button type="button" className="dtool" onClick={() => fitView({ padding: 0.18, maxZoom: 1, duration: 280 })} aria-label="Tout voir" title="Tout voir">
                  <Maximize className="size-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
                <button type="button" className="dtool" aria-pressed={flow} onClick={() => setFlow((f) => !f)} title="Montrer le sens du flux">
                  <Waves className="size-4" /> Flux
                </button>
                <button type="button" className="dtool" onClick={play} disabled={playing} title="Faire voyager une requête dans le schéma">
                  <Play className="size-4" /> Simuler
                </button>
                {requestNo > 0 && (
                  <button type="button" className="dtool" onClick={resetSim} aria-label="Remettre le cache à froid" title="Remettre le cache à froid">
                    <Repeat className="size-4" />
                  </button>
                )}
              </div>
            </Panel>

            {showInspector && (
              <Panel position="top-right">
                <Inspector
                  catalog={catalog}
                  node={single}
                  edge={singleEdge ? { id: singleEdge.id, sourceLabel: labelOf(singleEdge.source), targetLabel: labelOf(singleEdge.target), data: singleEdge.data as EdgeData } : undefined}
                  down={single ? downIds.has(single.id) : false}
                  onNode={(id, patch) => patchNode(id, patch)}
                  onEdge={(id, patch) => { snapshot(); patchEdge(id, patch) }}
                  onRemove={() => {
                    if (single) removeNode(single.id)
                    else if (singleEdge) {
                      snapshot()
                      setEdges((l) => l.filter((e) => e.id !== singleEdge.id))
                    }
                  }}
                  onDuplicate={() => single && duplicateNode(single.id)}
                  onToggleDown={() => single && toggleDown(single.id)}
                  onClose={() => setClosedFor(selectionKey)}
                />
              </Panel>
            )}

            {(caption || nodes.length === 0) && (
              <Panel position="bottom-center">
                <div className="dpanel max-w-[min(520px,70vw)] !px-3.5 !py-2 text-[0.8rem] text-text" role="status">
                  {nodes.length === 0 ? (
                    <span className="text-muted">Glisse un composant depuis la palette, ou clique dessus pour l’ajouter.</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Activity className="size-3.5 shrink-0 text-accent" />
                      {caption}
                    </span>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </EditorContext.Provider>
  )
}

// --- (dé)sérialisation -------------------------------------------------------------------------------------------

function buildInitial(
  graph: DiagramGraph,
  byType: Map<string, PaletteItem>,
  isZone: (component: string) => boolean,
): { nodes: CNode[]; edges: CEdge[] } {
  const known = graph.nodes.filter((n) => byType.has(n.type))
  const ordered = [...known].sort((a, b) => Number(isZone(byType.get(b.type)!.component)) - Number(isZone(byType.get(a.type)!.component)))
  const abs = new Map(known.map((n) => [n.id, { x: n.x, y: n.y }]))
  const nodes: CNode[] = ordered.map((n) => {
    const item = byType.get(n.type)!
    const zone = isZone(item.component)
    const parent = n.parent && abs.has(n.parent) ? n.parent : undefined
    const base = abs.get(n.id)!
    const pa = parent ? abs.get(parent)! : { x: 0, y: 0 }
    return {
      id: n.id,
      type: zone ? 'zone' : 'component',
      position: { x: base.x - pa.x, y: base.y - pa.y },
      data: { itemType: item.type, component: item.component, label: n.label || item.label, props: n.props ?? {} },
      ...(parent && { parentId: parent }),
      ...(zone && { width: n.w ?? DEFAULT_ZONE.w, height: n.h ?? DEFAULT_ZONE.h, zIndex: -1 }),
    }
  })
  const ids = new Set(nodes.map((n) => n.id))
  const edges: CEdge[] = graph.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e, i) => ({
      id: e.id || `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      type: 'flow',
      data: { kind: e.kind ?? 'sync', label: e.label ?? '' },
    }))
  return { nodes, edges }
}

function serialize(nodes: CNode[], edges: CEdge[]): DiagramGraph {
  const abs = (n: CNode) => {
    const p = n.parentId ? nodes.find((x) => x.id === n.parentId) : undefined
    return { x: Math.round(n.position.x + (p?.position.x ?? 0)), y: Math.round(n.position.y + (p?.position.y ?? 0)) }
  }
  return {
    nodes: nodes.map((n) => {
      const { x, y } = abs(n)
      const out: DiagramGraph['nodes'][number] = { id: n.id, type: n.data.itemType, x, y }
      if (n.data.label) out.label = n.data.label
      if (n.parentId) out.parent = n.parentId
      if (Object.keys(n.data.props).length) out.props = n.data.props
      if (n.type === 'zone') {
        out.w = Math.round(n.width ?? n.measured?.width ?? DEFAULT_ZONE.w)
        out.h = Math.round(n.height ?? n.measured?.height ?? DEFAULT_ZONE.h)
      }
      return out
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.data?.kind ?? 'sync',
      ...(e.data?.label ? { label: e.data.label } : {}),
    })),
  }
}
