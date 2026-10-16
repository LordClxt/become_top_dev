/**
 * Client de l'API Go. Dans le navigateur, tout passe par /api (proxy Vite en dev, même domaine en prod).
 * Pendant le rendu serveur, on appelle le backend en direct et on relaie le cookie de session.
 */

import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const transport = createIsomorphicFn()
  .server(() => ({
    base: process.env.BTD_API_URL ?? 'http://127.0.0.1:8000',
    cookie: getRequestHeader('cookie'),
  }))
  .client(() => ({ base: '', cookie: undefined as string | undefined }))

/** Référence à la source : chapitre et pages d'un livre, ou page de documentation (url). */
export type Source = { chapter: number; pages: string; url?: string }

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { base, cookie } = transport()
  const headers: Record<string, string> = {}
  if (init?.body) headers['content-type'] = 'application/json'
  if (cookie) headers.cookie = cookie
  const res = await fetch(`${base}/api${path}`, { credentials: 'include', headers, ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, typeof body.detail === 'string' ? body.detail : res.statusText)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

// --- Types -----------------------------------------------------------------

export type Mastery = {
  chapter_id: string
  labs_passed: number
  labs_total: number
  quiz_correct: number
  quiz_total: number
  lessons_done: number
  lessons_total: number
  score: number
  mastered: boolean
  unlocked: boolean
}

type PlannedChapter = { slug: string; available: false; title: string }
type ChapterInfo = {
  slug: string
  available: true
  id: string
  title: string
  subtitle: string
  lesson_count: number
}

export type CourseChapter = PlannedChapter | (ChapterInfo & { mastery: Mastery })
export type CatalogChapter = PlannedChapter | ChapterInfo

export type CourseRequirement = {
  course_id: string
  course_title: string
  through_title: string
  reason: string
  met: boolean
}

type CourseMeta = {
  id: string
  slug: string
  title: string
  kind: 'practical' | 'conceptual'
  summary: string
  book: { title: string; authors: string[]; slug: string }
  books?: { title: string; authors: string[]; slug: string }[]
  running_project: { id: string; title: string; pitch: string } | null
  requires: CourseRequirement[]
}

type Track<C> = { id: string; title: string; optional: boolean; chapters: C[] }

/** Cours vu par l'utilisateur connecté, avec sa maîtrise de chaque module. */
export type Course = CourseMeta & { tracks: Track<CourseChapter>[] }
/** Cours vu depuis la page d'accueil publique : aucune donnée de progression. */
export type CatalogCourse = CourseMeta & { tracks: Track<CatalogChapter>[] }

export type ExerciseSummary = {
  id: string
  title: string
  role: 'lab' | 'assignment' | 'boss' | 'project'
  difficulty: number
  xp: number
  passed: boolean
}

export type Chapter = {
  id: string
  course: { id: string; title: string }
  title: string
  subtitle: string
  source: Source
  objectives: string[]
  mastery_threshold: number
  lessons: {
    id: string
    title: string
    duration_min: number
    xp: number
    completed: boolean
    labs: ExerciseSummary[]
  }[]
  assignment: ExerciseSummary | null
  boss: ExerciseSummary | null
  project: ExerciseSummary | null
  mastery: Mastery
}

export type Visual = {
  id: string
  concept: string
  format: 'remotion' | 'interactive' | 'static' | 'hyperframes'
  justification: string
  entry: string
  status: 'idea' | 'built'
}

export type Lesson = {
  id: string
  title: string
  chapter: { id: string; title: string; course_id: string }
  source: Source
  duration_min: number
  xp: number
  extra: boolean
  body: string
  concepts: { id: string; label: string }[]
  glossary: { term: string; definition: string }[]
  visuals: Record<string, Visual>
  labs: ExerciseSummary[]
  quiz_id: string | null
  flashcards: { id: string; front: string; back: string; concept: string }[]
  completed: boolean
  previous_id: string | null
  next_id: string | null
}

export type PaletteItem = {
  type: string
  label: string
  /** Ancien format ; `component` (id du catalogue) est toujours renseigné par le backend. */
  shape: string
  component: string
  hint: string
}

export type EdgeKind = 'sync' | 'async' | 'replication' | 'read' | 'write'

/** Graphe d'un exercice `diagram` : ce que contient diagram.json (format v2, le v1 reste lisible). */
export type DiagramGraph = {
  nodes: {
    id: string
    type: string
    x: number
    y: number
    label?: string
    parent?: string
    w?: number
    h?: number
    props?: Record<string, string>
  }[]
  edges: { id: string; source: string; target: string; kind?: EdgeKind; label?: string }[]
}

export type CatalogProp = { id: string; label: string; kind: string; options: string[]; default: string }
export type CatalogComponent = {
  id: string
  label: string
  category: string
  icon: string
  hint: string
  zone: boolean
  props: CatalogProp[]
}
export type CatalogCategory = { id: string; label: string; color: string }
export type DiagramCatalog = { categories: CatalogCategory[]; components: CatalogComponent[] }

// --- Fiches interactives (kind: worksheet) ---
export type WSOption = { id: string; label: string; hint: string }
export type WSParam = { id: string; label: string; unit: string; min: number; max: number; step: number; default: number }
export type WSMetric = { id: string; label: string; expr: string; unit: string; format: string }
export type WSGoal = { id: string; label: string; expr: string }
export type WSBlock = {
  id: string
  type: 'number' | 'choice' | 'multi' | 'order' | 'match' | 'table' | 'tuner'
  title: string
  prompt: string
  unit: string
  options: WSOption[]
  items: WSOption[]
  categories: WSOption[]
  columns: { id: string; label: string }[]
  rows: { id: string; label: string; cells: Record<string, string> | null }[]
  params: WSParam[]
  metrics: WSMetric[]
  goals: WSGoal[]
}
export type Worksheet = { intro: string; blocks: WSBlock[] }
export type TunerPreview = { metrics: Record<string, number>; goals: Record<string, boolean>; error?: string }

export type SandboxExercise = {
  id: string
  title: string
  kind: Exercise['kind']
  difficulty: number
  xp: number
  course: { id: string; title: string }
  source: Source | null
  passed: boolean
  attempts: number
}

export type Exercise = {
  id: string
  title: string
  role: ExerciseSummary['role']
  kind: 'code' | 'tests' | 'design' | 'diagram' | 'worksheet'
  language: string
  difficulty: number
  xp: number
  chapter_id: string
  lesson_id: string | null
  concepts: string[]
  instructions: string
  milestones: { id: string; title: string; goal: string }[]
  rubric: { id: string; label: string; weight: number; source: string }[]
  source: Source | null
  palette: PaletteItem[]
  checks: { id: string; label: string }[]
  worksheet: Worksheet | null
  debrief: string
  workspace: {
    editable: Record<string, string>
    readonly: Record<string, string>
    hints_total: number
    hints_revealed: string[]
    attempts: number
    passed: boolean
  }
}

export type TestCase = { name: string; status: 'pass' | 'fail' | 'skip' | 'run'; output: string; refs?: string[] }

export type RunReport = {
  passed: boolean
  tests: TestCase[]
  build_output: string
  timed_out: boolean
  duration_ms: number
  xp_awarded: number
  debrief: string
}

export type QuizQuestion = {
  id: string
  type: 'single' | 'multiple' | 'code-output' | 'order' | 'free'
  prompt: string
  code: string | null
  choices: string[]
  difficulty: number
  answered: boolean
}

export type AnswerResult = { correct: boolean; expected: unknown; explanation: string; xp_awarded: number }

export type Progress = {
  xp: number
  level: number
  level_floor_xp: number
  next_level_xp: number
  streak_days: number
  longest_streak_days: number
  active_days: number
  chapters: Record<string, Mastery>
}

export type ActivityDay = {
  date: string
  lessons: number
  runs: number
  runs_passed: number
  answers: number
  xp: number
  level: 0 | 1 | 2 | 3 | 4
}

export type ActivityEvent = {
  kind: 'lesson_completed' | 'exercise_passed' | 'exercise_runs' | 'quiz_answers'
  at: string
  date: string
  title: string
  target: { type: 'lesson' | 'exercise'; id: string }
  xp: number
  count: number
  ok: number
}

export type User = { id: number; email: string; display_name: string; is_admin: boolean }

export type Me = { authenticated: boolean; user: User | null }

export type Invite = {
  code: string
  created_at: string
  expires_at: string
  status: 'pending' | 'used' | 'expired'
  used_by: string | null
  used_at: string | null
}

export type Member = User & { created_at: string; xp: number }

// --- Endpoints ---------------------------------------------------------------

export const api = {
  me: () => request<Me>('/auth/me'),
  login: (email: string, password: string) => post<Me>('/auth/login', { email, password }),
  signup: (body: { email: string; display_name: string; password: string }) =>
    post<Me>('/auth/signup', body),
  logout: () => post('/auth/logout'),
  changePassword: (current: string, next: string) =>
    request<void>('/auth/password', { method: 'PUT', body: JSON.stringify({ current, new: next }) }),

  invites: () => request<Invite[]>('/admin/invites'),
  createInvite: () => post<Invite>('/admin/invites'),
  revokeInvite: (code: string) => request<void>(`/admin/invites/${code}`, { method: 'DELETE' }),
  members: () => request<Member[]>('/admin/members'),

  catalog: () => request<CatalogCourse[]>('/catalog'),
  courses: () => request<Course[]>('/courses'),
  chapter: (id: string) => request<Chapter>(`/chapters/${id}`),
  lesson: (id: string) => request<Lesson>(`/lessons/${id}`),
  completeLesson: (id: string) => post<{ xp_awarded: number }>(`/lessons/${id}/complete`),

  sandbox: () => request<SandboxExercise[]>('/exercises'),
  exercise: (id: string) => request<Exercise>(`/exercises/${id}`),
  // keepalive : la requête survit à la fermeture de l'onglet (sauvegarde de dernière seconde).
  saveDraft: (id: string, files: Record<string, string>, keepalive = false) =>
    request<void>(`/exercises/${id}/draft`, { method: 'PUT', body: JSON.stringify({ files }), keepalive }),
  resetExercise: (id: string) => post<void>(`/exercises/${id}/reset`),
  revealHint: (id: string) => post<{ hints: string[]; hints_total: number }>(`/exercises/${id}/hints`),
  run: (id: string, files: Record<string, string>) => post<RunReport>(`/exercises/${id}/run`, { files }),
  preview: (id: string, files: Record<string, string>) =>
    post<Record<string, TunerPreview>>(`/exercises/${id}/preview`, { files }),
  diagramCatalog: () => request<DiagramCatalog>('/diagram/catalog'),

  quiz: (id: string) => request<{ id: string; lesson_id: string; language: string; questions: QuizQuestion[] }>(`/quizzes/${id}`),
  answer: (quizId: string, questionId: string, answer: unknown) =>
    post<AnswerResult>(`/quizzes/${quizId}/questions/${questionId}`, { answer }),

  progress: () => request<Progress>(`/progress?${tzParam()}`),

  profile: () => request<{ avatar_version: number | null }>('/profile'),
  uploadAvatar: async (image: Blob) => {
    const res = await fetch('/api/profile/avatar', { method: 'PUT', credentials: 'include', body: image })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, typeof body.detail === 'string' ? body.detail : res.statusText)
    }
  },
  removeAvatar: () => request<void>('/profile/avatar', { method: 'DELETE' }),
  activity: (weeks: number) => request<ActivityDay[]>(`/activity?weeks=${weeks}&${tzParam()}`),
  activityFeed: (day?: string) =>
    request<ActivityEvent[]>(`/activity/feed?${tzParam()}${day ? `&day=${day}` : ''}`),
}

/** Le jour d'une action se décide dans le fuseau du navigateur, pas dans celui du serveur. */
function tzParam(): string {
  return `tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')}`
}
