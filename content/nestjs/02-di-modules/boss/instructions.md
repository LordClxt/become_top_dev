## Le besoin

La librairie devient une plateforme : plusieurs boutiques (des **locataires**) partagent la même API. Chacune envoie des notifications à ses clients, par e-mail ou par SMS. Les canaux (`channels.ts`) sont fournis ; tout le reste est à construire dans `notifications.ts`.

Pas d'indices pour ce combat. Tout ce qu'il faut a été vu dans le chapitre.

## Le contrat

**Module.** `NotificationsModule.forRoot(options)` et `NotificationsModule.forRootAsync({ imports, useFactory, inject })`, avec :

```ts
interface NotificationsOptions {
  defaultChannel: 'email' | 'sms';
  senders: { email: string; sms: string };   // l'expéditeur de chaque canal
}
```

et une option supplémentaire `isGlobal` (fausse par défaut). Une configuration dont `defaultChannel` n'est ni `email` ni `sms` doit **empêcher le démarrage**.

**Service.** `NotificationsService` (exporté) :
- `send(tenant, to, text, channel?)` envoie par le canal demandé, ou le canal par défaut, avec l'expéditeur de ce canal, et renvoie le reçu du canal ; un canal inconnu → `BadRequestException` ;
- garde une trace de chaque envoi, par locataire ;
- possède un champ statique `instances`, incrémenté dans son constructeur.

**HTTP.** Le locataire est l'en-tête `x-tenant-id` (400 s'il manque).

| Route | Corps | Réponse |
|---|---|---|
| `POST /notifications` | `{ to, text, channel? }` | 201 `{ receipt }` |
| `GET /notifications` | — | les reçus du locataire courant, et seulement les siens |

## Les contraintes qui font la difficulté

- `NotificationsService` reste **un singleton**, même sous des requêtes parallèles : une seule instance pour toute l'application.
- **Aucun provider request-scoped**, ni `REQUEST`, ni `forwardRef`, ni `ModuleRef`, ni `@Global()`. Les tests lisent ton code.
- Les locataires ne doivent jamais voir les messages des autres.

Dans le débriefing, justifie en trois phrases où tu as placé la lecture du locataire, et ce qu'aurait coûté un `TenantContext` request-scoped injecté dans le service.
