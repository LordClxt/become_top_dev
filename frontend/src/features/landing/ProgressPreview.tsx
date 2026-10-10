import { BookOpenCheck, Flame, FlaskConical, Mountain, Swords, Trophy } from 'lucide-react'
import type { CSSProperties } from 'react'
import { StreakFlame } from '@/components/StreakFlame'
import { LevelTile } from '@/components/XpBar'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'

/** Aperçu d'un profil après quelques semaines (exemple fixe, aucune donnée réelle). */

const at = (s: number) => ({ '--d': `${s.toFixed(2)}s` }) as CSSProperties

// Quatre semaines d'activité, du lundi au dimanche : intensité 0–4, déterministe.
const WEEKS = [
  [1, 2, 0, 3, 1, 0, 0],
  [2, 1, 3, 2, 0, 1, 0],
  [0, 2, 2, 4, 3, 1, 2],
  [3, 2, 4, 3, 2, 3, 1],
]
const MIX = [0, 30, 55, 78, 100]
const cellColor = (level: number) =>
  level === 0 ? 'var(--cell-empty)' : `color-mix(in oklab, var(--accent) ${MIX[level]}%, var(--cell-empty))`

const BADGES = [
  { icon: BookOpenCheck, title: 'Première leçon', earned: true },
  { icon: FlaskConical, title: 'Premier TP au vert', earned: true },
  { icon: Flame, title: 'Une semaine pleine', earned: true },
  { icon: Trophy, title: 'Module maîtrisé', earned: false },
  { icon: Mountain, title: 'Trente jours actifs', earned: false },
]

export function ProgressPreview() {
  const reveal = useReveal<HTMLDivElement>(0.4)
  return (
    <div {...reveal} className="mt-12 overflow-hidden rounded-2xl border border-line bg-surface/70 backdrop-blur">
      <div className="grid divide-line lg:grid-cols-[1.1fr_1fr_1.1fr] lg:divide-x max-lg:divide-y">
        <div className="p-7">
          <div className="flex items-center gap-4">
            <LevelTile level={7} size="lg" />
            <div>
              <p className="font-read text-3xl font-semibold">Niveau 7</p>
              <p className="mt-1 text-sm text-muted">1 860 XP au total</p>
            </div>
          </div>
          <div className="mt-7 flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={cn('h-3.5 flex-1 rounded-[2px]', i < 6 ? 'reveal-cell bg-accent' : 'bg-cell-empty')}
                style={at(0.3 + i * 0.08)}
              />
            ))}
          </div>
          <p className="mt-2.5 font-code text-xs text-muted tabular-nums">310/500 XP, encore 190 avant le niveau 8</p>
        </div>

        <div className="p-7">
          <p className="flex items-center gap-2 font-read text-3xl font-semibold">
            <StreakFlame lit className="size-7" />
            12 jours
          </p>
          <p className="mt-1 text-sm text-muted">d’affilée, au moins une action par jour</p>
          <div className="mt-6 grid w-fit grid-flow-col grid-rows-7 gap-[3px]" aria-hidden="true">
            {WEEKS.flatMap((week, w) =>
              week.map((level, d) => (
                <span
                  key={`${w}-${d}`}
                  className="reveal-fade size-3 rounded-[3px]"
                  style={{ ...at(0.2 + (w * 7 + d) * 0.025), background: cellColor(level) }}
                />
              )),
            )}
          </div>
        </div>

        <div className="relative isolate overflow-hidden p-7">
          <div
            className="pointer-events-none absolute -right-16 -bottom-20 -z-10 size-64 rounded-full bg-fail opacity-[var(--glow-opacity)] blur-[90px]"
            aria-hidden="true"
          />
          <p className="flex items-center gap-2 text-sm text-fail">
            <Swords className="size-4" />
            Boss du module Types composites
          </p>
          <p className="mt-3 font-read text-2xl leading-snug font-semibold">L’entrepôt du Black Friday</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex gap-[3px]" role="img" aria-label="Difficulté 4 sur 5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={cn('size-3 rounded-[2px]', i < 4 ? 'bg-fail' : 'bg-cell-empty')} />
              ))}
            </span>
            <span className="font-code text-xs text-muted">difficulté 4/5</span>
          </div>
          <p className="reveal-fade mt-5 font-code text-sm text-accent" style={at(0.9)}>
            +250 XP
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-3 border-t border-line px-7 py-5" aria-label="Badges de l’exemple">
        {BADGES.map(({ icon: Icon, title, earned }, i) => (
          <li
            key={title}
            className={cn('reveal-fade flex items-center gap-2 text-sm', earned ? 'text-text' : 'text-muted')}
            style={at(1 + i * 0.1)}
          >
            <span
              className={cn(
                'grid size-7 place-items-center rounded-lg border',
                earned ? 'border-accent bg-accent/15 text-accent' : 'border-dashed border-line',
              )}
            >
              <Icon className="size-3.5" />
            </span>
            {title}
            <span className="sr-only">{earned ? ', obtenu' : ', pas encore obtenu'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
