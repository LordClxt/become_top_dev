## Hint 1
Un singleton créé au démarrage ne peut pas « connaître » une requête. Il faut une instance par requête : `@Injectable({ scope: Scope.REQUEST })`.

## Hint 2
Le jeton `REQUEST` de `@nestjs/core` donne l'objet requête de la plateforme. `request.header('x-request-id')` lit l'en-tête.

## Hint 3
Pour `AuditLogger` : `@Injectable({ scope: Scope.TRANSIENT })` et `@Inject(INQUIRER) parent: object`, puis `parent.constructor.name`. `CatalogRepository` ne dépend ni de l'un ni de l'autre : il reste singleton sans que tu fasses rien.
