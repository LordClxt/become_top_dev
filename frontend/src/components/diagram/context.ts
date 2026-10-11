import { createContext, useContext } from 'react'
import type { Node } from '@xyflow/react'
import type { EdgeKind, PaletteItem } from '@/lib/api'
import type { CatalogIndex } from './catalog'

/** Données d'un bloc posé sur le canvas. Le titre est modifiable ; le composant du catalogue, lui, est fixe. */
export type NodeData = {
  itemType: string
  component: string
  label: string
  props: Record<string, string>
  w?: number
  h?: number
}
export type CNode = Node<NodeData, 'component' | 'zone'>

export type EdgeData = { kind: EdgeKind; label: string }

export type Tone = 'req' | 'res' | 'async' | 'repl' | 'fail'
export type Pulse = { key: number; edge: string; reverse: boolean; tone: Tone }
export type NodeFlag = 'down' | 'hit' | 'miss' | 'visit'

export type EditorCtx = {
  catalog: CatalogIndex
  palette: Map<string, PaletteItem>
  /** Petits points qui montrent le sens du flux sur chaque flèche. */
  flow: boolean
  pulses: Pulse[]
  /** Blocs et flèches en échec après « Vérifier », avec ce qu'il y a à corriger. */
  errors: Map<string, string>
  /** Marques de la simulation (survol d'un bloc, cache chaud ou froid, panne). */
  flags: Map<string, NodeFlag>
  actions: {
    rename: (id: string, label: string) => void
    remove: (id: string) => void
    duplicate: (id: string) => void
    toggleDown: (id: string) => void
  }
}

export const EditorContext = createContext<EditorCtx | null>(null)

export function useEditor(): EditorCtx {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('EditorContext manquant')
  return ctx
}
