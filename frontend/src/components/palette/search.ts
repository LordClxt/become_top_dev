/** Recherche floue sans dépendance : sous-chaîne insensible aux accents, bonus en début de mot. */

export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Score > 0 si chaque mot de la requête apparaît dans le texte ; plus haut si en début de texte ou de mot. */
export function score(query: string, text: string): number {
  const hay = fold(text)
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  let total = 0
  for (const w of words) {
    const at = hay.indexOf(w)
    if (at === -1) return 0
    let s = 1
    if (at === 0) s += 3
    else if (/[\s\-_/.:'’(]/.test(hay[at - 1] ?? '')) s += 2
    // Un mot qui commence ailleurs compte aussi.
    else if (new RegExp(`(^|[\\s\\-_/.:'’(])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay)) s += 2
    total += s + w.length / Math.max(hay.length, 1)
  }
  return total
}
