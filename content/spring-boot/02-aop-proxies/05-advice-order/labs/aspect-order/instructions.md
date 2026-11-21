## Contexte

`SeatLocker.lock` verrouille une place, et échoue parfois parce qu'un autre client tient le même verrou. Trois aspects s'appliquent à cette méthode (annotée `@Booking`) :
- `RetryAspect` réessaie jusqu'à 3 tentatives (fourni) ;
- `TimingAspect` mesure la durée (fourni) ;
- `AuditAspect`, que tu écris, garde une trace pour le support.

Sans ordre explicite, Spring ne garantit pas dans quel ordre les aspects s'emboîtent. Ici, le résultat change complètement selon l'ordre.

## Ta tâche

1. Écris `AuditAspect` (un `@Aspect`) qui ajoute au `Trace` :
   - avant l'appel : `audit appel lock(A12)` (nom de la méthode et premier argument) ;
   - après un succès : `audit ok verrou-A12` (la valeur renvoyée) ;
   - après un échec : `audit échec place déjà verrouillée` (le message de l'exception).
   Utilise un conseil `@Before`, un `@AfterReturning` et un `@AfterThrowing` (pas de `@Around`). Déclare-le comme bean dans `AopConfig`.
2. Fixe l'ordre des trois aspects avec `@Order` pour obtenir, pour un appel réussi à la 3e tentative :

```
audit appel lock(B3)
mesure début
tentative 1, lock B3 #1, tentative 2, lock B3 #2, tentative 3, lock B3 #3
mesure fin
audit ok verrou-B3
```

Une seule ligne d'audit par appel, une seule mesure qui couvre toutes les tentatives. Dans `RetryAspect` et `TimingAspect`, tu ne modifies que leur ordre.
