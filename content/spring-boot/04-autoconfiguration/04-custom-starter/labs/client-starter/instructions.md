## Contexte

La première version de la bibliothèque cliente ne laissait que deux choix : prendre le client tel quel, ou tout réécrire. Les équipes veulent un juste milieu : changer l'URL par configuration, et **ajouter** un en-tête d'authentification ou de traçage sans perdre le reste. C'est le patron qu'utilise Spring Boot partout (`RestClientCustomizer`, `JsonMapperBuilderCustomizer`…) : des *customizers*.

`TixaClient` (avec son builder) et l'interface `TixaClientCustomizer` sont fournis. Tu écris `TixaClientProperties.java` et `TixaClientAutoConfiguration.java`.

## Ta tâche

1. `TixaClientProperties` (préfixe `tixa.client`) : `base-url` (défaut `https://api.tixa.example`) et `timeout` (défaut `5s`).
2. L'autoconfiguration construit le `TixaClient` :
   - à partir des propriétés ;
   - puis en appliquant **tous** les `TixaClientCustomizer` de l'application, dans l'ordre de leur `@Order` ;
   - sauf si l'application déclare son propre `TixaClient` : alors, rien n'est construit, customizers compris.
