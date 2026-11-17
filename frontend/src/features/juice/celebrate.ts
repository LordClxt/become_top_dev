import type { XpGain } from '@/features/xp/xp-events'

/**
 * File des « moments » plein écran : un seul à la fois, chacun bref et congédiable.
 * Les autres agents peuvent appeler `celebrate()` directement (par ex. un coffre ouvert) ;
 * les gains d'XP passent normalement par `announceXp`, que la couche de célébration écoute.
 */

export type Moment =
  | { type: 'gain'; gain: XpGain }
  | { type: 'level'; level: number }
  | { type: 'streak'; days: number }
  | { type: 'mastered'; title?: string }

export type QueuedMoment = Moment & { key: number }

let queue: QueuedMoment[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export function celebrate(moment: Moment) {
  // Pas deux annonces de niveau identiques à la suite (double invalidation de la progression).
  if (moment.type === 'level' && queue.some((m) => m.type === 'level' && m.level === moment.level)) return
  queue = [...queue, { ...moment, key: ++seq }]
  emit()
}

export function dismissMoment(key: number) {
  queue = queue.filter((m) => m.key !== key)
  emit()
}

export function subscribeMoments(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function currentMoment(): QueuedMoment | null {
  return queue[0] ?? null
}

/** Les gains qui méritent un moment plein écran (les autres volent vers l'en-tête). */
export function isBigGain(gain: XpGain): boolean {
  return gain.kind === 'lesson' || gain.kind === 'lab' || gain.kind === 'assignment' || gain.kind === 'project' || gain.kind === 'boss'
}

// --- Impact sur l'en-tête : la pastille arrive, le cluster XP réagit ----------------

const hitListeners = new Set<(amount: number) => void>()

export function hitHeader(amount: number) {
  for (const l of hitListeners) l(amount)
}

export function onHeaderHit(cb: (amount: number) => void) {
  hitListeners.add(cb)
  return () => {
    hitListeners.delete(cb)
  }
}

/** Dernière position du pointeur : point de départ de la pastille volante. */
let lastPointer: { x: number; y: number; at: number } | null = null
export function trackPointer() {
  if (typeof window === 'undefined') return () => {}
  const onDown = (e: PointerEvent) => {
    lastPointer = { x: e.clientX, y: e.clientY, at: Date.now() }
  }
  window.addEventListener('pointerdown', onDown, true)
  return () => window.removeEventListener('pointerdown', onDown, true)
}
export function launchPoint(): { x: number; y: number } {
  // Un clic récent (validation à la souris) ; sinon l'élément actif (validation au clavier) ; sinon le bas de l'écran.
  if (lastPointer && Date.now() - lastPointer.at < 4000) return lastPointer
  // Une zone qui se déclare point de départ (le quiz, un point de contrôle) et qui est à l'écran.
  for (const el of document.querySelectorAll('[data-xp-origin]')) {
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.bottom > 60 && r.top < window.innerHeight) {
      return { x: r.left + Math.min(r.width / 2, 120), y: Math.min(window.innerHeight - 40, Math.max(80, r.top + r.height / 2)) }
    }
  }
  const el = document.activeElement
  if (el && el !== document.body) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.bottom > 0 && r.top < window.innerHeight) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight - 120 }
}
