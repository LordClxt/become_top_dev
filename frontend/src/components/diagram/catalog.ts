import { queryOptions } from '@tanstack/react-query'
import { api, type CatalogCategory, type CatalogComponent, type DiagramCatalog, type EdgeKind } from '@/lib/api'

/** Le catalogue ne change qu'avec le backend : on le garde pour toute la session. */
export const catalogQuery = queryOptions({
  queryKey: ['diagram-catalog'],
  queryFn: api.diagramCatalog,
  staleTime: Infinity,
})

export type CatalogIndex = {
  components: Map<string, CatalogComponent>
  categories: Map<string, CatalogCategory>
}

export function indexCatalog(c: DiagramCatalog): CatalogIndex {
  return {
    components: new Map(c.components.map((x) => [x.id, x])),
    categories: new Map(c.categories.map((x) => [x.id, x])),
  }
}

/** Variable CSS de la famille de couleur d'un composant. */
export function familyOf(catalog: CatalogIndex, componentId: string): string {
  const comp = catalog.components.get(componentId)
  const color = comp ? catalog.categories.get(comp.category)?.color : undefined
  return `var(--c-${color ?? 'slate'})`
}

export const EDGE_KINDS: { kind: EdgeKind; label: string; hint: string; color: string }[] = [
  { kind: 'sync', label: 'Appel', hint: 'Appel direct : l’appelant attend la réponse.', color: 'var(--text-muted)' },
  { kind: 'async', label: 'Asynchrone', hint: 'Via une file ou un événement : l’appelant n’attend pas.', color: 'var(--c-orange)' },
  { kind: 'read', label: 'Lecture', hint: 'Lit des données.', color: 'var(--c-sky)' },
  { kind: 'write', label: 'Écriture', hint: 'Écrit des données.', color: 'var(--c-pink)' },
  { kind: 'replication', label: 'Réplication', hint: 'Copie les changements vers un autre nœud.', color: 'var(--c-violet)' },
]

export const edgeColor = (kind: EdgeKind | undefined): string =>
  EDGE_KINDS.find((k) => k.kind === (kind ?? 'sync'))?.color ?? 'var(--text-muted)'

/** Nature proposée pour une nouvelle flèche, d'après les composants qu'elle relie. */
export function defaultKind(
  catalog: CatalogIndex,
  source: { component: string; props: Record<string, string> },
  target: { component: string; props: Record<string, string> },
): EdgeKind {
  const cat = (id: string) => catalog.components.get(id)?.category
  if (cat(source.component) === 'messaging' || cat(target.component) === 'messaging') return 'async'
  if (target.props.role === 'replica' || target.component === 'follower') return 'replication'
  if (cat(target.component) === 'data' || cat(target.component) === 'cache' || cat(target.component) === 'storage') return 'sync'
  return 'sync'
}
