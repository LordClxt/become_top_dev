## Contexte

La conformité exige que **chaque appel** aux services sensibles soit journalisé. Ajouter une ligne `auditLog.record(...)` au début de chaque méthode, c'est des dizaines d'oublis assurés. On va faire comme Spring pour `@Transactional` : le conteneur remplace le bean par un **proxy** au moment de sa création.

Tu édites seulement `AuditBeanPostProcessor.java`. Tout le reste est fourni, y compris son enregistrement dans `AuditConfig`.

## Ta tâche

Dans `postProcessAfterInitialization`, pour chaque bean dont la classe porte `@Audited` :

- renvoie à la place un **proxy JDK** (`java.lang.reflect.Proxy`) qui implémente **toutes les interfaces** du bean ;
- chaque appel à une méthode d'interface ajoute au journal `NomSimpleDeLaClasse.méthode` (ex. `OrderService.place`), puis délègue au vrai bean ;
- une exception levée par le bean doit arriver **telle quelle** à l'appelant ;
- `toString`, `equals` et `hashCode` délèguent au bean mais ne sont **pas** journalisés.

Les beans sans `@Audited` sont rendus inchangés.

## Exemple

```java
ctx.getBean(Checkout.class).buy("rock", 3);   // "order:rockx3@13500"
ctx.getBean(AuditLog.class).entries();         // ["OrderService.place"]
```

## Pour aller plus loin (non testé)

Après ta modification, essaie `ctx.getBean(OrderService.class)`. Que se passe-t-il, et pourquoi ?
