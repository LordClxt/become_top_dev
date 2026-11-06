import { useEffect, useRef, useState } from 'react'

export const id = 'java-ch00-virtual-threads'

// Modèle : une tâche = 1 pas de calcul (15 ms), WAIT pas d'attente réseau (300 ms), 1 pas de calcul. 8 cœurs.
const CORES = 8
const WAIT = 20
const STEP_MS = 15
const TICK_MS = 80

type State = 'queued' | 'cpu' | 'wait' | 'done'
type Task = { state: State; left: number; phase: 0 | 1 | 2 }
type Sim = { tasks: Task[]; tick: number }

const fresh = (n: number): Sim => ({ tasks: Array.from({ length: n }, () => ({ state: 'queued' as State, left: 1, phase: 0 as const })), tick: 0 })

/** Un pas de simulation. Plateforme : un thread du pool est occupé pendant toute la tâche, attente comprise. */
function step(sim: Sim, mode: 'platform' | 'virtual', pool: number): Sim {
  const tasks = sim.tasks.map((t) => ({ ...t }))
  // 1. les attentes avancent sans consommer de cœur
  for (const t of tasks) if (t.state === 'wait' && --t.left === 0) { t.phase = 2; t.state = 'queued'; t.left = 1 }
  // 2. qui peut prendre un cœur ?
  const started = tasks.filter((t) => t.state !== 'queued' || t.phase === 2).filter((t) => t.state !== 'done').length
  let threadsFree = mode === 'platform' ? pool - started : Infinity
  let cores = CORES
  for (const t of tasks) {
    if (t.state !== 'queued' || cores === 0) continue
    const isNew = t.phase === 0
    if (isNew && threadsFree <= 0) continue
    if (isNew) threadsFree--
    cores--
    t.state = 'cpu'
  }
  // 3. le calcul se termine : attente réseau (le thread virtuel se démonte) ou fin
  for (const t of tasks) {
    if (t.state !== 'cpu') continue
    if (t.phase === 0) { t.phase = 1; t.state = 'wait'; t.left = WAIT } else { t.state = 'done' }
  }
  return { tasks, tick: sim.tick + 1 }
}

const COLOR: Record<State, string> = { queued: 'border-line', cpu: 'bg-accent border-accent', wait: 'border-accent/60 bg-accent/20', done: 'bg-muted/40 border-transparent' }

export default function VirtualThreads() {
  const [n, setN] = useState(120)
  const [pool, setPool] = useState(20)
  const [running, setRunning] = useState(false)
  const [sims, setSims] = useState(() => ({ platform: fresh(120), virtual: fresh(120) }))
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const finished = (s: Sim) => s.tasks.every((t) => t.state === 'done')

  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => {
      setSims((s) => {
        const next = {
          platform: finished(s.platform) ? s.platform : step(s.platform, 'platform', pool),
          virtual: finished(s.virtual) ? s.virtual : step(s.virtual, 'virtual', pool),
        }
        if (finished(next.platform) && finished(next.virtual)) setRunning(false)
        return next
      })
    }, TICK_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [running, pool])

  const reset = (tasks = n, p = pool) => {
    setRunning(false)
    setN(tasks)
    setPool(p)
    setSims({ platform: fresh(tasks), virtual: fresh(tasks) })
  }

  const panel = (title: string, s: Sim, note: string) => {
    const waiting = s.tasks.filter((t) => t.state === 'wait').length
    const queued = s.tasks.filter((t) => t.state === 'queued' && t.phase === 0).length
    return (
      <div className="grid gap-2 rounded-md border border-line p-3">
        <div className="flex items-baseline justify-between text-sm">
          <span>{title}</span>
          <span className="font-code text-xs">{finished(s) ? `terminé en ${s.tick * STEP_MS} ms` : `${s.tick * STEP_MS} ms`}</span>
        </div>
        <div className="flex flex-wrap gap-[3px]" aria-hidden>
          {s.tasks.map((t, i) => <span key={i} className={`h-2.5 w-2.5 rounded-sm border ${COLOR[t.state]}`} />)}
        </div>
        <div className="text-xs text-muted">en attente réseau : {waiting} · jamais démarrées : {queued} · {note}</div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">requêtes <span className="font-code text-xs">{n}</span>
          <input type="range" min={20} max={400} step={20} value={n} onChange={(e) => reset(Number(e.target.value), pool)} aria-label="Nombre de requêtes" />
        </label>
        <label className="flex items-center gap-2">pool <span className="font-code text-xs">{pool}</span>
          <input type="range" min={4} max={60} step={4} value={pool} onChange={(e) => reset(n, Number(e.target.value))} aria-label="Taille du pool de threads" />
        </label>
        <button type="button" onClick={() => setRunning(!running)} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-accent">{running ? 'pause' : 'lancer'}</button>
        <button type="button" onClick={() => reset()} className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-text">réinitialiser</button>
      </div>
      {panel(`Pool de ${pool} threads de plateforme`, sims.platform, 'un thread reste occupé pendant toute l’attente')}
      {panel('Un thread virtuel par requête', sims.virtual, `${CORES} porteurs, démontés pendant l’attente`)}
      <p className="text-xs text-muted">
        Chaque carré est une requête : contour vide = pas encore démarrée, plein = calcule sur un cœur, clair = attend le réseau, gris = terminée.
        Chaque requête calcule {STEP_MS} ms, attend {WAIT * STEP_MS} ms, calcule {STEP_MS} ms ; la machine a {CORES} cœurs.
      </p>
    </div>
  )
}
