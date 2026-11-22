## Contexte

Les routes « de moi » de Tixa (`/me`, `/me/reservations`, `/me/greeting`) lisent toutes le client appelant dans l'en-tête `X-Customer-Id`. Plutôt que de répéter ce code dans chaque méthode, l'équipe a écrit une annotation, `@CurrentCustomer`, et un résolveur, `CurrentCustomerResolver`. Le contrôleur est prêt ; le résultat, lui, est faux : `/me` renvoie un client aux champs vides, quel que soit l'en-tête.

`CustomerDirectory.find(id)` renvoie le client, ou un `Optional` vide si l'identifiant est absent ou inconnu.

## Ta mission

1. Fais en sorte que `@CurrentCustomer Customer` soit fourni par le résolveur.
2. Sans en-tête, ou pour un client inconnu : **401**, sans appeler la méthode du contrôleur.
3. Les autres paramètres (comme `lang` dans `/me/greeting?lang=en`) restent fournis par Spring.

Ne modifie que `CurrentCustomerResolver.java` et `WebConfig.java`.
