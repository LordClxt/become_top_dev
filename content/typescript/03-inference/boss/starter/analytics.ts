// TODO 1 : un tuple de littéraux, EventKind dérivé.
export const EVENT_KINDS = ['page_view', 'click', 'purchase'];
export type EventKind = string;

interface Base { userId: string; at: number }
export interface PageView extends Base { kind: 'page_view'; path: string }
export interface Click extends Base { kind: 'click'; target: string }
export interface Purchase extends Base { kind: 'purchase'; amount: number; currency: 'EUR' | 'USD' }
export type AppEvent = PageView | Click | Purchase;

// TODO 2 : rétrécis raw jusqu'à un AppEvent (ne garde que les champs du type), ou null.
export function parseEvent(raw: unknown): AppEvent | null {
  throw new Error('TODO: parseEvent');
}

// TODO 3 : un type guard.
export function isPurchase(e: AppEvent): boolean {
  throw new Error('TODO: isPurchase');
}

export interface Report {
  total: number;
  invalid: number;
  byKind: Record<EventKind, number>;
  users: number;
  revenue?: { EUR: number; USD: number };
  lastPath?: string;
}

// TODO 4 : le rapport, construit d'un coup (revenue et lastPath seulement s'ils ont un sens).
export function report(raws: readonly unknown[]): Report {
  throw new Error('TODO: report');
}

// TODO 5 : switch exhaustif.
export function describe(e: AppEvent): string {
  throw new Error('TODO: describe');
}
