export type Validators<Events> = { [K in keyof Events]: (payload: unknown) => payload is Events[K] };

export type Received<Events> =
  | { ok: true; event: keyof Events & string; delivered: number }
  | { ok: false; reason: string };

// TODO : le bus complet (voir l'énoncé).
export class EventBus<Events extends object> {
  constructor(validators: Validators<Events>) {
    throw new Error('TODO: EventBus');
  }

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void {
    throw new Error('TODO: on');
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): number {
    throw new Error('TODO: emit');
  }

  receive(raw: unknown): Received<Events> {
    throw new Error('TODO: receive');
  }

  errors(): readonly string[] {
    throw new Error('TODO: errors');
  }
}
