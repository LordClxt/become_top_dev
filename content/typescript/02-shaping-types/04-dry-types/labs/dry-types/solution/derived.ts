export interface State {
  userId: string;
  pageTitle: string;
  recentFiles: string[];
  pageContents: string;
}

/** Sous-ensemble de State : dérivé, jamais recopié. */
export type TopNavState = Pick<State, 'userId' | 'pageTitle' | 'recentFiles'>;

export function topNav(state: State): TopNavState {
  const { userId, pageTitle, recentFiles } = state;
  return { userId, pageTitle, recentFiles };
}

export const INIT_OPTIONS = { width: 640, height: 480, color: '#00FF00', label: 'VGA' };
export type Options = typeof INIT_OPTIONS;
/** Toutes les clés optionnelles, par un type mappé (équivalent de Partial<Options>). */
export type OptionsUpdate = { [K in keyof Options]?: Options[K] };

export function update(options: Options, patch: OptionsUpdate): Options {
  return { ...options, ...patch };
}

export function getUserInfo(userId: string) {
  return { userId, name: 'Ada', age: 36 };
}
export type UserInfo = ReturnType<typeof getUserInfo>;

export interface SaveAction {
  type: 'save';
  payload: string;
}
export interface LoadAction {
  type: 'load';
  id: number;
}
export type Action = SaveAction | LoadAction;
export type ActionType = Action['type'];

/** Inverse clés et valeurs : { a: 'x' } devient { x: 'a' }. */
export type Flip<T extends Record<string, string>> = { [K in keyof T as T[K]]: K };

export function flip<T extends Record<string, string>>(record: T): Flip<T> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) result[value] = key;
  // Assertion justifiée : on vient de construire exactement l'inverse de `record`.
  return result as Flip<T>;
}
