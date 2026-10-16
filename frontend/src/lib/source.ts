import type { Source } from './api'

/** Libellé court d'une source de documentation : « fundamentals/custom-providers#ancre ». */
export function docLabel(src: Source): string | null {
  if (!src.url) return null
  try {
    const u = new URL(src.url)
    return u.pathname.replace(/^\//, '') + u.hash
  } catch {
    return src.url
  }
}
