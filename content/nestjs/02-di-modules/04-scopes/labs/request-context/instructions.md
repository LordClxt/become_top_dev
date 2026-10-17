## Contexte

`OrdersService` (fourni, dans `app.ts`) renvoie un résumé qui contient l'identifiant de la requête courante, et laisse une ligne d'audit. La requête est lente (30 ms), donc plusieurs requêtes se chevauchent. Il te reste à écrire, dans `context.ts` :

- `RequestContext.requestId` : l'en-tête `x-request-id` de **la requête en cours**, ou `'anonymous'` ;
- `AuditLogger.log(message)` : ajoute `<NomDeLaClasseConsommatrice>: <message>` à `AUDIT_LINES`.

## Contraintes

- Quatre requêtes parallèles doivent chacune retrouver leur propre identifiant.
- `CatalogRepository` doit rester un singleton : une seule instance pour toute l'application.
- `AuditLogger` ne connaît pas son consommateur à l'avance : il doit le découvrir par injection.

Le test compte les instances : il vérifie que tu as compris **jusqu'où** remonte la portée par requête.
