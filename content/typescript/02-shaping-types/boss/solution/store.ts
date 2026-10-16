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
/** Une table EXHAUSTIVE : une fonction par type d'action, chacune recevant l'action précise. */
export type Handlers = { [T in ActionType]: (state: State, action: ActionOf<T>) => State };

export const initialState: State = { todos: [], filter: 'all', nextId: 1 };

export const handlers: Handlers = {
  add: (state, action) => {
    const title = action.title.trim();
    if (title === '') return state;
    return { ...state, todos: [...state.todos, { id: state.nextId, title, done: false }], nextId: state.nextId + 1 };
  },
  toggle: (state, action) => ({
    ...state,
    todos: state.todos.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo)),
  }),
  remove: (state, action) => ({ ...state, todos: state.todos.filter((todo) => todo.id !== action.id) }),
  filter: (state, action) => ({ ...state, filter: action.filter }),
  'clear-done': (state) => ({ ...state, todos: state.todos.filter((todo) => !todo.done) }),
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': return handlers.add(state, action);
    case 'toggle': return handlers.toggle(state, action);
    case 'remove': return handlers.remove(state, action);
    case 'filter': return handlers.filter(state, action);
    case 'clear-done': return handlers['clear-done'](state, action);
  }
}

export function visibleTodos(state: State): readonly Readonly<Todo>[] {
  switch (state.filter) {
    case 'all': return state.todos;
    case 'open': return state.todos.filter((todo) => !todo.done);
    case 'done': return state.todos.filter((todo) => todo.done);
  }
}
