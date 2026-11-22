import { useSyncExternalStore } from 'react'

/** Préférences de l'application, propres à ce navigateur (comme le thème). */
export type Settings = {
  /** Suggestions automatiques pendant la frappe dans l'éditeur des TP. */
  autocomplete: boolean
  /** Petits sons de retour (bonne réponse, XP, niveau), synthétisés à la volée. */
  sound: boolean
  /** Moments de célébration (confettis, annonces plein écran) après une réussite. */
  celebrations: boolean
  /** Mode concentration activé d'office dans les leçons et les TP (la touche F le bascule à tout moment). */
  focusDefault: boolean
}

const KEY = 'btd-settings'
const DEFAULTS: Settings = { autocomplete: true, sound: true, celebrations: true, focusDefault: false }

let current: Settings = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load(): Settings {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    try {
      current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      // stockage indisponible ou illisible : valeurs par défaut
    }
  }
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...load(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // stockage indisponible : le réglage reste valable pour la session
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, load, () => DEFAULTS)
}

/** Lecture hors React (moteur sonore, couche de célébration). */
export function getSettings(): Settings {
  return load()
}
