import { BookOpen, CircleCheckBig, CodeXml, type LucideIcon, LockOpen } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useReveal } from '@/lib/use-reveal'

/** Instants (s) où le jeton atteint chaque étape ; à garder en phase avec @keyframes loop-token. */
const ARRIVALS = [0.38, 1.17, 2.25, 3.33]

const STATIONS: { icon: LucideIcon; title: string; text: string; reward: string }[] = [
  {
    icon: BookOpen,
    title: 'Lire',
    text: 'Une leçon courte, tirée du livre, avec la page d’origine.',
    reward: '+30 XP',
  },
  {
    icon: CodeXml,
    title: 'Coder',
    text: 'Un exercice dans l’éditeur, exécuté pour de vrai.',
    reward: 'indices au besoin',
  },
  {
    icon: CircleCheckBig,
    title: 'Valider',
    text: 'Des tests valident ton code. Pour l’architecture, une grille d’évaluation.',
    reward: '+50 XP',
  },
  {
    icon: LockOpen,
    title: 'Ouvrir la suite',
    text: 'Le module suivant s’ouvre quand tu maîtrises celui-ci.',
    reward: 'module suivant',
  },
]

const at = (s: number) => ({ '--d': `${s}s` }) as CSSProperties

export function ModuleLoop() {
  const reveal = useReveal<HTMLOListElement>(0.5)
  return (
    <ol {...reveal} className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
      {/* Le rail et son jeton, du centre de la première étape au centre de la dernière. */}
      <li className="pointer-events-none absolute top-7 right-[12.5%] left-[12.5%] hidden h-0.5 md:block" aria-hidden="true">
        <span className="absolute inset-0 bg-line" />
        <span className="reveal-grow absolute inset-0 bg-accent/50" style={{ ...at(0.2), transitionDuration: '3.2s' }} />
        <span className="loop-token absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-accent shadow-[0_0_18px_var(--accent)]" />
      </li>
      {STATIONS.map(({ icon: Icon, title, text, reward }, i) => (
        <li key={title} className="relative flex flex-col items-start md:items-center md:text-center">
          <span
            className="loop-station relative grid size-14 place-items-center rounded-2xl border-2 border-accent bg-surface text-accent"
            style={at(ARRIVALS[i]!)}
          >
            <Icon className="size-6" strokeWidth={1.75} />
          </span>
          <h3 className="mt-5 text-lg font-semibold">{title}</h3>
          <p className="mt-2 max-w-[30ch] leading-relaxed text-muted">{text}</p>
          <span
            className="reveal-fade mt-4 rounded-full border border-line bg-surface px-3 py-1 font-code text-xs text-accent"
            style={at(ARRIVALS[i]! + 0.15)}
          >
            {reward}
          </span>
        </li>
      ))}
    </ol>
  )
}
