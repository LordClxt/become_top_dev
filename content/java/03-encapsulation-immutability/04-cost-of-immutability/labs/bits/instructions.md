## Contexte

Le service d'autorisations représente les droits d'un utilisateur par un `Bits` immuable de plusieurs milliers de bits, partagé entre threads. Il marche, mais le profilage montre que les mises à jour en masse (une migration qui change 5 000 droits) allouent des centaines de mégaoctets : chaque changement d'un bit recopie tout le tableau.

Toutes les copies de tableau passent par `Words.copy`, qui les compte (classe fournie, ne la modifie pas, et n'utilise pas d'autre moyen de copier).

## Ta mission

Garde `Bits` immuable et thread-safe, mais fais en sorte que :

- `flip(i)` reste une opération qui renvoie un nouveau `Bits` et fait **exactement une** copie ;
- `flipAll(int... indexes)` soit une **primitive** : une seule copie, quel que soit le nombre d'indices ;
- `Bits.Builder` soit un vrai **compagnon mutable** : `new Bits.Builder(size)` ne copie rien, `flip` et `set` travaillent en place (aucune copie), et `build()` fait **au plus une** copie ;
- `bits.toBuilder()` puis `build()` fasse au plus deux copies au total ;
- un `Bits` déjà construit ne change **jamais**, même si on continue à utiliser le builder qui l'a produit.

Un indice hors de `[0, size)` lève `IndexOutOfBoundsException`, partout.
