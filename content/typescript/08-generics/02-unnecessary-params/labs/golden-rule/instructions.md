## Contexte

Six fonctions aux signatures surchargées de génériques. Les tests de types comparent chaque signature à la version attendue : tu dois **retirer** les paramètres de type inutiles et **garder** les utiles.

Tu édites `signatures.ts`. Le comportement ne change pas.

## À faire

1. `third(a, b, c)` : ne garder que le paramètre de type de `c`.
2. `parseJSON(text)` : renvoie `unknown`, sans paramètre de type.
3. `printProperty(obj, key)` : un seul paramètre de type (`key: keyof T`) ; renvoie la chaîne affichée.
4. `getProperty(obj, key)` : garde ses deux paramètres (le retour est `T[K]`).
5. `getLength(x)` : aucun paramètre de type (`ArrayLike<unknown>`).
6. `join(els)` : remplace la classe générique `Joiner` par une fonction non générique.

## Contraintes

Signatures exactes demandées par les tests de types ; pas de `any`.
