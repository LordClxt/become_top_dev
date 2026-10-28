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

interface InFlight { channel: string; msg: Message; position: number }

export class Broker {
  private seq = 0;
  private readonly channels = new Map<string, Message[]>();
  private readonly subscriptions = new Map<string, string[]>();
  private readonly inFlight = new Map<string, Map<string, InFlight>>();
  private readonly order = new Map<string, number>();

  private nextId(): string { return `m${++this.seq}`; }

  private channel(name: string): Message[] {
    const c = this.channels.get(name);
    if (!c) throw new UnknownChannelError(name);
    return c;
  }

  /** Jalon 1. Déclare une file (sans effet si elle existe). */
  declareQueue(name: string): void {
    if (!this.channels.has(name)) this.channels.set(name, []);
  }

  /** Jalon 1. Abonnement durable : le canal `${topic}/${subscriber}` reçoit une copie de chaque publication. */
  subscribe(topic: string, subscriber: string): string {
    const name = `${topic}/${subscriber}`;
    this.declareQueue(name);
    const subs = this.subscriptions.get(topic) ?? [];
    if (!subs.includes(name)) this.subscriptions.set(topic, [...subs, name]);
    return name;
  }

  /** Jalon 1. Publie sur un topic : une copie (même id) par abonné ; personne n'écoute = le message disparaît. */
  publish<T>(topic: string, body: T): string {
    const id = this.nextId();
    for (const name of this.subscriptions.get(topic) ?? []) {
      this.channel(name).push({ id, body: structuredClone(body), redelivered: false });
    }
    return id;
  }

  /** Jalon 1. Envoie dans une file (point à point). */
  send<T>(queue: string, body: T, correlationId?: string): string {
    const id = this.nextId();
    const msg: Message<T> = { id, body: structuredClone(body), redelivered: false };
    if (correlationId !== undefined) msg.correlationId = correlationId;
    this.channel(queue).push(msg);
    return id;
  }

  /** Jalon 1. Lit le prochain message prêt et le réserve pour ce consommateur (acquittement client). */
  receive<T = unknown>(channel: string, consumer: string): Message<T> | undefined {
    const c = this.channel(channel);
    const msg = c.shift();
    if (!msg) return undefined;
    const pos = (this.order.get(channel) ?? 0) + 1;
    this.order.set(channel, pos);
    let mine = this.inFlight.get(consumer);
    if (!mine) { mine = new Map(); this.inFlight.set(consumer, mine); }
    mine.set(`${channel}#${msg.id}`, { channel, msg, position: pos });
    return structuredClone(msg) as Message<T>;
  }

  /** Jalon 1. Acquitte : le message quitte définitivement le canal. */
  ack(consumer: string, channel: string, messageId: string): void {
    const mine = this.inFlight.get(consumer);
    if (!mine?.delete(`${channel}#${messageId}`)) throw new NotInFlightError(messageId);
  }

  /** Jalon 1. Le consommateur plante : ses messages non acquittés reviennent en tête de leur canal, dans leur ordre de lecture. */
  crash(consumer: string): number {
    const mine = this.inFlight.get(consumer);
    if (!mine) return 0;
    const back = [...mine.values()].sort((a, b) => b.position - a.position);
    for (const f of back) this.channel(f.channel).unshift({ ...f.msg, redelivered: true });
    this.inFlight.delete(consumer);
    return back.length;
  }

  /** Jalon 1. Messages prêts (non réservés) dans un canal. */
  depth(channel: string): number {
    return this.channel(channel).length;
  }

  // ---------- Jalon 2 : request-reply ----------

  /** Envoie une requête ; renvoie son id, qui servira de corrélation. */
  request<T>(queue: string, body: T): string {
    return this.send(queue, body);
  }

  /** Répond à une requête : la réponse porte l'id de la requête comme identifiant de corrélation. */
  reply<T>(replyQueue: string, to: Message, body: T): string {
    return this.send(replyQueue, body, to.id);
  }

  /** Sélecteur : retire et renvoie la réponse dont la corrélation vaut `correlationId` ; les autres restent. */
  takeReply<T = unknown>(replyQueue: string, correlationId: string): Message<T> | undefined {
    const c = this.channel(replyQueue);
    const i = c.findIndex((m) => m.correlationId === correlationId);
    return i < 0 ? undefined : (c.splice(i, 1)[0] as Message<T>);
  }
}

/** Jalon 2. Consommateur idempotent : un message déjà traité (même id) n'est pas retraité. */
export function idempotent<T>(handler: (msg: Message<T>) => void): { handle: (msg: Message<T>) => boolean; processed: () => number } {
  const seen = new Set<string>();
  return {
    handle: (msg) => {
      if (seen.has(msg.id)) return false;
      handler(msg);
      seen.add(msg.id);
      return true;
    },
    processed: () => seen.size,
  };
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
    if (this.store.get(orderId)) throw new AlreadyStartedError(orderId);
    const state: MediatorState = { step: 0, done: [], status: 'running' };
    this.store.put(orderId, state);
    return this.run(orderId, state);
  }

  /** Reprend un workflow arrêté, à l'étape en échec, sans refaire les tâches déjà acquittées. */
  async resume(orderId: string): Promise<MediatorState> {
    const state = this.store.get(orderId);
    if (!state || state.status !== 'stopped') throw new NotStoppedError(orderId);
    const running: MediatorState = { step: state.step, done: [...state.done], status: 'running' };
    this.store.put(orderId, running);
    return this.run(orderId, running);
  }

  private async run(orderId: string, state: MediatorState): Promise<MediatorState> {
    while (state.step < this.steps.length) {
      const todo = this.steps[state.step]!.filter((t) => !state.done.includes(`${state.step}:${t}`));
      const results = await Promise.allSettled(todo.map((t) => this.tasks[t]!(orderId)));
      const failures: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') state.done.push(`${state.step}:${todo[i]}`);
        else failures.push(`${todo[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
      });
      if (failures.length > 0) {
        const stopped: MediatorState = { step: state.step, done: [...state.done], status: 'stopped', error: failures.join('; ') };
        this.store.put(orderId, stopped);
        return stopped;
      }
      state.step++;
      this.store.put(orderId, { step: state.step, done: [...state.done], status: 'running' });
    }
    this.store.delete(orderId);
    return { step: state.step, done: [...state.done], status: 'completed' };
  }
}
