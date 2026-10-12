import type { Step } from '../../../../_shared/trace'

/**
 * Loi d'Amdahl : si une fraction p du travail est parallélisable, le temps avec n cœurs vaut (1 - p) + p / n
 * (en unités du temps séquentiel), et le gain maximal est 1 / (1 - p). Ici p = 0,75.
 */
export const P = 0.75
export type State = { n: number; serial: number; parallel: number; total: number; speedup: number }

export const PROGRAM = ['// 100 unités de travail :', '//  25 séquentielles', '//  75 parallélisables']

const at = (n: number): State => {
  const serial = 1 - P
  const parallel = P / n
  return { n, serial, parallel, total: serial + parallel, speedup: 1 / (serial + parallel) }
}

export function scenario(): Step<State>[] {
  const f = (x: number) => x.toFixed(2).replace('.', ',')
  const mk = (n: number, title: string, detail: string, line: number | null): Step<State> => ({ title, detail, state: at(n), line })
  return [
    mk(1, 'Un cœur : la référence', 'Les 100 unités s’exécutent l’une après l’autre. Le temps total vaut 1 (100 %).', 0),
    mk(2, 'Deux cœurs', `Les 75 unités parallélisables se partagent : temps ${f(at(2).total)} soit un gain de ×${f(at(2).speedup)}, pas ×2.`, 2),
    mk(4, 'Quatre cœurs', `Temps ${f(at(4).total)} : gain de ×${f(at(4).speedup)}. Doubler les cœurs ne double plus la vitesse.`, 2),
    mk(8, 'Huit cœurs', `Temps ${f(at(8).total)} : gain de ×${f(at(8).speedup)}. La part séquentielle domine déjà le temps restant.`, 1),
    mk(64, 'Soixante-quatre cœurs', `Temps ${f(at(64).total)} : gain de ×${f(at(64).speedup)}. On approche d’un plafond.`, 1),
    mk(
      1e9,
      'Le plafond : 1 / (1 − p)',
      `Même avec une infinité de cœurs, les 25 unités séquentielles restent : le gain ne dépasse jamais ×${f(1 / (1 - P))}. Avant d’ajouter des goroutines, mesure la part vraiment parallélisable.`,
      null,
    ),
  ]
}

export const STEPS = scenario()
