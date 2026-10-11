/**
 * Organisation automatique d'un diagramme en couches (gauche→droite ou haut→bas) : couche = plus long chemin depuis
 * une source, ordre dans la couche par barycentre (deux passes). Pas de dépendance : les graphes font < 80 blocs.
 */
export type LayoutNode = { id: string; w: number; h: number }
export type LayoutEdge = { source: string; target: string }

export function layeredLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: 'LR' | 'TB',
  gap = { layer: 96, item: 36 },
): Map<string, { x: number; y: number }> {
  const ids = new Set(nodes.map((n) => n.id))
  const out = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  const inn = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const e of edges) {
    if (e.source !== e.target && ids.has(e.source) && ids.has(e.target)) {
      out.get(e.source)!.push(e.target)
      inn.get(e.target)!.push(e.source)
    }
  }

  // Couches : on ignore les arêtes qui ferment un cycle (retour arrière dans un parcours en profondeur).
  const layer = new Map<string, number>()
  const state = new Map<string, 0 | 1 | 2>()
  const back = new Set<string>()
  const dfs = (id: string) => {
    state.set(id, 1)
    for (const t of out.get(id)!) {
      if (state.get(t) === 1) back.add(`${id}>${t}`)
      else if (!state.get(t)) dfs(t)
    }
    state.set(id, 2)
  }
  for (const n of nodes) if (!state.get(n.id)) dfs(n.id)
  const depth = (id: string, seen = new Set<string>()): number => {
    if (layer.has(id)) return layer.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const preds = inn.get(id)!.filter((p) => !back.has(`${p}>${id}`))
    const d = preds.length ? Math.max(...preds.map((p) => depth(p, seen))) + 1 : 0
    layer.set(id, d)
    return d
  }
  for (const n of nodes) depth(n.id)

  const layers: string[][] = []
  for (const n of nodes) (layers[layer.get(n.id)!] ??= []).push(n.id)
  const dense = layers.map((l) => l ?? [])

  const order = new Map<string, number>()
  dense.forEach((l) => l.forEach((id, i) => order.set(id, i)))
  const bary = (id: string, neighbors: string[]) =>
    neighbors.length ? neighbors.reduce((s, n) => s + (order.get(n) ?? 0), 0) / neighbors.length : (order.get(id) ?? 0)
  for (const pass of [0, 1]) {
    const range = pass === 0 ? dense.map((_, i) => i) : dense.map((_, i) => dense.length - 1 - i)
    for (const li of range) {
      const l = dense[li] ?? []
      const neighbors = (id: string) => (pass === 0 ? inn.get(id)! : out.get(id)!)
      l.sort((a, b) => bary(a, neighbors(a)) - bary(b, neighbors(b)))
      l.forEach((id, i) => order.set(id, i))
    }
  }

  const size = new Map(nodes.map((n) => [n.id, n]))
  const horizontal = direction === 'LR'
  const extent = (id: string) => (horizontal ? size.get(id)!.h : size.get(id)!.w)
  const thick = (l: string[]) => Math.max(0, ...l.map((id) => (horizontal ? size.get(id)!.w : size.get(id)!.h)))
  const spans = dense.map((l) => l.reduce((s, id) => s + extent(id) + gap.item, -gap.item))
  const widest = Math.max(0, ...spans)

  const pos = new Map<string, { x: number; y: number }>()
  let cursor = 0
  dense.forEach((l, li) => {
    let along = (widest - (spans[li] ?? 0)) / 2
    for (const id of l) {
      pos.set(id, horizontal ? { x: cursor, y: along } : { x: along, y: cursor })
      along += extent(id) + gap.item
    }
    cursor += thick(l) + gap.layer
  })
  return pos
}
