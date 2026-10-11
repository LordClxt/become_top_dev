## Contexte

Tu construis le cœur d'un B-tree : insertion, recherche, intervalle, et surtout **l'éclatement d'une page pleine** qui garde l'arbre équilibré. Les pages sont des structures en mémoire (le « disque » viendra dans le boss).

## Modèle

Un **B+tree** : les clés et valeurs sont dans les **feuilles** ; les pages internes ne contiennent que des clés-frontières. Une page contient au plus `maxKeys` clés ; `New` impose un minimum de 3. Une page interne avec `n` clés a `n+1` enfants. Dans une page interne, l'enfant `i` couvre les clés `k` telles que `keys[i-1] <= k < keys[i]` : **une clé égale à une frontière va à droite**.

## À implémenter dans `btree.go`

- **`Get`** : descends de la racine à une feuille.
- **`Put`** : ajoute ou remplace. Si une feuille compte plus de `maxKeys` clés, elle **éclate** en deux moitiés ; la plus petite clé de la moitié droite monte dans le parent comme frontière. Si une page interne déborde, elle éclate aussi (la clé du milieu monte, elle n'est pas copiée). Si la **racine** éclate, crée une nouvelle racine : l'arbre gagne un niveau. Remplacer une valeur ne change ni `Len`, ni `Splits`.
- **`Range(lo, hi)`** : clés dans `[lo, hi)`, triées ; `hi == ""` = sans borne haute.
- **`Len`, `Height`** (1 pour une feuille unique), **`Splits`** (nombre d'éclatements, la racine comprise).

## Ce que tu constates

Avec 20 000 clés et 100 clés par page, la hauteur ne dépasse pas 3 : c'est la profondeur en O(log n) de la leçon.
