import { type ComponentType, lazy, Suspense, useEffect, useState } from 'react'

/**
 * Enveloppe commune des vidéos Remotion du module : Remotion n'est chargé que dans le navigateur
 * et seulement sur les pages qui affichent la vidéo ; le déroulé en texte reste disponible dessous.
 */
export type TextStep = { title: string; detail: string }

export function makeVisual(steps: TextStep[], load: () => Promise<{ default: ComponentType }>) {
  const Video = lazy(load)
  return function VideoVisual() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const placeholder = (
      <div className="grid aspect-video w-full place-items-center rounded-xl bg-ink text-sm text-muted">
        Chargement de l’animation…
      </div>
    )

    return (
      <div>
        {mounted ? <Suspense fallback={placeholder}>{<Video />}</Suspense> : placeholder}
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-text">Lire les {steps.length} étapes en texte</summary>
          <ol className="mt-3 grid list-decimal gap-1.5 pl-5">
            {steps.map((s) => (
              <li key={s.title}>
                <span className="font-medium">{s.title}.</span> <span className="text-muted">{s.detail}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    )
  }
}
