## Hint 1
Le builder du starter est construit sur `Bits` : chaque `flip` crée un nouveau `Bits`, donc une copie. Donne au builder son propre `long[]`, qu'il modifie en place.

## Hint 2
`flipAll` : copie une fois avec `Words.copy(words)`, applique tous les `^=` sur la copie, puis enveloppe-la dans un nouveau `Bits` avec un constructeur privé qui **ne recopie pas** (le tableau vient de toi, personne d'autre ne l'a).

## Hint 3
`build()` doit copier : `return new Bits(Words.copy(words), size);`. Sinon le `Bits` renvoyé partage le tableau du builder, et le prochain `flip` sur le builder le modifie. `toBuilder()` : une copie pour le builder, une pour `build()`.
