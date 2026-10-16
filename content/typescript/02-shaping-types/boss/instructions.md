## Contexte

Tu écris le cœur d'un petit « store » à la Redux pour une liste de tâches, avec tout ce que le chapitre t'a appris : des **actions** en union taguée (unions : seul `type` sait faire), des **états en lecture seule**, une **table de handlers exhaustive** dérivée de l'union (type mappé) et des types extraits (`Action['type']`, `Extract`).

Tu édites `store.ts`. Les tests passent des états **gelés en profondeur** : toute mutation échoue.

## À faire

1. `Handlers` : un type mappé sur `ActionType` — pour chaque `T`, `(state: State, action: ActionOf<T>) => State`.
2. `handlers` : `add` (titre nettoyé par `trim`, ignoré s'il est vide, id = `nextId`, puis `nextId + 1`), `toggle` et `remove` (par id ; un id inconnu ne change rien), `filter`, `clear-done`.
3. `reducer` : `switch` exhaustif sur `action.type`, qui délègue au bon handler.
4. `visibleTodos(state)` : les tâches du filtre courant.

## Contraintes

Pas de `any`, aucune mutation, aucune assertion `as` (le `{} as Handlers` du starter doit disparaître).
