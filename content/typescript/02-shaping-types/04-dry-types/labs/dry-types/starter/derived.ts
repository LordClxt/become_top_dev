export interface State {
  userId: string;
  pageTitle: string;
  recentFiles: string[];
  pageContents: string;
}

// TODO 1 : TopNavState = userId, pageTitle et recentFiles de State. Dérive-le de State (Pick), ne le recopie pas.
export type TopNavState = never;

export function topNav(state: State): TopNavState {
  throw new Error('TODO: topNav');
}

export const INIT_OPTIONS = { width: 640, height: 480, color: '#00FF00', label: 'VGA' };

// TODO 2 : Options est le type de INIT_OPTIONS ; OptionsUpdate rend toutes ses clés optionnelles
// (écris-le avec un type mappé [K in keyof Options]?: … et non avec Partial).
export type Options = never;
export type OptionsUpdate = never;

export function update(options: Options, patch: OptionsUpdate): Options {
  throw new Error('TODO: update');
}

export function getUserInfo(userId: string) {
  return { userId, name: 'Ada', age: 36 };
}
// TODO 3 : UserInfo est le type que renvoie getUserInfo.
export type UserInfo = never;

export interface SaveAction {
  type: 'save';
  payload: string;
}
export interface LoadAction {
  type: 'load';
  id: number;
}
export type Action = SaveAction | LoadAction;
// TODO 4 : ActionType = l'union des valeurs possibles de `type` ('save' | 'load'), sans la recopier.
export type ActionType = never;

// TODO 5 : Flip<T> inverse clés et valeurs d'un dictionnaire de chaînes (type mappé avec `as`),
// flip(record) fait la même chose à l'exécution.
export type Flip<T extends Record<string, string>> = never;

export function flip<T extends Record<string, string>>(record: T): Flip<T> {
  throw new Error('TODO: flip');
}
