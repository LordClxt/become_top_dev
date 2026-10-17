## Contexte

Un module hérité, rempli de `any`. Le comportement est correct, mais les types fuient : les tests de types montrent que plusieurs fonctions renvoient `any`. Tu **resserres** les types sans changer le comportement.

Tu édites `legacy.ts`. Tu ne peux pas modifier `oldLibrary` (il simule une bibliothèque externe mal typée).

## À faire

1. `countItems(list)` : le paramètre devient `readonly unknown[]` ; le retour `number`.
2. `pickKeys(record, keys)` : `record` est un `Record<string, unknown>`, le retour aussi.
3. `callTwice(fn)` : `fn` est une fonction sans argument (`() => unknown`), le retour un tuple `[unknown, unknown]`.
4. `loadUser(id)` appelle `oldLibrary.fetch(id)` (qui renvoie `any`) : renvoie un `User` (annote le retour pour que l'`any` ne fuie pas).
5. `userLabel(id)` : `"Ada (36 ans)"`, à partir de `loadUser`.

## Contraintes

Aucun `any` dans tes signatures ; plus aucune fonction exportée ne renvoie `any`.
