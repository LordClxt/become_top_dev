/**
 * archkit — simulateur de charge à temps discret.
 *
 * À chaque tick : les requêtes arrivent dans une file FIFO bornée, les instances en servent
 * `capacityPerInstance` chacune, l'excédent au-delà de `maxQueue` est rejeté (les plus récentes d'abord).
 * Un autoscaler optionnel décide d'un nombre d'instances qui s'applique `delayTicks` plus tard.
 */

export interface Autoscale {
  min: number;
  max: number;
  /** Utilisation visée, entre 0 et 1 (0,7 = garder 30 % de marge). */
  targetUtilization: number;
  /** Délai de démarrage : une décision prise au tick t s'applique au tick t + delayTicks. */
  delayTicks: number;
}

export interface SimConfig {
  capacityPerInstance: number;
  maxQueue: number;
  instances: number;
  costPerInstanceTick: number;
  autoscale?: Autoscale;
}

export interface TickStat {
  tick: number;
  arrivals: number;
  served: number;
  /** Requêtes en file à la fin du tick. */
  queued: number;
  rejected: number;
  instances: number;
}

export interface SimResult {
  ticks: TickStat[];
  served: number;
  rejected: number;
  cost: number;
  /** Attente (en ticks) des requêtes servies, au rang le plus proche ; 0 si rien n'a été servi. */
  p50Wait: number;
  p99Wait: number;
}

/** Percentile au rang le plus proche sur un histogramme attente → nombre de requêtes (0 si vide). */
export function percentile(histogram: Map<number, number>, q: number): number {
  throw new Error('TODO: percentile');
}

/**
 * Déroule la simulation tick par tick.
 * - Jalon 1 : file FIFO bornée, service, rejets (les plus récentes d'abord), statistiques par tick.
 * - Jalon 2 : histogramme des attentes, p50/p99, coût.
 * - Jalon 3 : autoscaler (décision appliquée delayTicks plus tard, bornée par min et max).
 */
export function simulate(load: number[], cfg: SimConfig): SimResult {
  throw new Error('TODO: simulate');
}
