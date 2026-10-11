## Contexte

Un annuaire de personnes (`nom`, `prénom`, `ville`). Tu construis l'index secondaire par ville, l'index concaténé `(nom, prénom)` de l'annuaire papier, et deux fonctions qui répondent à la question : « cet index sert-il cette requête ? »

## À implémenter dans `indexes.go`

### `Secondary`
Clés **non uniques** : chaque valeur renvoie la **liste triée** des identifiants de lignes. `Add` (sans doublon), `Remove` (sans effet si absent ; une valeur sans ligne disparaît), `Lookup` (renvoie une copie).

### `Concat`
Index trié par la **concaténation** des colonnes dans l'ordre déclaré, puis par identifiant. `Lookup(prefix...)` renvoie les identifiants des lignes dont les premières colonnes valent `prefix`, dans l'ordre de l'index. Préfixe vide : tout ; préfixe plus long que le nombre de colonnes : `nil`.

Piège : « Du » ne doit pas être un préfixe de « Dupont » au sens des colonnes : termine chaque valeur par un séparateur (`"\x00"`).

### `UsablePrefix(index, constrained)`
Le nombre de colonnes de tête de l'index contraintes par égalité (arrêt à la première colonne non contrainte). Pour `(last, first)` : `last` → 1, `first` seul → 0.

### `Covers(indexCols, included, selected, filtered)`
Vrai si **toutes** les colonnes sélectionnées et filtrées se trouvent dans l'index (clé ou colonnes incluses).
