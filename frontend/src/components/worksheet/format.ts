/** Mise en forme des métriques d'un tuner. */
const fr = (v: number, digits: number) => v.toLocaleString('fr-FR', { maximumSignificantDigits: digits })

export function formatMetric(v: number, format: string, unit = ''): string {
  const suffix = unit ? ` ${unit}` : ''
  switch (format) {
    case 'percent':
      return `${(v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 5 })} %`
    case 'bytes': {
      const units = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po']
      let n = v
      let i = 0
      while (Math.abs(n) >= 1000 && i < units.length - 1) {
        n /= 1000
        i++
      }
      return `${fr(n, 3)} ${units[i]}`
    }
    case 'duration-s': {
      if (v < 1) return `${fr(v * 1000, 3)} ms`
      if (v < 120) return `${fr(v, 3)} s`
      if (v < 7200) return `${fr(v / 60, 3)} min`
      if (v < 172800) return `${fr(v / 3600, 3)} h`
      return `${fr(v / 86400, 3)} j`
    }
    default:
      return `${fr(v, 5)}${suffix}`
  }
}
