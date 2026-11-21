## Hint 1
Ajoute dans `sellAndCharge` un `System.out.println(TransactionSynchronizationManager.isActualTransactionActive())` et lance un test : y a-t-il vraiment une transaction ? Puis regarde quelle sorte d'exception lève la banque.

## Hint 2
`@Transactional` est appliqué par un proxy : il ne voit que les appels qui **arrivent de l'extérieur** du bean. Et par défaut, une transaction n'est annulée que pour une `RuntimeException` ou une `Error`. Une exception **vérifiée** valide la transaction.

## Hint 3
Pose `@Transactional` sur la méthode appelée de l'extérieur (`book`). Pour les exceptions vérifiées, `rollbackFor` sur l'annotation règle le cas d'aujourd'hui ; `@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)` (Spring 6.2 et plus) règle aussi celui de demain.
