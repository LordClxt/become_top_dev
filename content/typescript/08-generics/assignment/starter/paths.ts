// TODO 1 et 2
export type Paths<T> = string;
export type PathValue<T, P extends string> = unknown;

// TODO 3
export function getPath<T, P extends Paths<T>>(obj: T, path: P): PathValue<T, P> {
  throw new Error('TODO: getPath');
}

// TODO 4
export type Handlers<E> = Record<string, (payload: unknown) => void>;

// TODO 5
export function dispatch<E, K extends keyof E & string>(handlers: Handlers<E>, event: K, payload: E[K]): boolean {
  throw new Error('TODO: dispatch');
}
