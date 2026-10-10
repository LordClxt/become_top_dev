import type { CSSProperties } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { type GId, type Place, PROGRAM, placeOf, scenario } from './schedulerSim'

/** Composition 1280×720 : chaque étape du modèle dure STEP_FRAMES, dont MOVE_FRAMES de déplacement. */

export const FPS = 30
export const STEP_FRAMES = 48
const MOVE_FRAMES = 18
const OUTRO_FRAMES = 45
export const STEPS = scenario()
export const DURATION = STEPS.length * STEP_FRAMES + OUTRO_FRAMES

const TOKEN = 64
const SLOT_GAP = 12
const ease = Easing.bezier(0.22, 1, 0.36, 1)

// Géométrie (coordonnées de la composition, mises à l'échelle par le Player).
const PROC_X = [480, 880]
const PROC_Y = 150
const PROC_W = 360
const PROC_H = 290
const GLOBAL = { x: 640, y: 40 }
const PARKED = { x: 480, y: 470 }
const DONE = { x: 880, y: 470 }

const runSlot = (p: number) => ({ x: PROC_X[p]! + 28, y: PROC_Y + 64 })
const nextSlot = (p: number) => ({ x: PROC_X[p]! + 180, y: PROC_Y + 72 })
const localSlot = (p: number, i: number) => ({ x: PROC_X[p]! + 24 + i * (TOKEN + SLOT_GAP), y: PROC_Y + 184 })
const globalSlot = (i: number) => ({ x: GLOBAL.x + i * (TOKEN + SLOT_GAP), y: GLOBAL.y })

/** Coin haut-gauche et échelle d'une G selon sa place. */
function layout(place: Place): { x: number; y: number; scale: number } {
  switch (place.kind) {
    case 'run':
      return { ...runSlot(place.p), scale: 1.25 }
    case 'next':
      return { ...nextSlot(place.p), scale: 1 }
    case 'local':
      return { ...localSlot(place.p, place.i), scale: 1 }
    case 'global':
      return { ...globalSlot(place.i), scale: 1 }
    case 'parked':
      return { x: PARKED.x + 20 + place.i * (TOKEN + SLOT_GAP), y: PARKED.y + 36, scale: 1 }
    case 'done':
      return { x: DONE.x + 20 + place.i * 62, y: DONE.y + 40, scale: 0.8 }
  }
}

export function SchedulerComposition() {
  const frame = useCurrentFrame()
  const k = Math.min(Math.floor(frame / STEP_FRAMES), STEPS.length - 1)
  const local = frame - k * STEP_FRAMES
  const t = ease(Math.min(1, Math.max(0, local / MOVE_FRAMES)))
  const step = STEPS[k]!
  const prev = STEPS[k - 1]?.state
  const cur = step.state
  const textIn = interpolate(local, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'var(--surface)', color: 'var(--text)' }} className="font-ui">
      <CodePanel line={step.line} />

      <Label x={GLOBAL.x - 160} y={GLOBAL.y + 20}>
        File globale
      </Label>
      {Array.from({ length: 6 }, (_, i) => (
        <Slot key={i} {...globalSlot(i)} />
      ))}

      {cur.procs.map((proc, p) => (
        <div
          key={p}
          className="absolute rounded-[20px] border-2"
          style={{
            left: PROC_X[p],
            top: PROC_Y,
            width: PROC_W,
            height: PROC_H,
            borderColor: proc.running !== null ? 'var(--accent)' : 'var(--line)',
            background: 'var(--ink)',
          }}
        >
          <div className="absolute top-4 left-6 flex items-baseline gap-3">
            <span className="font-code text-[26px] font-semibold">P{p}</span>
            <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>
              {proc.running !== null ? `thread M${p}` : 'inactif, sans thread'}
            </span>
          </div>
          <SlotLabel x={28} y={170}>
            exécute
          </SlotLabel>
          <SlotLabel x={180} y={150}>
            runnext
          </SlotLabel>
          <SlotLabel x={24} y={254}>
            file locale
          </SlotLabel>
        </div>
      ))}
      {cur.procs.map((_, p) => (
        <div key={p}>
          <Slot {...runSlot(p)} size={TOKEN * 1.25} />
          <Slot {...nextSlot(p)} />
          {Array.from({ length: 4 }, (_, i) => (
            <Slot key={i} {...localSlot(p, i)} />
          ))}
        </div>
      ))}

      <Zone x={PARKED.x} y={PARKED.y} w={380} label="Garées : bloquées, hors de tout P" />
      <Zone x={DONE.x} y={DONE.y} w={360} label="Terminées" />

      {cur.created.map((g) => (
        <Token key={g} g={g} from={placeOf(prev ?? cur, g)} to={placeOf(cur, g)!} t={t} />
      ))}

      <div className="absolute right-10 bottom-8 left-10 flex items-start gap-6" style={{ opacity: textIn }}>
        <span className="pt-1.5 font-code text-[20px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {String(k + 1).padStart(2, '0')}/{STEPS.length}
        </span>
        <div>
          <p className="font-read text-[32px] leading-tight font-semibold">{step.title}</p>
          <p className="mt-1 text-[22px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            {step.detail}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Token({ g, from, to, t }: { g: GId; from: Place | null; to: Place; t: number }) {
  const a = layout(from ?? to)
  const b = layout(to)
  const moved = from === null || from.kind !== to.kind || ('p' in from && 'p' in to && from.p !== to.p)
  const x = a.x + (b.x - a.x) * t
  const y = a.y + (b.y - a.y) * t
  const scale = (a.scale + (b.scale - a.scale) * t) * (from === null ? 0.6 + 0.4 * t : 1)

  const look: CSSProperties =
    to.kind === 'run'
      ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
      : to.kind === 'parked'
        ? { background: 'var(--ink)', color: 'var(--fail)', borderColor: 'var(--fail)', borderStyle: 'dashed' }
        : to.kind === 'done'
          ? { background: 'var(--surface-2)', color: 'var(--text-muted)', borderColor: 'var(--line)', opacity: 0.6 }
          : { background: 'var(--surface-2)', color: 'var(--text)', borderColor: to.kind === 'next' ? 'var(--accent)' : 'var(--line)' }

  return (
    <div
      className="absolute grid place-items-center rounded-2xl border-2 font-code"
      style={{
        ...look,
        left: 0,
        top: 0,
        width: TOKEN,
        height: TOKEN,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'top left',
        opacity: (look.opacity as number | undefined ?? 1) * (from === null ? t : 1),
        boxShadow: moved && t < 1 ? '0 0 0 6px color-mix(in oklab, var(--accent) 35%, transparent)' : 'none',
      }}
    >
      <span className="text-center leading-none">
        <span className="block text-[22px] font-semibold">G{g}</span>
        {g === 1 && <span className="mt-0.5 block text-[12px]">main</span>}
      </span>
    </div>
  )
}

function CodePanel({ line }: { line: number | null }) {
  return (
    <div
      className="absolute rounded-[20px] border-2 py-5"
      style={{ left: 40, top: 40, width: 400, height: 520, borderColor: 'var(--line)', background: 'var(--ink)' }}
    >
      <p className="mb-3 px-6 font-code text-[16px]" style={{ color: 'var(--text-muted)' }}>
        main.go
      </p>
      {PROGRAM.map((text, i) => (
        <pre
          key={i}
          className="px-6 font-code text-[17px] leading-[38px]"
          style={{
            background: i === line ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'transparent',
            color: i === line ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          {text}
        </pre>
      ))}
    </div>
  )
}

function Slot({ x, y, size = TOKEN }: { x: number; y: number; size?: number }) {
  return (
    <div
      className="absolute rounded-2xl border-2 border-dashed"
      style={{ left: x, top: y, width: size, height: size, borderColor: 'var(--line)' }}
    />
  )
}

function Label({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <span className="absolute text-[20px]" style={{ left: x, top: y, color: 'var(--text-muted)' }}>
      {children}
    </span>
  )
}

function SlotLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <span className="absolute font-code text-[15px]" style={{ left: x, top: y, color: 'var(--text-muted)' }}>
      {children}
    </span>
  )
}

function Zone({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: 112 }}>
      <span className="text-[17px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="absolute inset-x-0 top-7 bottom-0 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--line)' }} />
    </div>
  )
}
