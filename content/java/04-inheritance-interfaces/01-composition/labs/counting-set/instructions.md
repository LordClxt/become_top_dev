## Contexte

Le tableau de bord d'Ordo affiche le nombre d'ordres **soumis** à un ensemble depuis le démarrage (doublons compris : ce sont des tentatives). `InstrumentedSet` étend `HashSet` et redéfinit `add` et `addAll`. Résultat : un lot de trois ordres arrive par `addAll`, le compteur affiche 6. Et l'équipe aimerait aussi compter les insertions dans un `TreeSet` déjà rempli, ce que la classe ne sait pas faire : elle copie l'ensemble reçu au lieu de l'utiliser.

`ForwardingSet` (fourni) transmet chaque méthode de `Set` à l'ensemble qu'il contient.

## Ta mission

Réécris `InstrumentedSet` par **composition** : il enveloppe l'ensemble reçu (n'importe quelle implémentation de `Set`), sans le copier, et `addCount()` donne le nombre exact de tentatives passées par l'enveloppe.

Ne modifie que `InstrumentedSet.java`.
