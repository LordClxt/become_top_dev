## Contexte

Le tableau de bord de ton service affiche « p95 = 505 ms » : c'est la moyenne des p95 de deux serveurs. Personne n'a jamais vu 505 ms. Tu construis les trois briques qui permettent de mesurer honnêtement : un calcul exact de percentile, la probabilité d'amplification de queue, et un histogramme **fusionnable**.

## Ta mission

Dans `percentiles.go` :

### `Percentile(samples, p)`
Méthode du **rang le plus proche** : trie une **copie**, prends l'élément de rang `ceil(p/100 × n)` (rang 1 = plus petit, borné entre 1 et n). Sans échantillon : 0. La slice de l'appelant ne doit pas être modifiée.

### `TailProbability(p, n)`
Probabilité qu'au moins un de `n` appels indépendants soit lent si chacun l'est avec la probabilité `p` : `1 − (1 − p)ⁿ`.

### `Histogram`
- `NewHistogram(bounds)` : `bounds` donne les bornes hautes **incluses** des tranches (ex. `10, 100, 1000` → `≤10`, `]10;100]`, `]100;1000]`, plus une tranche de débordement). Copie `bounds`.
- `Observe(v)` range `v` dans sa tranche ; `Count()` donne le total.
- `Quantile(p)` renvoie la **borne haute** de la tranche contenant le percentile (même rang que `Percentile`), `+Inf` pour la tranche de débordement, 0 si vide.
- `Merge(other)` additionne case par case ; si les bornes diffèrent, renvoie `ErrBoundsMismatch` **sans rien modifier**.

## Exemple

Serveur A : 1 000 requêtes à 5 ms. Serveur B : 10 requêtes à 900 ms. La moyenne des p95 vaut 505 ms ; le p95 de l'histogramme fusionné vaut 10 ms.
