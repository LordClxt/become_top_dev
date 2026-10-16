## Contexte

Tinybase répond bien aux requêtes par clé. Mais l'équipe de produit veut maintenant des **questions d'analyse** : « combien de pièces du produit A vendues le jour 1 ? ». Tu construis le cœur d'un **magasin en colonnes** : un tableau de valeurs par colonne, des bitmaps qui se combinent, une compression par séquences et un tri qui rend les colonnes compressibles.

La classe `Table`, son constructeur et `length` sont fournis. Toutes les valeurs sont des chaînes ; la mesure additionnée par `sumWhere` doit être un entier écrit en chaîne.

## Jalon 1 — Ranger par colonne
`append(...row)` ajoute **une valeur à chaque colonne**, dans l'ordre du constructeur. Un nombre de valeurs différent lève une `RangeError` et n'ajoute **rien**. `column(name)` renvoie une **copie** (`undefined` si inconnue). `row(i)` reconstitue la ligne en prenant la i-ième valeur de chaque colonne (`undefined` si hors limites).

## Jalon 2 — Bitmaps et compression
- `bitmap(col, value)` : un booléen par ligne.
- `and`, `or` : bit à bit, `undefined` si les longueurs diffèrent.
- `encode(bits)` : longueurs de séquences **alternées en commençant par les zéros** (la première peut valoir 0). `110000100` → `[0, 2, 4, 1, 2]`. Un bitmap vide donne `[]`.
- `decode(runs)` : l'inverse.

## Jalon 3 — Trier et interroger
- `sortBy(...names)` : tri **stable** de lignes **entières**, par comparaison de chaînes, selon ces colonnes dans l'ordre. Colonne inconnue : erreur et table intacte.
- `runs(col)` : nombre de séquences de valeurs identiques consécutives.
- `sumWhere(measure, filters)` : somme de la mesure sur les lignes qui vérifient tous les filtres `colonne = valeur`, calculée avec des bitmaps et un ET. Sans filtre, toutes les lignes.

## Exemple
Pour les ventes `(day, product, store, qty)`, `sumWhere('qty', { product: 'A', day: '1' })` additionne la quantité des lignes où le produit vaut A **et** le jour vaut 1.
