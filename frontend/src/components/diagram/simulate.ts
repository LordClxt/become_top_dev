/**
 * Modèle de la simulation d'un diagramme : on déroule ce qu'une requête fait réellement dans le schéma dessiné.
 * Fonction pure `plan(graph, requestNo) → étapes` : l'animation ne fait que jouer ces étapes, elle ne décide de rien.
 *
 * Règles du modèle :
 *   - une requête part de chaque bloc sans flèche entrante et suit les flèches d'appel, de lecture et d'écriture ;
 *   - un cache (rôle « cache ») est froid à la 1re requête (miss : elle continue) et chaud ensuite (hit : elle s'arrête là) ;
 *   - un bloc en panne arrête la requête : la réponse ne revient jamais ;
 *   - les flèches asynchrones et de réplication partent après la réponse à l'appelant.
 */
import type { EdgeKind } from '@/lib/api'

export type SimNode = { id: string; component: string; role: string; label: string; down: boolean; isCache: boolean }
export type SimEdge = { id: string; source: string; target: string; kind: EdgeKind }
export type SimGraph = { nodes: SimNode[]; edges: SimEdge[] }

export type Tone = 'req' | 'res' | 'async' | 'repl' | 'fail'
export type Step =
  | { t: 'pulse'; edge: string; reverse: boolean; tone: Tone }
  | { t: 'mark'; node: string; mark: 'visit' | 'hit' | 'miss' | 'down' }
  | { t: 'caption'; text: string }

const MAX_STEPS = 240
const MAX_DEPTH = 14

export function plan(g: SimGraph, requestNo: number): Step[] {
  const steps: Step[] = []
  const byId = new Map(g.nodes.map((n) => [n.id, n]))
  const outgoing = (id: string) => g.edges.filter((e) => e.source === id)
  const hasIncoming = new Set(g.edges.filter((e) => e.source !== e.target).map((e) => e.target))
  const deferred: { edge: SimEdge; tone: Tone }[] = []
  const push = (s: Step) => {
    if (steps.length < MAX_STEPS) steps.push(s)
  }

  // Renvoie false si la requête est restée bloquée en chemin (bloc en panne).
  const visit = (id: string, path: Set<string>, depth: number): boolean => {
    const node = byId.get(id)!
    if (node.down) {
      push({ t: 'mark', node: id, mark: 'down' })
      push({ t: 'caption', text: `« ${node.label} » est en panne : la requête n’aboutit pas.` })
      return false
    }
    push({ t: 'mark', node: id, mark: 'visit' })
    const out = outgoing(id).filter((e) => e.source !== e.target)
    const sync = out.filter((e) => e.kind === 'sync' || e.kind === 'read' || e.kind === 'write')

    if (node.isCache && sync.length > 0) {
      if (requestNo > 1) {
        push({ t: 'mark', node: id, mark: 'hit' })
        push({ t: 'caption', text: `Requête ${requestNo} : « ${node.label} » a la donnée, la base n’est pas sollicitée.` })
        return true
      }
      push({ t: 'mark', node: id, mark: 'miss' })
      push({ t: 'caption', text: `Requête 1 : le cache « ${node.label} » est froid, la requête descend jusqu’à la source.` })
    }

    let ok = true
    if (depth < MAX_DEPTH) {
      for (const e of sync) {
        if (path.has(e.target)) continue
        push({ t: 'pulse', edge: e.id, reverse: false, tone: 'req' })
        const reached = visit(e.target, new Set(path).add(e.target), depth + 1)
        if (reached) push({ t: 'pulse', edge: e.id, reverse: true, tone: 'res' })
        else {
          push({ t: 'pulse', edge: e.id, reverse: true, tone: 'fail' })
          ok = false
        }
      }
    }
    for (const e of out) {
      if (e.kind === 'async') deferred.push({ edge: e, tone: 'async' })
      else if (e.kind === 'replication') deferred.push({ edge: e, tone: 'repl' })
    }
    return ok
  }

  const entries = g.nodes.filter((n) => !hasIncoming.has(n.id) && outgoing(n.id).length > 0)
  for (const entry of entries) visit(entry.id, new Set([entry.id]), 0)

  // Travail différé : files et réplication, après la réponse.
  const done = new Set<string>()
  while (deferred.length > 0 && steps.length < MAX_STEPS) {
    const { edge, tone } = deferred.shift()!
    if (done.has(edge.id)) continue
    done.add(edge.id)
    push({
      t: 'caption',
      text: tone === 'async' ? 'La réponse est déjà partie : le travail asynchrone continue en arrière-plan.' : 'Le changement est copié vers le réplica.',
    })
    push({ t: 'pulse', edge: edge.id, reverse: false, tone })
    const target = byId.get(edge.target)!
    if (target.down) {
      push({ t: 'mark', node: target.id, mark: 'down' })
      continue
    }
    push({ t: 'mark', node: target.id, mark: 'visit' })
    for (const e of outgoing(target.id)) {
      if (e.source === e.target) continue
      if (e.kind === 'async' || e.kind === 'replication') deferred.push({ edge: e, tone: e.kind === 'async' ? 'async' : 'repl' })
      else if (!done.has(e.id)) {
        done.add(e.id)
        push({ t: 'pulse', edge: e.id, reverse: false, tone: 'req' })
        push({ t: 'mark', node: e.target, mark: byId.get(e.target)!.down ? 'down' : 'visit' })
      }
    }
  }
  if (entries.length === 0) push({ t: 'caption', text: 'Rien à simuler : ajoute un client qui appelle un service.' })
  return steps
}
