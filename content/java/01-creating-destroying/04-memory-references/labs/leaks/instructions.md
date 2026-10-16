## Contexte

Un service tient des heures, puis ralentit, puis meurt en `OutOfMemoryError`. Le ramasse-miettes n'y est pour rien : il ne libère que ce qui n'est **plus référencé**. Trois classes de ce service ont un défaut de mémoire. Aucun test fonctionnel classique ne le voit.

Tu édites `ArrayStack.java`, `LruCache.java` et `RomanNumerals.java`.

## 1. `ArrayStack` : les références obsolètes

La pile gère **sa propre mémoire** : les cases d'indice `≥ size` sont « libres » pour elle, mais le GC ne le sait pas.

- Après un `pop`, la case libérée ne doit plus référencer l'élément.
- `clear()` ne doit rien retenir non plus.
- `pop()` sur une pile vide lève `java.util.EmptyStackException` **sans** corrompre la taille.

## 2. `LruCache` : un cache qui oublie

Le cache grossit sans fin. Borne-le à `maxEntries` : quand on dépasse, on évince l'entrée **la moins récemment utilisée** (lire une clé la rend récente). `maxEntries <= 0` : `IllegalArgumentException`.

## 3. `RomanNumerals` : un objet coûteux recréé à chaque appel

`isRomanNumeral` est appelée des millions de fois. `String.matches` recompile la regex à **chaque** appel. Compile-la une seule fois.

## Contraintes

Pas de bibliothèque externe. Les tests inspectent le tableau interne de la pile et les champs de `RomanNumerals` par réflexion.
