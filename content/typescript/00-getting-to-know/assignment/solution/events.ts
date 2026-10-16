export interface UserCreated {
  type: 'user-created';
  id: string;
  email: string;
}
export interface UserDeleted {
  type: 'user-deleted';
  id: string;
}
export interface Purchase {
  type: 'purchase';
  id: string;
  amountCents: number;
}
export type AppEvent = UserCreated | UserDeleted | Purchase;

export interface Summary {
  users: number;
  revenueCents: number;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function text(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value === '') throw new TypeError(`« ${key} » doit être une chaîne non vide`);
  return value;
}

/** Valide un événement venu du réseau : le type annoncé n'est qu'une promesse, on le vérifie. */
export function parseEvent(raw: unknown): AppEvent {
  if (!isRecord(raw)) throw new TypeError('un événement est un objet');
  switch (raw.type) {
    case 'user-created': {
      const email = text(raw, 'email');
      if (!email.includes('@')) throw new TypeError('« email » invalide');
      return { type: 'user-created', id: text(raw, 'id'), email };
    }
    case 'user-deleted':
      return { type: 'user-deleted', id: text(raw, 'id') };
    case 'purchase': {
      const amount = raw.amountCents;
      if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
        throw new TypeError('« amountCents » doit être un entier strictement positif');
      }
      return { type: 'purchase', id: text(raw, 'id'), amountCents: amount };
    }
    default:
      throw new TypeError(`type d'événement inconnu : ${String(raw.type)}`);
  }
}

/** Garde les événements valides et compte les rejetés. */
export function parseEvents(raws: readonly unknown[]): { events: AppEvent[]; rejected: number } {
  const events: AppEvent[] = [];
  let rejected = 0;
  for (const raw of raws) {
    try {
      events.push(parseEvent(raw));
    } catch {
      rejected++;
    }
  }
  return { events, rejected };
}

/** Utilisateurs actifs (créés et non supprimés) et chiffre d'affaires. */
export function summarize(events: readonly AppEvent[]): Summary {
  const active = new Set<string>();
  let revenueCents = 0;
  for (const event of events) {
    switch (event.type) {
      case 'user-created':
        active.add(event.id);
        break;
      case 'user-deleted':
        active.delete(event.id);
        break;
      case 'purchase':
        revenueCents += event.amountCents;
        break;
    }
  }
  return { users: active.size, revenueCents };
}
