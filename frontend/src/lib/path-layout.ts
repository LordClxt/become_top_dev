import type { Course, CourseChapter } from '@/lib/api'

/** Géométrie du chemin de la carte du cours (logique pure, sans React). */

export const PATH_WIDTH = 600
const CENTER = PATH_WIDTH / 2
const AMPLITUDE = 150
const STEP = 184
const CAMP_GAP = 84
const TOP = 24

export type Point = { x: number; y: number }

export type PathNode = Point & {
  chapter: CourseChapter
  number: number
  /** Le libellé se place du côté opposé à la courbe. */
  side: 'left' | 'right'
}

export type Camp = { title: string; optional: boolean; count: number; y: number }

export type PathLayout = {
  main: PathNode[]
  optional: PathNode[]
  camps: Camp[]
  summit: Point
  height: number
  /** Tracé pointillé de tout le parcours principal, jusqu'au sommet. */
  trailD: string
  /** Embranchement facultatif, depuis le sommet. */
  branchD: string
  /** Tracé plein jusqu'à l'étape en cours. */
  progressD: string
  currentIndex: number
}

const isActive = (ch: CourseChapter) => ch.available && ch.mastery.unlocked && !ch.mastery.mastered

/** Courbe en S entre deux points : tangentes verticales à chaque nœud. */
function curve(points: Point[]): string {
  return points
    .map((b, i) => {
      const a = points[i - 1]
      if (!a) return `M ${b.x} ${b.y}`
      const mid = (b.y - a.y) / 2
      return `C ${a.x} ${a.y + mid} ${b.x} ${b.y - mid} ${b.x} ${b.y}`
    })
    .join(' ')
}

export function layoutCourse(course: Course): PathLayout {
  const main: PathNode[] = []
  const optional: PathNode[] = []
  const camps: Camp[] = []
  let y = TOP
  let i = 0

  const place = (ch: CourseChapter, phase: number): PathNode => {
    const x = Math.round(CENTER + AMPLITUDE * Math.sin(phase * 0.95))
    return { chapter: ch, number: Number.parseInt(ch.slug, 10), x, y, side: x > CENTER + 20 ? 'left' : 'right' }
  }

  for (const track of course.tracks.filter((t) => !t.optional)) {
    y += CAMP_GAP
    camps.push({ title: track.title, optional: false, count: track.chapters.length, y: y - 76 })
    for (const ch of track.chapters) {
      main.push(place(ch, i++))
      y += STEP
    }
  }

  const summit = { x: CENTER, y: y + 8 }
  y = summit.y + 96

  // Le sentier facultatif part du sommet, de l'autre côté de la dernière étape.
  let phase = (main.at(-1)?.x ?? CENTER) > CENTER ? -1.6 : 1.6
  for (const track of course.tracks.filter((t) => t.optional)) {
    y += CAMP_GAP
    camps.push({ title: track.title, optional: true, count: track.chapters.length, y: y - 76 })
    for (const ch of track.chapters) {
      optional.push(place(ch, phase))
      phase += 0.95
      y += STEP
    }
  }

  let currentIndex = main.findIndex((n) => isActive(n.chapter))
  if (currentIndex === -1) {
    // Tout ce qui est disponible est maîtrisé : on se tient à la dernière étape maîtrisée.
    currentIndex = main.findLastIndex((n) => n.chapter.available && n.chapter.mastery.mastered)
  }
  const allMastered = main.every((n) => n.chapter.available && n.chapter.mastery.mastered)
  const reached = allMastered ? [...main, summit] : main.slice(0, currentIndex + 1)

  return {
    main,
    optional,
    camps,
    summit,
    height: y + 24,
    trailD: curve([...main, summit]),
    branchD: optional.length > 0 ? curve([{ x: summit.x, y: summit.y + 62 }, ...optional]) : '',
    progressD: reached.length > 1 ? curve(reached) : '',
    currentIndex,
  }
}
