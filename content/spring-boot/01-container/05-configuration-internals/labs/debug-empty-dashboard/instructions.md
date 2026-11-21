## Contexte

Ticket du support, mardi :

> Les organisateurs disent que le tableau de bord affiche **0 place vendue** pour tous leurs concerts, alors que les clients reçoivent bien leurs billets et que les logs montrent les confirmations. Notre outil interne, qui affiche le total des ventes, est lui aussi à 0. On a redémarré deux fois, rien ne change. Personne n'a touché au tableau de bord depuis des semaines ; la semaine dernière, on a juste « rangé » la configuration des beans.

Le code est réparti en cinq fichiers : `TixaApp.java` (le point d'entrée), `StoreConfig.java` (les beans), `ReservationStore.java` (les ventes), `ReservationService.java` (les confirmations) et `Dashboard.java` (le tableau de bord). Les tests rejouent des journées réelles.

## Ta mission

1. Trouve **pourquoi** les chiffres sont faux. Il y a plus d'une cause.
2. Corrige-les.
3. Rends la configuration robuste : elle doit rester juste même si quelqu'un la « range » à nouveau.

## Contraintes

- Le tableau de bord doit afficher les ventes **en temps réel**.
- Ne modifie pas les tests.
