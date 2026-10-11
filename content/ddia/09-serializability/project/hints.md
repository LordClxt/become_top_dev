## Hint 1
Écris d'abord deux petites aides : `compatible(a, b Mode) bool` (vrai seulement pour deux partagés) et `blockers(tx, mode)` qui liste les détenteurs autres que `tx` dont le verrou est incompatible. Accorder = pas de bloqueur ET (`tx` détient déjà la clé OU la file est vide).

## Hint 2
Pour l'interblocage, mets d'abord la demande en file et marque `tx` comme en attente, puis lance un parcours en profondeur sur `WaitsFor` depuis `tx` avec un ensemble de visités. Si tu retombes sur `tx`, défais la mise en file avant de renvoyer `ErrDeadlock`. Comme `WaitsFor` est recalculé à chaque appel, le graphe est toujours à jour après un `ReleaseAll`.

## Hint 3
SSI : la validation enregistrée est `{tx, ts, writes}`. Au commit d'une transaction qui a écrit, parcours les validations de `ts > start` et cherche une clé de leurs écritures dans tes lectures ou tes écritures. Pour oublier : calcule le plus petit `start` des transactions encore actives (ou l'horloge s'il n'y en a aucune) et supprime les validations de `ts` inférieur ou égal.
