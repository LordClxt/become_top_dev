## Hint 1
#601 : à quelle étape du cycle de vie la clé est-elle vérifiée, et quels filtres voient les erreurs de cette étape ? #602 : quelles métadonnées le guard lit-il ? #603 : quand `tap(fn)` est-il appelé ?

## Hint 2
Les middlewares s'exécutent avant que Nest sache quel contrôleur va répondre : seuls les filtres **globaux** les voient. Un `@Roles` de méthode n'est lu que si le guard regarde `getHandler()`.

## Hint 3
Enregistre le filtre avec `APP_FILTER` (et retire `@UseFilters`) ; `getAllAndOverride(Roles, [getHandler(), getClass()])` ; `tap({ next, error })`.
