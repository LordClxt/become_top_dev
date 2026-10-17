export const EVENT_KINDS = ['page_view', 'click', 'purchase'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

interface Base { userId: string; at: number }
export interface PageView extends Base { kind: 'page_view'; path: string }
export interface Click extends Base { kind: 'click'; target: string }
export interface Purchase extends Base { kind: 'purchase'; amount: number; currency: 'EUR' | 'USD' }
export type AppEvent = PageView | Click | Purchase;

function isKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value);
}

const isNonEmpty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export function parseEvent(raw: unknown): AppEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  // Assertion justifiée : raw est un objet non null, on lit ses propriétés comme des inconnues.
  const r = raw as Record<string, unknown>;
  const { kind, userId, at } = r;
  if (!isKind(kind) || !isNonEmpty(userId) || typeof at !== 'number' || !Number.isFinite(at)) return null;
  switch (kind) {
    case 'page_view': {
      const { path } = r;
      return typeof path === 'string' && path.startsWith('/') ? { kind, userId, at, path } : null;
    }
    case 'click': {
      const { target } = r;
      return isNonEmpty(target) ? { kind, userId, at, target } : null;
    }
    case 'purchase': {
      const { amount, currency } = r;
      if (typeof amount !== 'number' || !(amount > 0)) return null;
      return currency === 'EUR' || currency === 'USD' ? { kind, userId, at, amount, currency } : null;
    }
  }
}

export function isPurchase(e: AppEvent): e is Purchase {
  return e.kind === 'purchase';
}

export interface Report {
  total: number;
  invalid: number;
  byKind: Record<EventKind, number>;
  users: number;
  revenue?: { EUR: number; USD: number };
  lastPath?: string;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function report(raws: readonly unknown[]): Report {
  const events = raws.map(parseEvent).filter((e): e is AppEvent => e !== null);
  const byKind: Record<EventKind, number> = { page_view: 0, click: 0, purchase: 0 };
  for (const e of events) byKind[e.kind]++;
  const purchases = events.filter(isPurchase);
  const sumOf = (currency: Purchase['currency']) =>
    cents(purchases.filter((p) => p.currency === currency).reduce((total, p) => total + p.amount, 0));
  const views = events.filter((e): e is PageView => e.kind === 'page_view');
  const last = views.reduce<PageView | undefined>((best, v) => (best === undefined || v.at > best.at ? v : best), undefined);
  return {
    total: raws.length,
    invalid: raws.length - events.length,
    byKind,
    users: new Set(events.map((e) => e.userId)).size,
    ...(purchases.length > 0 ? { revenue: { EUR: sumOf('EUR'), USD: sumOf('USD') } } : {}),
    ...(last ? { lastPath: last.path } : {}),
  };
}

export function describe(e: AppEvent): string {
  switch (e.kind) {
    case 'page_view': return `${e.userId} a vu ${e.path}`;
    case 'click': return `${e.userId} a cliqué sur ${e.target}`;
    case 'purchase': return `${e.userId} a payé ${e.amount.toFixed(2)} ${e.currency}`;
    default: {
      const never: never = e;
      throw new Error(`événement inconnu : ${JSON.stringify(never)}`);
    }
  }
}
