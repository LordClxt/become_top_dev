## Contexte

Le tableau de bord des traders demande les cotations de tout un portefeuille, jusqu'à mille titres, au fournisseur de données (`QuoteProvider`, fourni). Chaque appel est **bloquant** et prend entre 20 et 100 ms. Le code actuel les enchaîne un par un : une minute d'attente pour un gros portefeuille.

Le contrat avec le fournisseur limite le nombre d'appels **simultanés**, et son support exige l'identifiant de requête de l'appelant dans chaque appel, pour tracer les incidents. Le fournisseur le lit dans `Aggregator.REQUEST_ID`, une `ScopedValue`.

## Ta mission

Réécris `Aggregator.quoteAll(String requestId, List<String> symbols)` :

- un **thread virtuel par appel** au fournisseur ;
- au plus `maxConcurrent` appels en cours en même temps (valeur passée au constructeur) ;
- pendant chaque appel, `REQUEST_ID` est lié à `requestId` ;
- le résultat est une `SequencedMap<String, Long>` (symbole → prix) **dans l'ordre de `symbols`** ;
- si un appel échoue, `quoteAll` lève `QuoteException` (fournie) dont le message contient le symbole fautif ;
- aucune tâche ne doit survivre à l'appel de `quoteAll`.

Objectif chiffré (vérifié par les tests) : 1 000 cotations de 50 ms en moins de 3 secondes avec `maxConcurrent = 1000`.
