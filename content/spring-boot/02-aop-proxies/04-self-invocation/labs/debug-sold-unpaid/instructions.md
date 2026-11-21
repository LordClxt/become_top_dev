## Contexte

Message de la comptabilité de Tixa :

> Depuis quelques jours, des concerts affichent complet alors que les recettes ne suivent pas. On a croisé avec la banque : des places sont marquées vendues pour des paiements **refusés**. Le code de réservation est pourtant annoté `@Transactional`, on l'a vérifié deux fois. La semaine dernière, on a ajouté la gestion des cartes expirées.

Le code est réparti en quatre fichiers : `BookingService.java` (la réservation), `SeatRepository.java` (les places, en base H2), `PaymentGateway.java` (la banque simulée) et `TxConfig.java` (la configuration, transactions comprises). Les tests rejouent des journées réelles.

## Ta mission

1. Trouve **pourquoi** des places restent vendues après un paiement refusé. Il y a plus d'une cause.
2. Corrige-les.
3. Fais en sorte que la **prochaine** exception vérifiée ajoutée au paiement ne puisse plus réintroduire le bug.

Ne modifie pas les tests.
