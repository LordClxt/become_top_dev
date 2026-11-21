## Contexte

Tixa grandit. Le support veut savoir ce qui s'est passé pour chaque réservation et chaque paiement ; la comptabilité veut que les pannes passagères du prestataire de paiement ne fassent plus échouer les commandes. Rien de tout cela ne doit encombrer le code métier.

Fournis : `@Audited`, `AuditLog`, la banque simulée (`Bank`), les deux exceptions de paiement et `ReservationService`. Tu modifies `AuditAspect`, `PaymentClient`, `Checkout` et `TixaConfig`. Les tests sont groupés par jalon : `jboot M1`, `M2`, `M3`.

## M1 — L'audit

`AuditAspect` est un `@Aspect` (il reçoit `AuditLog`) qui consigne chaque appel à une méthode `@Audited` :
- `reserve(jazz) ok jazz:1-2` : nom de la méthode, premier argument, résultat ;
- `reserve(rock) échec complet` : message de l'exception, qui remonte ensuite.

Active les aspects et déclare `AuditAspect` dans `TixaConfig`.

## M2 — Les paiements qui réessaient

Avec le `@Retryable` de **Spring 7** (`org.springframework.resilience.annotation`), `PaymentClient.charge` est réessayée :
- seulement pour une `PaymentUnavailableException` (une `PaymentDeclinedException` ne l'est jamais) ;
- 3 tentatives au total, sans délai (`delay = 0`, pour les tests).

## M3 — Une ligne d'audit par paiement

Le support veut **une** ligne par paiement de commande, avec la référence de la commande, retries compris :

```
pay(cmd-1) ok pay-3-9000
```

Lance d'abord les tests de M3 avec l'audit posé sur `PaymentClient.charge`, et lis le journal. Puis trouve où le poser.
