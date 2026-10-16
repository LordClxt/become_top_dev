import { useState } from 'react'

export const id = 'nest-ch01-route-matcher'

type Route = { path: string; handler: string }
type Strategy = 'declaration' | 'specificity'

const INITIAL: Route[] = [
  { path: ':isbn', handler: 'findOne' },
  { path: 'featured', handler: 'featured' },
  { path: 'stats', handler: 'stats' },
  { path: '*path', handler: 'fallback' },
]

const REQUESTS = ['featured', 'stats', '978-2253004226', 'a/b']

/** 0 = littéral, 1 = paramètre, 2 = wildcard (ordre de la stratégie « specificity »). */
function rank(path: string): number {
  if (path.startsWith('*')) return 2
  if (path.startsWith(':')) return 1
  return 0
}

/** Correspondance façon Express 5 : `:x` = un segment, `*x` = au moins un segment. */
function matches(path: string, segments: string[]): boolean {
  if (path.startsWith('*')) return segments.length >= 1
  if (segments.length !== 1) return false
  return path.startsWith(':') || path === segments[0]
}

/** Exemples de requêtes qu'une route accepte, pour détecter le masquage. */
function samples(path: string): string[][] {
  if (path.startsWith('*')) return [['x'], ['x', 'y']]
  if (path.startsWith(':')) return [['x']]
  return [[path]]
}

function registered(routes: Route[], strategy: Strategy): Route[] {
  if (strategy === 'declaration') return routes
  return routes
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r.path) - rank(b.r.path) || a.i - b.i)
    .map(({ r }) => r)
}

export default function RouteMatcher() {
  const [routes, setRoutes] = useState(INITIAL)
  const [strategy, setStrategy] = useState<Strategy>('declaration')
  const [req, setReq] = useState('featured')

  const order = registered(routes, strategy)
  const segments = req.split('/')
  const winner = order.find((r) => matches(r.path, segments))
  const shadowed = new Set(
    order
      .filter((r, i) => samples(r.path).every((s) => order.slice(0, i).some((p) => matches(p.path, s))))
      .map((r) => r.handler),
  )

  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= routes.length) return
    const next = [...routes]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setRoutes(next)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Stratégie :</span>
        {(['declaration', 'specificity'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStrategy(s)}
            className={`rounded-md border px-3 py-1 ${s === strategy ? 'border-accent text-text' : 'border-line text-muted'}`}
          >
            {s === 'declaration' ? "ordre de déclaration (défaut)" : "'specificity'"}
          </button>
        ))}
      </div>

      <div className="grid gap-1 rounded-md border border-line p-3">
        <p className="text-xs text-muted">Méthodes du contrôleur @Controller('books'), dans l'ordre du fichier</p>
        {routes.map((r, i) => (
          <div key={r.handler} className="flex items-center gap-2 font-code text-xs">
            <button type="button" onClick={() => move(i, -1)} className="rounded border border-line px-1" aria-label="monter">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} className="rounded border border-line px-1" aria-label="descendre">
              ↓
            </button>
            <span>
              @Get('{r.path}') {r.handler}()
            </span>
            {shadowed.has(r.handler) && <span className="text-fail">masquée</span>}
          </div>
        ))}
      </div>

      <div className="grid gap-1 rounded-md border border-line p-3">
        <p className="text-xs text-muted">Ordre d'enregistrement dans Express</p>
        <p className="font-code text-xs">{order.map((r) => r.path).join('  →  ')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Requête GET /books/</span>
        {REQUESTS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReq(r)}
            className={`rounded-md border px-2 py-0.5 font-code text-xs ${r === req ? 'border-accent text-text' : 'border-line text-muted'}`}
          >
            {r}
          </button>
        ))}
      </div>

      <p className="text-sm">
        {winner ? (
          <>
            Répond : <span className="font-code">{winner.handler}()</span> (route{' '}
            <span className="font-code">{winner.path}</span>)
          </>
        ) : (
          '404 : aucune route ne correspond.'
        )}
      </p>
      <p className="text-xs text-muted">
        Une route est masquée quand une route enregistrée avant elle accepte toutes ses requêtes. Le wildcard, lui, reste
        toujours partiellement recouvert : c'est son rôle de fallback.
      </p>
    </div>
  )
}
