## Contexte

Cinq types de ce fichier doivent être **dérivés** de ce qui existe déjà : un sous-ensemble de `State`, la forme d'une constante, les clés optionnelles, le retour d'une fonction, l'union de valeurs d'une propriété. Si l'on ajoute un champ à `State`, les autres types doivent suivre sans que tu y touches.

Tu édites `derived.ts`.

## À faire

1. `TopNavState` : `userId`, `pageTitle`, `recentFiles` de `State`, avec `Pick`. `topNav(state)` renvoie ces trois champs.
2. `Options` : le type de `INIT_OPTIONS`. `OptionsUpdate` : toutes ses clés optionnelles, écrit avec un **type mappé** (pas `Partial`). `update(options, patch)` renvoie un nouvel objet fusionné.
3. `UserInfo` : le type renvoyé par `getUserInfo`.
4. `ActionType` : l'union des valeurs de `type` de `Action` (`'save' | 'load'`).
5. `Flip<T>` inverse clés et valeurs d'un dictionnaire de chaînes (type mappé avec `as`), et `flip(record)` le fait à l'exécution.

## Contraintes

Aucun type n'est recopié à la main. Une seule assertion `as` est justifiée, dans `flip` (commente-la).
