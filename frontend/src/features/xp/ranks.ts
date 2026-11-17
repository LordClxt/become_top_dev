/** Titres de rang par tranche de niveau (le titre vaut du niveau indiqué jusqu'au suivant). */
const RANKS: { from: number; title: string }[] = [
  { from: 1, title: 'Apprenti' },
  { from: 3, title: 'Compagnon' },
  { from: 5, title: 'Artisan' },
  { from: 8, title: 'Ingénieur' },
  { from: 12, title: 'Architecte' },
  { from: 16, title: 'Maître artisan' },
  { from: 20, title: 'Légende' },
]

export function rankFor(level: number): string {
  let title = 'Apprenti'
  for (const r of RANKS) if (level >= r.from) title = r.title
  return title
}

/** Prochain titre et niveau requis, ou null au sommet. */
export function nextRank(level: number): { level: number; title: string } | null {
  const next = RANKS.find((r) => r.from > level)
  return next ? { level: next.from, title: next.title } : null
}
