## Contexte

Le service de dédoublonnage d'Ordo garde un `Set<SymbolKey>` des titres déjà traités, et une table de volumes indexée par `SymbolKey`. Les titres sont traités plusieurs fois, la table ne retrouve jamais rien, et les journaux affichent `SymbolKey@1b6d3586` au lieu de `XPAR:ACME`. Pourtant, `SymbolKey` a bien `equals`, `hashcode` et `tostring`.

## Ta mission

1. Deux clés de même place et même symbole sont égales pour les collections : un ensemble n'en garde qu'une, une table les retrouve.
2. `equals` respecte le contrat (symétrique, faux pour un autre type ou `null`).
3. `toString` renvoie `place:symbole`.
4. Chaque méthode qui redéfinit une méthode d'`Object` porte `@Override`, pour que le compilateur attrape la prochaine erreur de ce genre.

Ne modifie que `SymbolKey.java`.
