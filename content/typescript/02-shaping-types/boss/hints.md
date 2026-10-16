## Hint 1
Un type mappé sur une union de littéraux : `{ [T in ActionType]: (state: State, action: ActionOf<T>) => State }`. Chaque clé reçoit l'action précise correspondante.

## Hint 2
Chaque handler construit un nouvel objet avec `{ ...state, … }` et de nouveaux tableaux (`map`, `filter`, `[...state.todos, …]`). Rien n'est modifié en place.

## Hint 3
Dans `reducer`, un `case 'toggle': return handlers.toggle(state, action)` : dans chaque `case`, `action` est affinée à l'action précise, donc le handler est bien typé. Un `Handlers` incomplet est refusé par TypeScript.
