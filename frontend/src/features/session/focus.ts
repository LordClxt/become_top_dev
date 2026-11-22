import { useLocation } from '@tanstack/react-router'
import { useEffect, useSyncExternalStore } from 'react'
import { setQuiet } from '@/features/juice/sound'
import { getSettings } from '@/lib/settings'

/**
 * Mode concentration : pendant une leçon ou un TP, l'en-tête ne garde que le minuteur de séance, et les XP,
 * la série, les célébrations et les sons attendent la sortie du mode. Choix propre à ce navigateur ;
 * sans choix enregistré, on suit le réglage « Concentration par défaut ».
 */

const KEY = 'btd-focus'
const listeners = new Set<() => void>()
let stored: boolean | null | undefined // undefined : pas encore lu

function read(): boolean {
  if (stored === undefined) {
    stored = null
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw === 'on' || raw === 'off') stored = raw === 'on'
      } catch {}
    }
  }
  return stored ?? getSettings().focusDefault
}

export function setFocus(on: boolean) {
  stored = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {}
  for (const l of listeners) l()
}

export function toggleFocus() {
  setFocus(!read())
}

/** Le réglage par défaut a changé : on oublie le choix explicite pour le suivre. */
export function resetFocusChoice() {
  stored = null
  try {
    localStorage.removeItem(KEY)
  } catch {}
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Pages de travail où le mode s'applique. */
export function isWorkPath(pathname: string) {
  return pathname.startsWith('/lessons/') || pathname.startsWith('/exercises/')
}

/** Le mode est-il demandé (indépendamment de la page) ? */
export function useFocusPreference(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}

/** Le mode est-il actif ici : demandé, et sur une page de leçon ou de TP. */
export function useFocusActive(): boolean {
  const on = useFocusPreference()
  const pathname = useLocation({ select: (l) => l.pathname })
  return on && isWorkPath(pathname)
}

function editable(el: Element | null) {
  if (!el || el === document.body) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  return (el as HTMLElement).isContentEditable || !!el.closest('.cm-editor, [role="dialog"]')
}

/**
 * À monter une fois dans l'espace connecté : la touche F bascule le mode sur une page de travail,
 * et `<html data-focus>` permet au CSS de masquer les mentions d'XP (`.xp-hint`).
 */
export function useFocusShell() {
  const active = useFocusActive()
  const pathname = useLocation({ select: (l) => l.pathname })
  const work = isWorkPath(pathname)

  useEffect(() => {
    setQuiet(active)
    if (active) document.documentElement.dataset.focus = 'on'
    else delete document.documentElement.dataset.focus
  }, [active])

  useEffect(() => {
    if (!work) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || (e.key !== 'f' && e.key !== 'F')) return
      if (editable(document.activeElement)) return
      e.preventDefault()
      toggleFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work])

  return active
}
