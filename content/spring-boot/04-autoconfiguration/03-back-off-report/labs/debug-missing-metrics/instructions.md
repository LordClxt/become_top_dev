## Contexte

Message de l'équipe produit, après la montée de la bibliothèque cliente en Spring Boot 4 :

> Le tableau de bord n'affiche plus aucune métrique d'appels au client Tixa, alors que le client fonctionne. Et le service partenaire se plaint : depuis la mise à jour, nos billets lui arrivent en texte (`jazz x2`) au lieu de JSON. Jackson est bien dans les dépendances, on l'a vérifié.

La bibliothèque contient trois autoconfigurations, dans `tixa.client` : `TixaClientAutoConfiguration` (le client et un codec texte de secours), `ClientMetricsAutoConfiguration` (les métriques, quand un client existe) et `JsonCodecAutoConfiguration` (un codec JSON, quand Jackson est là). Les tests rejouent le contexte d'une application qui utilise la bibliothèque.

## Ta mission

1. Trouve **pourquoi** les métriques manquent et pourquoi les billets ne sont pas en JSON. Il y a plus d'une cause.
2. Corrige-les.
3. Fais en sorte que la condition sur Jackson ne puisse plus viser une classe qui n'existe pas : une faute de nom doit casser la **compilation**, pas l'application en silence.

Ne modifie pas les tests.
