/**
 * Mini-simulateur de slices Go : arrays sous-jacents, fenêtres (offset/len/cap),
 * append avec la même règle de croissance que le runtime pour les petites slices.
 */
export type BackingArray = { id: number; cells: (string | null)[]; dead: boolean }
export type SliceRef = { arr: number; off: number; len: number; cap: number }
export type SimState = { arrays: BackingArray[]; vars: Record<string, SliceRef>; output: string[] }

export const empty = (): SimState => ({ arrays: [], vars: {}, output: [] })

function clone(s: SimState): SimState {
  return {
    arrays: s.arrays.map((a) => ({ ...a, cells: [...a.cells] })),
    vars: Object.fromEntries(Object.entries(s.vars).map(([k, v]) => [k, { ...v }])),
    output: [...s.output],
  }
}

/** Règle de croissance du runtime (petites slices) : doubler, ou prendre le besoin s'il est plus grand. */
export function grow(oldCap: number, needed: number): number {
  if (needed > oldCap * 2) return needed
  if (oldCap < 256) return Math.max(oldCap * 2, 1)
  let c = oldCap
  while (c < needed) c += (c + 3 * 256) >> 2
  return c
}

export function literal(s: SimState, name: string, values: string[], cap = values.length): SimState {
  const n = clone(s)
  const cells: (string | null)[] = [...values, ...Array(cap - values.length).fill(null)]
  n.arrays.push({ id: n.arrays.length, cells, dead: false })
  n.vars[name] = { arr: n.arrays.length - 1, off: 0, len: values.length, cap }
  return n
}

export function reslice(s: SimState, name: string, from: string, lo: number, hi: number, max?: number): SimState {
  const n = clone(s)
  const src = n.vars[from]!
  const cap = (max ?? src.cap) - lo
  n.vars[name] = { arr: src.arr, off: src.off + lo, len: hi - lo, cap }
  return n
}

export function set(s: SimState, name: string, i: number, v: string): SimState {
  const n = clone(s)
  const ref = n.vars[name]!
  n.arrays[ref.arr]!.cells[ref.off + i] = v
  return n
}

export function append(s: SimState, target: string, from: string, values: string[]): SimState {
  let n = clone(s)
  const src = n.vars[from]!
  const needed = src.len + values.length
  let ref = { ...src }
  if (needed > src.cap) {
    const newCap = grow(src.cap, needed)
    const old = n.arrays[src.arr]!
    const cells: (string | null)[] = Array(newCap).fill(null)
    for (let i = 0; i < src.len; i++) cells[i] = old.cells[src.off + i] ?? null
    n.arrays.push({ id: n.arrays.length, cells, dead: false })
    ref = { arr: n.arrays.length - 1, off: 0, len: src.len, cap: newCap }
  }
  const arr = n.arrays[ref.arr]!
  values.forEach((v, i) => {
    arr.cells[ref.off + ref.len + i] = v
  })
  ref.len = needed
  n.vars[target] = ref
  n = markDead(n)
  return n
}

export function print(s: SimState, names: string[]): SimState {
  const n = clone(s)
  n.output.push(names.map((name) => `${name}: [${view(n, name).join(' ')}]`).join('  '))
  return n
}

export function view(s: SimState, name: string): string[] {
  const ref = s.vars[name]!
  return s.arrays[ref.arr]!.cells.slice(ref.off, ref.off + ref.len).map((c) => c ?? '·')
}

/** Un array qu'aucune variable ne référence plus sera récupéré par le ramasse-miettes. */
function markDead(s: SimState): SimState {
  const used = new Set(Object.values(s.vars).map((v) => v.arr))
  s.arrays.forEach((a) => {
    a.dead = !used.has(a.id)
  })
  return s
}
