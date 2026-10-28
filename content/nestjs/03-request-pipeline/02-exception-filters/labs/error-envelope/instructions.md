## Contexte

Les clients de l'API reçoivent des erreurs de quatre formes différentes : celle de Nest, du texte brut, et parfois la trace d'une erreur PostgreSQL avec l'adresse IP du serveur. On veut **une seule** forme :

```json
{ "statusCode": 404, "errorCode": "NOT_FOUND", "message": "Livre introuvable", "path": "/books/missing" }
```

Écris `ErrorEnvelopeFilter` dans `errors.filter.ts`. `app.ts` (fourni) l'enregistre globalement avec `APP_FILTER`.

## Les règles

| Exception | statusCode | errorCode | message |
|---|---|---|---|
| `HttpException` | son statut | son `errorCode` s'il en a un, sinon le nom du statut (`NOT_FOUND`, `UNAUTHORIZED`…) | son message (un tableau est joint par `; `) |
| `OutOfStockError` (métier) | 409 | `OUT_OF_STOCK` | son message |
| tout le reste | 500 | `INTERNAL_ERROR` | `Erreur interne`, et le vrai message ajouté à `ErrorEnvelopeFilter.logged` |

Réponds par l'adaptateur HTTP (`HttpAdapterHost`), pas par l'objet `Response` d'Express : le filtre doit fonctionner aussi avec Fastify.
