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

// TODO : écris les trois fonctions. Aucun any, aucune assertion `as`.

/** Valide un événement venu du réseau (type inconnu, champ manquant ou invalide → TypeError). */
export function parseEvent(raw: unknown): AppEvent {
  throw new Error('TODO: valider raw à l’exécution');
}

/** Garde les événements valides et compte les rejetés. */
export function parseEvents(raws: readonly unknown[]): { events: AppEvent[]; rejected: number } {
  throw new Error('TODO: parseEvent sur chaque élément');
}

/** Utilisateurs actifs (créés et non supprimés) et chiffre d'affaires. */
export function summarize(events: readonly AppEvent[]): Summary {
  throw new Error('TODO: compter les utilisateurs actifs et le chiffre d’affaires');
}
