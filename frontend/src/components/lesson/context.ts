import { createContext } from 'react'
import type { Checkpoint } from '@/lib/api'

export type LessonContextValue = {
  lessonId?: string
  language: string
  checkpoints: Checkpoint[]
  /** Ids des points de contrôle dans l'ordre du texte. */
  checkpointOrder: string[]
  glossary: { term: string; definition: string }[]
  /** Termes du glossaire dont la première occurrence tombe dans ce bloc. */
  glossaryTerms: string[]
  compact: boolean
}

export const LessonContext = createContext<LessonContextValue>({
  language: 'go',
  checkpoints: [],
  checkpointOrder: [],
  glossary: [],
  glossaryTerms: [],
  compact: false,
})
