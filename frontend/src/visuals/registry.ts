import type { ComponentType } from 'react'
import gsapSource from 'gsap/dist/gsap.min.js?raw'

/**
 * Les visuels interactifs vivent à côté de leur leçon, dans content/.
 * Chaque module exporte `id` (celui de visual.yaml) et un composant par défaut.
 */
type VisualModule = { id: string; default: ComponentType }

const modules = import.meta.glob<VisualModule>('../../../content/**/visuals/*/*.tsx', { eager: true })

export const visualComponents: Record<string, ComponentType> = Object.fromEntries(
  Object.values(modules)
    .filter((m) => typeof m.id === 'string')
    .map((m) => [m.id, m.default]),
)

/**
 * Compositions HyperFrames (format `hyperframes`) : un fichier HTML autonome avec
 * `<meta name="visual-id">` et une timeline GSAP en pause sur `window.__timelines`.
 * Le <script> GSAP du CDN est remplacé par la copie npm : le lecteur marche hors ligne.
 */
const scenes = import.meta.glob<string>('../../../content/**/visuals/*/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const VISUAL_ID = /<meta\s+name="visual-id"\s+content="([^"]+)"/
const GSAP_CDN = /<script\s+src="[^"]*gsap[^"]*"><\/script>/

export const withLocalGsap = (html: string) => html.replace(GSAP_CDN, () => `<script>${gsapSource}</script>`)

export const hyperframesScenes: Record<string, string> = Object.fromEntries(
  Object.values(scenes).flatMap((html) => {
    const id = VISUAL_ID.exec(html)?.[1]
    if (!id) return []
    return [[id, withLocalGsap(html)]]
  }),
)
