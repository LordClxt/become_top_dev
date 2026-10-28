/**
 * archkit — un broker en mémoire et un médiateur d'événements.
 *
 * Canaux : une file (`orders`) ou un abonnement durable à un topic (`order-created/payment`).
 * Les messages sont lus en acquittement client : un message lu reste réservé au consommateur jusqu'à son ack,
 * et revient en tête de son canal si le consommateur plante.
 */

export interface Message<T = unknown> {
  id: string;
  body: T;
  correlationId?: string;
  redelivered: boolean;
}

export class UnknownChannelError extends Error { constructor(c: string) { super(`canal inconnu : ${c}`); this.name = 'UnknownChannelError'; } }
export class NotInFlightError extends Error { constructor(id: string) { super(`message ${id} non réservé par ce consommateur`); this.name = 'NotInFlightError'; } }

export class Broker {
  // TODO : l'état dont tu as besoin (canaux, abonnements, messages réservés par consommateur…)

  /** Jalon 1. Déclare une file (sans effet si elle existe). */
  declareQueue(name: string): void {
    throw new Error('TODO: declareQueue');
  }

  /** Jalon 1. Abonnement durable : le canal `${topic}/${subscriber}` reçoit une copie de chaque publication. */
  subscribe(topic: string, subscriber: string): string {
    throw new Error('TODO: subscribe');
  }

  /** Jalon 1. Publie sur un topic : une copie (même id) par abonné ; personne n'écoute = le message disparaît. */
  publish<T>(topic: string, body: T): string {
    throw new Error('TODO: publish');
  }

  /** Jalon 1. Envoie dans une file (point à point). */
  send<T>(queue: string, body: T, correlationId?: string): string {
    throw new Error('TODO: send');
  }

  /** Jalon 1. Lit le prochain message prêt et le réserve pour ce consommateur (acquittement client). */
  receive<T = unknown>(channel: string, consumer: string): Message<T> | undefined {
    throw new Error('TODO: receive');
  }

  /** Jalon 1. Acquitte : le message quitte définitivement le canal. */
  ack(consumer: string, channel: string, messageId: string): void {
    throw new Error('TODO: ack');
  }

  /** Jalon 1. Le consommateur plante : ses messages non acquittés reviennent en tête de leur canal, dans leur ordre de lecture. */
  crash(consumer: string): number {
    throw new Error('TODO: crash');
  }

  /** Jalon 1. Messages prêts (non réservés) dans un canal. */
  depth(channel: string): number {
    throw new Error('TODO: depth');
  }

  // ---------- Jalon 2 : request-reply ----------

  /** Envoie une requête ; renvoie son id, qui servira de corrélation. */
  request<T>(queue: string, body: T): string {
    throw new Error('TODO: request');
  }

  /** Répond à une requête : la réponse porte l'id de la requête comme identifiant de corrélation. */
  reply<T>(replyQueue: string, to: Message, body: T): string {
    throw new Error('TODO: reply');
  }

  /** Sélecteur : retire et renvoie la réponse dont la corrélation vaut `correlationId` ; les autres restent. */
  takeReply<T = unknown>(replyQueue: string, correlationId: string): Message<T> | undefined {
    throw new Error('TODO: takeReply');
  }
}

/** Jalon 2. Consommateur idempotent : un message déjà traité (même id) n'est pas retraité. */
export function idempotent<T>(handler: (msg: Message<T>) => void): { handle: (msg: Message<T>) => boolean; processed: () => number } {
  throw new Error('TODO: idempotent');
}

// ---------- Jalon 3 : le médiateur ----------

export type Task = (orderId: string) => Promise<void>;

export interface MediatorState {
  step: number;
  done: string[];
  status: 'running' | 'stopped' | 'completed';
  error?: string;
}

export interface StateStore {
  get(orderId: string): MediatorState | undefined;
  put(orderId: string, state: MediatorState): void;
  delete(orderId: string): void;
}

export class AlreadyStartedError extends Error { constructor(id: string) { super(`workflow déjà démarré pour ${id}`); this.name = 'AlreadyStartedError'; } }
export class NotStoppedError extends Error { constructor(id: string) { super(`aucun workflow arrêté pour ${id}`); this.name = 'NotStoppedError'; } }

export class Mediator {
  private readonly steps: string[][];
  private readonly tasks: Record<string, Task>;
  private readonly store: StateStore;

  constructor(steps: string[][], tasks: Record<string, Task>, store: StateStore) {
    this.steps = steps;
    this.tasks = tasks;
    this.store = store;
  }

  /** Démarre le workflow d'une commande. */
  async start(orderId: string): Promise<MediatorState> {
    throw new Error('TODO: start');
  }

  /** Reprend un workflow arrêté, à l'étape en échec, sans refaire les tâches déjà acquittées. */
  async resume(orderId: string): Promise<MediatorState> {
    throw new Error('TODO: resume');
  }
}
