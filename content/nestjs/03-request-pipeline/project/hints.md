## Hint 1
M1 : reprends le TP « Un identifiant de requête sans contagion » (leçon 1). `PipelineModule` fournit et exporte `RequestContext`, et applique le middleware dans `configure()`. Attention : la section pipeline doit être définie **avant** les classes qui utilisent `@Staff()`.

## Hint 2
M2 : `Reflector.createDecorator<boolean>({ transform: () => true })` et un guard enregistré par `APP_GUARD` qui laisse passer toute route sans la métadonnée.

## Hint 3
M3 : le filtre du TP « Une seule enveloppe d'erreur », avec en plus `requestId: this.ctx.requestId`. L'intercepteur : `next.handle().pipe(tap(() => res.setHeader(...)))`.
