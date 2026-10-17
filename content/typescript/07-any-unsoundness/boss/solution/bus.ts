export type Validators<Events> = { [K in keyof Events]: (payload: unknown) => payload is Events[K] };

export type Received<Events> =
  | { ok: true; event: keyof Events & string; delivered: number }
  | { ok: false; reason: string };

/** Syntaxe propriété : les paramètres sont vérifiés strictement. */
type Handler<T> = (payload: T) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class EventBus<Events extends object> {
  private readonly validators: Validators<Events>;
  /** Handler<T> est assignable à Handler<never> : un seul type de stockage pour tous les événements. */
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>();
  private readonly failures: string[] = [];

  constructor(validators: Validators<Events>) {
    this.validators = validators;
  }

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): number {
    const set = this.handlers.get(event);
    if (!set) return 0;
    let delivered = 0;
    for (const handler of set) {
      // Assertion justifiée : on() ne range sous la clé K que des handlers de Events[K].
      const typed = handler as Handler<Events[K]>;
      delivered++;
      try {
        typed(payload);
      } catch (e) {
        this.failures.push(`${String(event)}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return delivered;
  }

  receive(raw: unknown): Received<Events> {
    if (!isRecord(raw) || typeof raw.event !== 'string' || !('payload' in raw)) {
      return { ok: false, reason: 'message mal formé' };
    }
    const { event, payload } = raw;
    if (!this.isEvent(event)) return { ok: false, reason: `événement inconnu : ${event}` };
    const validate = this.validators[event];
    if (!validate(payload)) return { ok: false, reason: `charge invalide pour ${event}` };
    return { ok: true, event, delivered: this.emit(event, payload) };
  }

  errors(): readonly string[] {
    return [...this.failures];
  }

  private isEvent(name: string): name is keyof Events & string {
    return Object.hasOwn(this.validators, name);
  }
}
