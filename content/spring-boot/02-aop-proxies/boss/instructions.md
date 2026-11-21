## Contexte

`@Transactional` n'est qu'un aspect. Pour le prouver, tu en écris un : `@Atomic`. La base (H2), `JdbcClient` et le gestionnaire de transactions de Spring (`DataSourceTransactionManager`) sont configurés dans `DataConfig`, **sans** `@EnableTransactionManagement` : aucune transaction n'existe tant que ton aspect ne les ouvre pas.

Fournis : `@Atomic`, `Ledger` (les écritures en base), `AuditTrail`, `Accounting` et `DataConfig`. Tu écris `AtomicAspect.java` et tu complètes `AppConfig.java`.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles de `@Atomic`

- Une méthode `@Atomic` appelée hors de toute transaction s'exécute dans une **nouvelle** transaction, obtenue du `PlatformTransactionManager` du conteneur : validée si la méthode réussit, **annulée pour toute exception**, vérifiée comprise. L'exception remonte telle quelle.
- Une méthode `@Atomic` appelée alors qu'une transaction est **déjà en cours** la rejoint, comme la propagation `REQUIRED` de Spring : c'est la transaction externe qui décide du sort de toutes les écritures.
- `Accounting.settle` porte `@Retryable` (Spring 7) **et** `@Atomic` : chaque tentative doit repartir d'une transaction neuve, et les écritures des tentatives ratées ne doivent pas rester.

`Ledger` utilise `JdbcClient` sans rien connaître de ton aspect : ses écritures doivent pourtant appartenir à ta transaction.
