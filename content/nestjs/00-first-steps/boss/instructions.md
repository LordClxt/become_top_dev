## Le défi

Au TP « mini-injecteur », tu as écrit un conteneur qui résout des classes. Ici, tu écris le cœur de ce que fait vraiment `@nestjs/core` : jetons arbitraires, `@Inject`, classes abstraites, détection de cycle et hooks d'initialisation. Tout se passe dans `container.ts`.

Pas d'indices pour ce combat.

## Le contrat

- `Injectable()` marque une classe comme constructible par le conteneur.
- `Inject(token)` est un décorateur de **paramètre** : à cette position, le conteneur doit fournir `token` au lieu du type lu dans `design:paramtypes`.
- `container.provide(token, { useValue })` ou `container.provide(token, { useClass })` enregistre une recette. Un jeton peut être une classe (y compris abstraite), une chaîne ou un `Symbol`.
- `container.get(token)` :
  - renvoie une instance unique par jeton (singleton) ;
  - une classe injectable non enregistrée se résout elle-même ;
  - construit les dépendances avant le consommateur, récursivement ;
  - lève une `ResolutionError` lisible : jeton inconnu (le message cite le jeton **et** la classe qui le demandait), classe non injectable, paramètre `Object` ou `undefined` (le message donne l'**index**, par ex. `[0]`), dépendance circulaire (le message montre le chemin, par ex. `A -> B -> A`).
- `await container.init()` appelle `onInit()` (synchrone ou async) sur chaque instance créée, une seule fois, **les dépendances avant leurs consommateurs**.

Dans le débriefing, compare ton conteneur à celui de Nest : qu'est-ce que Nest fait en plus (cite deux choses vues dans la doc) ?
