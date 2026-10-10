import { useId, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

/**
 * Flamme de la série, en SVG natif (aucune dépendance).
 * Allumée : plusieurs langues de feu dont le tracé se déforme en boucle (morphing SMIL), un cœur chaud,
 * un halo, des braises, et une turbulence qui fait onduler le tout comme de l'air chaud.
 * Éteinte : un contour gris immobile. Mouvement réduit : la flamme reste allumée mais figée.
 */

const W = 32
const H = 40
const BASE = 37

/** Une langue de feu. Toutes partagent la même suite de commandes : on peut donc morpher de l'une à l'autre. */
function tongue(cx: number, w: number, h: number, lean: number): string {
  const top = BASE - h
  const tip = cx + lean
  const p = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`
  return [
    `M${p(cx, BASE)}`,
    `C${p(cx - w, BASE)} ${p(cx - w * 1.1, BASE - h * 0.45)} ${p(cx - w * 0.55 + lean * 0.35, BASE - h * 0.62)}`,
    `C${p(cx - w * 0.2 + lean * 0.7, BASE - h * 0.78)} ${p(tip - w * 0.12, top + h * 0.1)} ${p(tip, top)}`,
    `C${p(tip + w * 0.06, top + h * 0.18)} ${p(cx + w * 0.45 + lean * 0.6, BASE - h * 0.72)} ${p(cx + w * 0.7 + lean * 0.3, BASE - h * 0.5)}`,
    `C${p(cx + w * 1.05, BASE - h * 0.3)} ${p(cx + w * 0.9, BASE)} ${p(cx, BASE)}`,
    'Z',
  ].join(' ')
}

type Frame = [w: number, h: number, lean: number]

/** Images clés de chaque langue : la première et la dernière sont identiques pour boucler sans saut. */
const LAYERS = {
  left: { cx: 11, dur: '1.3s', frames: [[5, 17, -2], [4.6, 21, -3.5], [5.2, 15, -1], [4.8, 19, -3], [5, 17, -2]] },
  right: { cx: 21, dur: '1.1s', frames: [[5, 18, 2], [5.3, 14, 1], [4.7, 22, 3.5], [5, 16, 1.5], [5, 18, 2]] },
  outer: { cx: 16, dur: '1.6s', frames: [[9, 31, 0], [8.6, 34, -2.2], [9.3, 30, 1.6], [8.8, 35, 2.4], [9.1, 32, -1.2], [9, 31, 0]] },
  middle: { cx: 16, dur: '1.2s', frames: [[6.2, 21, 0], [6, 23.5, 1.4], [6.5, 19.5, -1], [6.1, 22.5, -1.6], [6.2, 21, 0]] },
  core: { cx: 16, dur: '0.9s', frames: [[3.6, 11, 0], [3.4, 12.5, -0.6], [3.8, 10.2, 0.5], [3.5, 12, 0.3], [3.6, 11, 0]] },
} satisfies Record<string, { cx: number; dur: string; frames: Frame[] }>

type LayerName = keyof typeof LAYERS

function shapes(name: LayerName) {
  const { cx, frames } = LAYERS[name]
  return frames.map(([w, h, lean]) => tongue(cx, w, h, lean))
}

const EMBERS = [
  { x: 13, drift: -2, r: 0.7, dur: '1.9s', begin: '0s' },
  { x: 19, drift: 2.5, r: 0.55, dur: '2.3s', begin: '-0.8s' },
  { x: 16, drift: 1, r: 0.45, dur: '1.6s', begin: '-1.3s' },
]

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )

function Layer({ name, fill, animate }: { name: LayerName; fill: string; animate: boolean }) {
  const d = shapes(name)
  const n = d.length - 1
  return (
    <path d={d[0]} fill={fill}>
      {animate && (
        <animate
          attributeName="d"
          values={d.join(';')}
          keyTimes={d.map((_, i) => (i / n).toFixed(3)).join(';')}
          keySplines={Array(n).fill('0.45 0 0.55 1').join(';')}
          calcMode="spline"
          dur={LAYERS[name].dur}
          repeatCount="indefinite"
        />
      )}
    </path>
  )
}

export function StreakFlame({ lit, className }: { lit: boolean; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const reduced = useReducedMotion()
  const animate = !reduced
  const ref = (s: string) => `url(#${uid}-${s})`

  if (!lit) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className={cn('size-4 text-muted', className)} aria-hidden="true">
        <path d={shapes('outer')[0]} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('size-4 overflow-visible', className)} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-halo`} cx="50%" cy="72%" r="50%">
          <stop offset="0" stopColor="#ff7a18" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-outer`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff5a00" />
          <stop offset="0.45" stopColor="#f2380f" />
          <stop offset="0.85" stopColor="#c81e0f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#8f1208" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`${uid}-middle`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd23f" />
          <stop offset="0.5" stopColor="#ff9f1c" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${uid}-core`} cx="50%" cy="80%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fff6c2" />
          <stop offset="1" stopColor="#ffd84d" />
        </radialGradient>
        {/* Air chaud : un bruit qui ondule et déforme légèrement les bords des flammes. */}
        <filter id={`${uid}-heat`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06 0.14" numOctaves="2" seed="3" result="noise">
            {animate && (
              <animate
                attributeName="baseFrequency"
                values="0.06 0.14;0.075 0.18;0.055 0.12;0.06 0.14"
                dur="2.4s"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <ellipse cx="16" cy="26" rx="15" ry="13" fill={ref('halo')}>
        {animate && (
          <animate attributeName="opacity" values="0.75;1;0.6;0.9;0.75" dur="1.7s" repeatCount="indefinite" />
        )}
      </ellipse>

      <g filter={ref('heat')}>
        <Layer name="left" fill={ref('outer')} animate={animate} />
        <Layer name="right" fill={ref('outer')} animate={animate} />
        <Layer name="outer" fill={ref('outer')} animate={animate} />
        <Layer name="middle" fill={ref('middle')} animate={animate} />
        <Layer name="core" fill={ref('core')} animate={animate} />
      </g>

      {animate &&
        EMBERS.map((e) => (
          <circle key={e.x} cx={e.x} cy={BASE - 14} r={e.r} fill="#ffc04d">
            <animate attributeName="cy" values={`${BASE - 12};${BASE - 36}`} dur={e.dur} begin={e.begin} repeatCount="indefinite" />
            <animate attributeName="cx" values={`${e.x};${e.x + e.drift / 2};${e.x + e.drift}`} dur={e.dur} begin={e.begin} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0.8;0" keyTimes="0;0.15;0.6;1" dur={e.dur} begin={e.begin} repeatCount="indefinite" />
          </circle>
        ))}
    </svg>
  )
}
