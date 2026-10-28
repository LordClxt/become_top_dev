## archkit, épisode 10

Le style service-based doit son pragmatisme à deux choses : des transactions **ACID** dans des services à gros grain, et une base partagée **maîtrisée**. Cet épisode les code.

### Jalon 1 : `Db`
`db.transaction(fn)` exécute `fn(tx)` :
- `tx.put`, `tx.delete` ne touchent pas la base tout de suite ; `tx.get` et `tx.all` voient **les écritures de la transaction** (et `all` trie par identifiant) ;
- `tx.nextId(séquence)` renvoie 1, 2, 3… ;
- si `fn` réussit, tout est appliqué (**commit**) ; si elle lève, **rien** ne l'est, séquences comprises (**rollback**), et l'erreur est propagée ;
- une transaction imbriquée lève `NestedTransactionError`.
`db.get` et `db.count` lisent hors transaction. Toute ligne lue est une **copie**.

### Jalon 2 : `OrderFacade.placeOrder`
Dans **une** transaction : vérifier et décrémenter le stock de chaque ligne (`OutOfStockError` si insuffisant ou inconnu), générer `ORD-<n>`, enregistrer la commande (`totalCents`), puis appeler le prestataire (`charge`), et enregistrer le paiement `{ ref, amountCents }`. Le prestataire est appelé **en dernier** : un client n'est jamais débité si le stock manque, et un refus de paiement annule tout.

### Jalon 3 : impact
- `redeployImpact(tables, libs, services)` : services triés qui importent une bibliothèque contenant une table changée. Une table sans bibliothèque lève `UnknownTableError`, une table dans plusieurs bibliothèques `AmbiguousTableError`.
- `averageImpact(libs, services)` : nombre moyen de services redéployés quand **une** table change (chaque table pèse pareil), arrondi à deux décimales.
