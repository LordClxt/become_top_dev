import { createContext } from 'react'
import type { Checkpoint } from '@/lib/api'

export type LessonContextValue = {
  lessonId?: string
  language: string
  checkpoints: Checkpoint[]
  glossary: { term: string; definition: string }[]
  /** Termes du glossaire déjà soulignés dans ce rendu. */
  used: Set<string>
  compact: boolean
}

export const LessonContext = createContext<LessonContextValue>({
  language: 'go',
  checkpoints: [],
  glossary: [],
  used: new Set(),
  compact: false,
})
