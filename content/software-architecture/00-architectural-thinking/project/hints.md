## Hint 1
Travaille avec les **indices** des couches dans `rules.layers` : `i` pour la source, `j` pour la cible. Tout se décide en comparant `i` et `j`.

## Hint 2
`j < i` : vers le haut. `j === i` ou `j === i + 1` : permis. Sinon, regarde les couches `layers.slice(i + 1, j)` : si l'une est fermée, c'est un saut interdit.

## Hint 3
Calcule d'abord toutes les violations (sources triées, cibles dédoublonnées et triées), puis répartis-les entre `violations` et `waived` en cherchant une variance au même `from`/`to`. Garde un `Set` des variances utilisées pour trouver les périmées. Valide les variances avant tout.
