## Hint 1
`type Handler<T> = (payload: T) => void;` et un stockage `Map<keyof Events, Set<Handler<never>>>` : un `Handler<T>` est assignable à `Handler<never>` (contravariance).

## Hint 2
Pour rappeler un handler, il faut repasser de `Handler<never>` à `Handler<Events[K]>` : c'est l'assertion justifiée (on ne range sous la clé `K` que des handlers de `K`).

## Hint 3
`receive` : `isRecord(raw) && typeof raw.event === 'string' && 'payload' in raw`, puis `Object.hasOwn(this.validators, name)`. Pour obtenir une clé typée sans assertion, écris un type guard `isEvent(name: string): name is keyof Events & string`.
