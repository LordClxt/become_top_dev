## Contexte

La conformité exige un journal d'audit pour les actions sensibles : qui, quoi, quand, dans quelle requête, et avec quel résultat. Les développeurs veulent l'écrire en **une ligne** par route :

```ts
@Audited('book.delete')
@Delete(':isbn')
remove(...) {}
```

Écris `Audited` (et tout ce qu'il faut derrière) dans `audit.ts`. `app.ts` et `context.ts` (le `RequestContext` du TP de la leçon 1) sont fournis.

## Le contrat

Pour chaque appel d'une route `@Audited(action)`, une entrée dans `AuditLog.entries` :

```ts
{ action, userId, requestId, outcome: 'success' | 'failure', status?, durationMs }
```

- `userId` vient de `request.user.id` (posé par le guard fourni) ; `requestId` du `RequestContext`.
- Un échec est journalisé **et** l'erreur atteint le client inchangée ; `status` est le statut HTTP de l'erreur (500 si elle n'en a pas).
- Les routes sans `@Audited` ne laissent aucune trace.

Dans ton rendu, explique en trois phrases pourquoi un intercepteur, et pas un guard, un middleware ou un filtre, est le bon endroit pour ce besoin.
