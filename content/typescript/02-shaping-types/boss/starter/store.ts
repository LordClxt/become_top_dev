export type Filter = 'all' | 'open' | 'done';

export interface Todo {
  readonly id: number;
  title: string;
  done: boolean;
}

export interface State {
  readonly todos: readonly Readonly<Todo>[];
  readonly filter: Filter;
  readonly nextId: number;
}

export interface AddAction { type: 'add'; title: string }
export interface ToggleAction { type: 'toggle'; id: number }
export interface RemoveAction { type: 'remove'; id: number }
export interface FilterAction { type: 'filter'; filter: Filter }
export interface ClearDoneAction { type: 'clear-done' }
export type Action = AddAction | ToggleAction | RemoveAction | FilterAction | ClearDoneAction;

export type ActionType = Action['type'];
/** L'action d'un type donné, extraite de l'union. */
export type ActionOf<T extends ActionType> = Extract<Action, { type: T }>;

// TODO 1 : Handlers est un type MAPPÉ sur ActionType : pour chaque type d'action T, une fonction
// (state: State, action: ActionOf<T>) => State. Si on ajoute une action, la table devient incomplète : erreur.
export type Handlers = never;

export const initialState: State = { todos: [], filter: 'all', nextId: 1 };

// TODO 2 : la table des handlers. Aucune mutation : chaque handler renvoie un NOUVEL état.
//  add : ignore un titre vide (après trim) ; id = nextId, puis nextId + 1 ; done = false.
//  toggle / remove : par id (un id inconnu ne change rien). filter : change le filtre.
//  clear-done : retire les tâches terminées.
export const handlers: Handlers = {} as Handlers;

// TODO 3 : reducer délègue au bon handler, avec un switch EXHAUSTIF sur action.type.
export function reducer(state: State, action: Action): State {
  throw new Error('TODO: reducer');
}

// TODO 4 : les tâches du filtre courant ('all' toutes, 'open' non terminées, 'done' terminées).
export function visibleTodos(state: State): readonly Readonly<Todo>[] {
  throw new Error('TODO: visibleTodos');
}
