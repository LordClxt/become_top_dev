## Contexte

Tixa monte de Spring Boot 3.5 à Spring Boot 4.1. Le code d'export des billets vers un partenaire ne **compile plus** : il a été écrit pour Jackson 2 et pour l'autoconfiguration Jackson de Boot 3. Lance les tests pour lire les erreurs de compilation : c'est le premier contact de toute migration.

Le partenaire exige des noms de champs en `snake_case` (`event_id`, `seat_number`…). `Ticket` et `TixaApp` sont fournis. Tu migres `JsonConfig.java` et `TicketExporter.java`.

## Ta tâche

1. Passe à **Jackson 3**, que Spring Boot 4 utilise par défaut.
2. Remplace le customizer de Boot 3 par celui de Boot 4, pour que la stratégie `snake_case` s'applique au mapper **du conteneur**.
3. `TicketExporter` utilise le mapper configuré par Spring Boot (pas un mapper créé à la main), et n'a plus de `try/catch` inutile.

## À savoir

Jackson 3 change de paquet (`com.fasterxml.jackson` devient `tools.jackson`), sauf les annotations (`com.fasterxml.jackson.annotation`, inchangé). Le guide de migration de Spring Boot 4 (wiki GitHub) liste les autres changements.
