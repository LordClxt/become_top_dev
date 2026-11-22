import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Minuteur de séance, calé sur les deux créneaux de la journée : le matin (60 min) et le soir (90 min).
 * Une séance enchaîne révision, blocs de travail, pauses loin de l'écran et un bilan. L'état tient dans
 * ce navigateur (horodatages absolus) : un rechargement ou une autre page ne l'interrompt pas.
 */

export type PhaseKind = 'review' | 'work' | 'break' | 'recap'
export type Phase = { kind: PhaseKind; min: number }
export type TemplateId = 'morning' | 'evening'
export type Template = { id: TemplateId; label: string; phases: Phase[] }

export const TEMPLATES: Record<TemplateId, Template> = {
  morning: {
    id: 'morning',
    label: 'Matin',
    phases: [
      { kind: 'review', min: 10 },
      { kind: 'work', min: 20 },
      { kind: 'break', min: 5 },
      { kind: 'work', min: 20 },
      { kind: 'recap', min: 5 },
    ],
  },
  evening: {
    id: 'evening',
    label: 'Soir',
    phases: [
      { kind: 'review', min: 10 },
      { kind: 'work', min: 22 },
      { kind: 'break', min: 5 },
      { kind: 'work', min: 22 },
      { kind: 'break', min: 5 },
      { kind: 'work', min: 21 },
      { kind: 'recap', min: 5 },
    ],
  },
}

export const PHASE_LABEL: Record<PhaseKind, string> = {
  review: 'Révision',
  work: 'Travail',
  break: 'Pause',
  recap: 'Bilan',
}

export const PHASE_HINT: Record<PhaseKind, string> = {
  review: "Commence par les cartes dues : on retient mieux ce qu'on va chercher en mémoire.",
  work: "Une seule chose : la leçon ou le TP en cours. Le reste attend.",
  break: "Lève-toi, éloigne-toi de l'écran. Pas de téléphone : laisse le cerveau ranger.",
  recap: 'Écris en trois lignes ce que tu retiens et ce qui reste flou, sans regarder la leçon.',
}

export function totalMin(t: Template) {
  return t.phases.reduce((n, p) => n + p.min, 0)
}

/** Modèle conseillé à cette heure : le matin avant midi, le soir ensuite. */
export function suggestedTemplate(date = new Date()): TemplateId {
  return date.getHours() < 12 ? 'morning' : 'evening'
}

type Stored = { template: TemplateId; startedAt: number; pausedAt: number | null; pausedMs: number }

const KEY = 'btd-session'
/** Une séance oubliée (onglet resté ouvert la nuit) ne survit pas au-delà. */
const STALE_MS = 6 * 3600 * 1000

const listeners = new Set<() => void>()
let state: Stored | null | undefined

function read(): Stored | null {
  if (state === undefined) {
    state = null
    if (typeof window !== 'undefined') {
      try {
        const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null
        if (v && TEMPLATES[v.template] && Date.now() - v.startedAt < STALE_MS) state = v
      } catch {}
    }
  }
  return state
}

function write(next: Stored | null) {
  state = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {}
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  // Une autre fenêtre a démarré ou arrêté la séance.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    state = undefined
    l()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

export function startSession(template: TemplateId) {
  write({ template, startedAt: Date.now(), pausedAt: null, pausedMs: 0 })
}

export function stopSession() {
  write(null)
}

export function togglePause() {
  const s = read()
  if (!s) return
  const now = Date.now()
  write(s.pausedAt ? { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) } : { ...s, pausedAt: now })
}

/** Passe à la phase suivante (pause écourtée, bloc fini en avance). */
export function skipPhase() {
  const s = read()
  if (!s) return
  const v = view(s, Date.now())
  if (v.ended) return
  write({ ...s, startedAt: s.startedAt - v.remainingMs })
}

export type SessionView = {
  template: Template
  /** Index de la phase en cours (égal au nombre de phases quand la séance est finie). */
  index: number
  phase: Phase | null
  elapsedMs: number
  remainingMs: number // de la phase en cours
  paused: boolean
  ended: boolean
}

export function view(s: Stored, now: number): SessionView {
  const template = TEMPLATES[s.template]
  const elapsedMs = Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedMs)
  let end = 0
  for (const [i, phase] of template.phases.entries()) {
    end += phase.min * 60_000
    if (elapsedMs < end) {
      return { template, index: i, phase, elapsedMs, remainingMs: end - elapsedMs, paused: !!s.pausedAt, ended: false }
    }
  }
  return { template, index: template.phases.length, phase: null, elapsedMs, remainingMs: 0, paused: !!s.pausedAt, ended: true }
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

/** La séance en cours, recalculée chaque seconde ; null sans séance (et au rendu serveur). */
export function useSession(): SessionView | null {
  const s = useSyncExternalStore(subscribe, read, () => null)
  const now = useNow(!!s && !s.pausedAt)
  return s ? view(s, now) : null
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
