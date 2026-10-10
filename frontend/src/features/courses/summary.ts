import type { CatalogCourse, Course, CourseChapter } from '@/lib/api'

type Available<C> = Extract<C, { available: true }>

/** Synthèse d'un cours pour les listes et la carte (logique pure). */
export function summarizeCourse(course: Course) {
  const all = course.tracks.flatMap((t) => t.chapters)
  const available = all.filter((c): c is Available<CourseChapter> => c.available)
  let mastered = 0
  let lessonsDone = 0
  let lessonsTotal = 0
  for (const c of available) {
    if (c.mastery.mastered) mastered++
    lessonsDone += c.mastery.lessons_done
    lessonsTotal += c.mastery.lessons_total
  }
  const next = available.find((c) => c.mastery.unlocked && !c.mastery.mastered) ?? null
  return { total: all.length, available: available.length, mastered, lessonsDone, lessonsTotal, next }
}

export function countModules(course: CatalogCourse) {
  const all = course.tracks.flatMap((t) => t.chapters)
  return { total: all.length, written: all.filter((c) => c.available).length }
}

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
