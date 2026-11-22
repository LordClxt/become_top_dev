## Contexte

`PaymentAutoConfiguration` déclare trois beans sans condition : deux passerelles de paiement en même temps (le démarrage échoue dès qu'on en injecte une) et un journal d'audit toujours actif. Une autoconfiguration doit **s'adapter** : à ce qui est sur le classpath, à ce que l'application déclare déjà, à la configuration.

Fournis : `PaymentGateway`, `AuditLog`, et `sdk.lydia.LydiaSdk`, qui joue le SDK d'un prestataire (les tests le cachent pour simuler son absence). Tu modifies seulement `PaymentAutoConfiguration.java`. Les tests utilisent `ApplicationContextRunner`, l'outil de Spring Boot pour tester une autoconfiguration.

## Ta tâche

| situation | passerelle |
|---|---|
| le SDK Lydia (`sdk.lydia.LydiaSdk`) est sur le classpath | `lydia` |
| pas de SDK, pas d'autre passerelle | `factice` |
| l'application déclare sa propre passerelle | la sienne |

Le journal d'audit n'existe que si `tixa.audit.enabled=true`.
