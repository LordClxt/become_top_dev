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

/** Percentile au rang le plus proche sur un histogramme attente → nombre de requêtes. */
export function percentile(histogram: Map<number, number>, q: number): number {
  const total = [...histogram.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const rank = Math.max(1, Math.ceil(q * total));
  let seen = 0;
  for (const wait of [...histogram.keys()].sort((a, b) => a - b)) {
    seen += histogram.get(wait)!;
    if (seen >= rank) return wait;
  }
  return 0;
}

export function simulate(load: number[], cfg: SimConfig): SimResult {
  const queue: { at: number; n: number }[] = [];
  const waits = new Map<number, number>();
  const decisions = new Map<number, number>();
  const ticks: TickStat[] = [];
  let instances = cfg.instances;
  let served = 0, rejected = 0, cost = 0, queued = 0;

  load.forEach((arrivals, tick) => {
    const decided = decisions.get(tick);
    if (decided !== undefined) instances = decided;

    queue.push({ at: tick, n: arrivals });
    queued += arrivals;

    let capacity = instances * cfg.capacityPerInstance;
    let servedNow = 0;
    while (capacity > 0 && queue.length > 0) {
      const head = queue[0]!;
      const take = Math.min(head.n, capacity);
      head.n -= take;
      capacity -= take;
      servedNow += take;
      waits.set(tick - head.at, (waits.get(tick - head.at) ?? 0) + take);
      if (head.n === 0) queue.shift();
    }
    queued -= servedNow;

    let rejectedNow = 0;
    while (queued > cfg.maxQueue) {
      const tail = queue[queue.length - 1]!;
      const drop = Math.min(tail.n, queued - cfg.maxQueue);
      tail.n -= drop;
      queued -= drop;
      rejectedNow += drop;
      if (tail.n === 0) queue.pop();
    }

    served += servedNow;
    rejected += rejectedNow;
    cost += instances * cfg.costPerInstanceTick;
    ticks.push({ tick, arrivals, served: servedNow, queued, rejected: rejectedNow, instances });

    const as = cfg.autoscale;
    if (as) {
      const wanted = Math.ceil((arrivals + queued) / (cfg.capacityPerInstance * as.targetUtilization));
      decisions.set(tick + as.delayTicks, Math.min(as.max, Math.max(as.min, wanted)));
    }
  });

  return { ticks, served, rejected, cost, p50Wait: percentile(waits, 0.5), p99Wait: percentile(waits, 0.99) };
}
