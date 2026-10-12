import { Player, type PlayerRef } from '@remotion/player'
import { type ComponentType, type CSSProperties, type ReactNode, useEffect, useRef } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'

/**
 * Cadre commun des vidéos du module concurrence.
 * Une vidéo = une trace `Step<S>[]` produite par un petit modèle pur ; chaque étape dure `stepFrames`,
 * dont `MOVE` images de déplacement. Aucune animation CSS : tout dépend de `useCurrentFrame()`.
 */

export const FPS = 30
export const STEP_FRAMES = 54
const MOVE = 20
const OUTRO = 36

export type Step<S> = { title: string; detail: string; state: S; line?: number | null }

export const durationOf = (n: number, stepFrames = STEP_FRAMES) => n * stepFrames + OUTRO
export const ease = Easing.bezier(0.22, 1, 0.36, 1)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export type SceneFrame<S> = {
  step: Step<S>
  prev: S | null
  k: number
  /** Image courante dans l'étape. */
  local: number
  /** Progression eased (0 → 1) du déplacement au début de l'étape. */
  t: number
  /** Dimensions de la scène (zone disponible pour les éléments). */
  w: number
  h: number
}

const MONO = 'var(--font-code)'
const READ = 'var(--font-read)'

export function TraceScene<S>({
  steps,
  program,
  file = 'main.go',
  stepFrames = STEP_FRAMES,
  children,
}: {
  steps: Step<S>[]
  program?: string[]
  file?: string
  stepFrames?: number
  children: (f: SceneFrame<S>) => ReactNode
}) {
  const frame = useCurrentFrame()
  const k = Math.min(Math.floor(frame / stepFrames), steps.length - 1)
  const local = frame - k * stepFrames
  const t = ease(Math.min(1, Math.max(0, local / MOVE)))
  const step = steps[k]!
  const prev = steps[k - 1]?.state ?? null
  const textIn = interpolate(local, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  const withCode = program !== undefined
  // Mise en page : légende en haut, scène dessous, bas libre pour la barre de contrôle du lecteur.
  const stageTop = 156
  const stageLeft = withCode ? 524 : 40
  const w = 1280 - stageLeft - 40
  const h = 480

  return (
    <AbsoluteFill style={{ background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ position: 'absolute', left: 40, right: 40, top: 26, display: 'flex', gap: 24, opacity: textIn }}>
        <span style={{ paddingTop: 8, fontFamily: MONO, fontSize: 20, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {String(k + 1).padStart(2, '0')}/{steps.length}
        </span>
        <div>
          <p style={{ margin: 0, fontFamily: READ, fontSize: 34, lineHeight: 1.15, fontWeight: 600 }}>{step.title}</p>
          <p style={{ margin: '6px 0 0', fontSize: 24, lineHeight: 1.3, color: 'var(--text-muted)' }}>{step.detail}</p>
        </div>
      </div>
      {withCode && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: stageTop,
            width: 456,
            height: h,
            border: '2px solid var(--line)',
            borderRadius: 20,
            background: 'var(--ink)',
            padding: '16px 0',
            overflow: 'hidden',
          }}
        >
          <p style={{ margin: '0 0 8px', padding: '0 22px', fontFamily: MONO, fontSize: 15, color: 'var(--text-muted)' }}>{file}</p>
          {program.map((text, i) => (
            <pre
              key={i}
              style={{
                margin: 0,
                padding: '0 22px',
                fontFamily: MONO,
                fontSize: 17,
                lineHeight: '30px',
                whiteSpace: 'pre',
                background: i === step.line ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'transparent',
                color: i === step.line ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              {text}
            </pre>
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', left: stageLeft, top: stageTop, width: w, height: h }}>
        {children({ step, prev, k, local, t, w, h })}
      </div>
    </AbsoluteFill>
  )
}

export type Tone = 'accent' | 'plain' | 'fail' | 'pass' | 'ghost'

const TONES: Record<Tone, CSSProperties> = {
  accent: { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' },
  plain: { background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--line)' },
  fail: { background: 'var(--ink)', color: 'var(--fail)', borderColor: 'var(--fail)' },
  pass: { background: 'var(--ink)', color: 'var(--pass)', borderColor: 'var(--pass)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--line)' },
}

/** Pastille : une goroutine, une valeur, une requête… positionnée en absolu dans la scène. */
export function Chip({
  x,
  y,
  w = 64,
  h = 64,
  label,
  sub,
  tone = 'plain',
  dashed = false,
  opacity = 1,
  scale = 1,
  glow = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  label: string
  sub?: string
  tone?: Tone
  dashed?: boolean
  opacity?: number
  scale?: number
  glow?: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        display: 'grid',
        placeItems: 'center',
        border: `2px ${dashed ? 'dashed' : 'solid'}`,
        borderRadius: 16,
        fontFamily: MONO,
        opacity,
        scale: String(scale),
        boxShadow: glow ? '0 0 0 6px color-mix(in oklab, var(--accent) 35%, transparent)' : 'none',
        ...TONES[tone],
      }}
    >
      <span style={{ textAlign: 'center', lineHeight: 1.1 }}>
        <span style={{ display: 'block', fontSize: 22, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: 'block', marginTop: 2, fontSize: 13 }}>{sub}</span>}
      </span>
    </div>
  )
}

/** Cadre nommé : un processeur, un channel, une zone. */
export function Panel({
  x,
  y,
  w,
  h,
  title,
  note,
  active = false,
  dashed = false,
}: {
  x: number
  y: number
  w: number
  h: number
  title?: string
  note?: string
  active?: boolean
  dashed?: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        border: `2px ${dashed ? 'dashed' : 'solid'} ${active ? 'var(--accent)' : 'var(--line)'}`,
        borderRadius: 20,
        background: 'var(--ink)',
      }}
    >
      {title && (
        <span style={{ position: 'absolute', top: 12, left: 20, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>{title}</span>
          {note && <span style={{ fontSize: 17, color: 'var(--text-muted)' }}>{note}</span>}
        </span>
      )}
    </div>
  )
}

/** Case vide d'un emplacement (file, tampon). */
export function Slot({ x, y, w = 64, h = 64 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: '2px dashed var(--line)', borderRadius: 16 }}
    />
  )
}

export function Text({
  x,
  y,
  children,
  size = 20,
  tone = 'muted',
  mono = false,
  weight = 400,
  opacity = 1,
  w,
  align = 'left',
}: {
  x: number
  y: number
  children: ReactNode
  size?: number
  tone?: 'muted' | 'text' | 'fail' | 'pass' | 'accent'
  mono?: boolean
  weight?: number
  opacity?: number
  w?: number
  align?: 'left' | 'center' | 'right'
}) {
  const color = { muted: 'var(--text-muted)', text: 'var(--text)', fail: 'var(--fail)', pass: 'var(--pass)', accent: 'var(--accent)' }[tone]
  return (
    <span
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        textAlign: align,
        fontSize: size,
        fontFamily: mono ? MONO : undefined,
        fontWeight: weight,
        color,
        opacity,
        whiteSpace: w ? 'normal' : 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  )
}

/** Segment entre deux points de la scène (trait plein ou pointillé). */
export function Line({
  x1,
  y1,
  x2,
  y2,
  tone = 'plain',
  dashed = false,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  tone?: 'plain' | 'accent' | 'fail'
  dashed?: boolean
}) {
  const stroke = { plain: 'var(--line)', accent: 'var(--accent)', fail: 'var(--fail)' }[tone]
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} width={1} height={1}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={3} strokeDasharray={dashed ? '2 8' : undefined} strokeLinecap="round" />
    </svg>
  )
}

/**
 * Lance la lecture une seule fois, quand le lecteur est visible à 60 % (comme les animations HyperFrames du cours DDIA).
 * Sans effet si l'utilisateur préfère réduire les animations : il garde la main avec la barre de contrôle.
 */
export function useAutoplay() {
  const ref = useRef<PlayerRef>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let started = false
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started) {
          started = true
          ref.current?.play()
          io.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, box }
}

export function TracePlayer({ component, steps, stepFrames = STEP_FRAMES }: { component: ComponentType; steps: number; stepFrames?: number }) {
  const { ref, box } = useAutoplay()
  return (
    <div ref={box}>
      <Player
        ref={ref}
        component={component}
        durationInFrames={durationOf(steps, stepFrames)}
        fps={FPS}
        compositionWidth={1280}
        compositionHeight={720}
        controls
        showVolumeControls={false}
        clickToPlay
        style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
      />
    </div>
  )
}
