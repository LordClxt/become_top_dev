## Où on en est

Les jalons 1 à 3 ont posé `Money`, `Order` (immuable, construit par builder), `OrderJournal`, `BookSide`, `Trade` et `BookSnapshot` : le code est repris tel quel. Ce jalon s'attaque à trois fragilités repérées en revue : un prix limite `null` qui veut dire « au marché », un besoin de compter les ordres journalisés sans toucher au journal, et des commissions calculées par des `if` dispersés.

`Journal` (fourni) est l'interface des journaux ; `OrderJournal` l'implémente. Sa méthode par défaut `recordAll` appelle `record` pour chaque ordre (c'est documenté avec `@implSpec`).

## M1 — Des prix sous forme de types

- `Pricing` devient une **interface scellée** à deux sortes, des records : `Market()` et `Limit(Money price)` (prix non nul et positif).
- `order.pricing()` renvoie la sorte de prix ; `limit()` et `isMarket()` continuent de fonctionner ; une exécution partielle (`fill`) garde le prix.
- `order.accepts(price)` : toujours vrai au marché ; à cours limité, un achat accepte sa limite ou moins cher, une vente sa limite ou plus cher. Une autre devise : `IllegalArgumentException`. Écris-la avec un `switch` sur `pricing`, **sans `default`**.

## M2 — Un journal décoré

`CountingJournal` **enveloppe** n'importe quel `Journal` et compte les ordres enregistrés : `count(symbol)` et `total()`.
- chaque ordre est transmis au journal enveloppé une seule fois, et compté une seule fois, qu'il arrive par `record` ou par `recordAll`, et quel que soit le `recordAll` du journal enveloppé ;
- `flush` et `close` sont transmis ; `CountingJournal` est finale ; un journal `null` est refusé.

## M3 — Des commissions vérifiées par le compilateur

- `Commission` devient une **interface scellée** : `Flat(Money amount)` (non nul, pas négatif) et `Rate(int basisPoints)` (de 0 à 10 000 ; 1 pb = 0,01 %).
- `trade.commission(c)` : le forfait (dans la devise de la transaction, sinon `IllegalArgumentException`), ou le taux appliqué au montant de la transaction, **arrondi vers le bas** à l'unité mineure de la devise.
