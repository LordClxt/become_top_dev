## Contexte

Un client clique deux fois sur « Payer », ou son téléphone renvoie la requête après une coupure réseau. Sans précaution, Tixa le débite deux fois. La parade classique est une **clé d'idempotence** : le client envoie la même clé pour la même commande, et le serveur rejoue le résultat du premier appel au lieu d'en refaire un.

Écrire ce contrôle dans chaque méthode de paiement, c'est l'oublier un jour. Tu l'écris une fois, sous forme d'aspect. `@Idempotent` et `PaymentService` sont fournis, et `PaymentService` ne doit pas changer.

Tu écris `IdempotencyAspect.java` et tu complètes `AppConfig.java`.

## Ta tâche

Pour chaque méthode annotée `@Idempotent` :
- la clé est l'argument à la position `keyArg` (une `String`). Clé absente, `null` ou vide : `IllegalArgumentException`, **sans** appeler la méthode ;
- premier appel réussi avec une clé : le résultat est **mémorisé** ;
- appel suivant avec la même clé : le résultat mémorisé est **renvoyé**, la méthode n'est pas exécutée ;
- un appel qui **échoue** n'est pas mémorisé : un nouvel essai avec la même clé exécute la méthode ;
- chaque méthode a ses propres clés : `r-1` pour `refund` et `r-1` pour `charge` sont deux opérations.

## Ce qui sera relu

Au-delà des tests, la revue juge la sémantique (quoi mémoriser, avec quelle clé, entre threads) et l'usage de l'AOP. Signale dans un commentaire ce que ton aspect **ne** protège **pas** (pense aux appels simultanés et à l'auto-invocation).
