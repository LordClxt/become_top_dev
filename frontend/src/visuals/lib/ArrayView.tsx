import type { SimState } from './sliceSim'

const VAR_COLORS = ['var(--accent)', 'var(--fail)', 'var(--pass)', '#b39ddb']

/** Dessine les arrays sous-jacents et, sous chacun, la fenêtre de chaque variable (len plein, cap pointillé). */
export function ArrayView({
  state,
  highlight,
  maxDead = Infinity,
}: {
  state: SimState
  highlight?: Set<string>
  /** Nombre maximal d'anciens arrays (non référencés) encore affichés. */
  maxDead?: number
}) {
  const names = Object.keys(state.vars)
  const dead = state.arrays.filter((a) => a.dead && a.cells.length > 0)
  const shown = state.arrays.filter((a) => !a.dead || dead.slice(-maxDead).includes(a))
  return (
    <div className="grid gap-6">
      {shown.map((arr) => {
        const viewers = names.filter((n) => state.vars[n]!.arr === arr.id)
        return (
          <div key={arr.id} className={arr.dead ? 'opacity-35' : ''}>
            <p className="mb-2 text-xs text-muted">
              Array sous-jacent n°{arr.id + 1} · {arr.cells.length} case{arr.cells.length > 1 ? 's' : ''}
              {arr.dead && ' · plus référencé : le ramasse-miettes le récupérera'}
            </p>
            <div className="flex gap-1">
              {arr.cells.map((c, i) => (
                <div
                  key={i}
                  className={`grid h-11 w-11 place-items-center rounded-md border font-code text-sm transition-colors duration-300 ${
                    highlight?.has(`${arr.id}:${i}`) ? 'border-fail bg-fail/20' : 'border-line bg-surface-2'
                  }`}
                >
                  {c ?? <span className="text-muted">·</span>}
                  <span className="sr-only">case {i}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-1.5">
              {viewers.map((name) => {
                const ref = state.vars[name]!
                const color = VAR_COLORS[names.indexOf(name) % VAR_COLORS.length]
                return (
                  <div key={name} className="flex items-center gap-1" style={{ paddingLeft: ref.off * 48 }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: ref.len * 48 - 4, background: color }}
                      title={`${name} : len ${ref.len}`}
                    />
                    {ref.cap > ref.len && (
                      <div
                        className="h-2 rounded-full border border-dashed"
                        style={{ width: (ref.cap - ref.len) * 48 - 4, borderColor: color }}
                        title={`${name} : capacité libre ${ref.cap - ref.len}`}
                      />
                    )}
                    <span className="ml-2 font-code text-xs" style={{ color }}>
                      {name} len={ref.len} cap={ref.cap}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
