## Contexte

Pour comprendre les erreurs d'injection de Nest, rien ne vaut d'en écrire un. Tu vas coder un conteneur minimal qui fait comme Nest : lire `design:paramtypes`, résoudre récursivement et garder des singletons.

Tu édites `injector.ts`. Les fichiers compilent avec `tsc` et `emitDecoratorMetadata`, comme une vraie application Nest.

## 1. `Injectable()`

Un décorateur de classe qui **marque** la classe comme injectable : il enregistre la métadonnée `INJECTABLE` (constante exportée) à `true` sur la classe. Il ne fait rien d'autre. Sa simple présence suffit à ce que tsc émette `design:paramtypes`.

## 2. `Container.resolve(cls)`

- Si `cls` n'est pas marquée injectable → lève une `ResolutionError` dont le message contient le nom de la classe.
- Lit `design:paramtypes` (absent = constructeur sans paramètre) et résout chaque dépendance **avant** d'appeler `new cls(...deps)`.
- Si une dépendance vaut `undefined` (import circulaire) → `ResolutionError` dont le message contient le nom de la classe **et** l'index du paramètre (ex. `index [1]`).
- Si une dépendance vaut `Object` (interface ou `import type`) → `ResolutionError` dont le message contient `Object` et l'index.
- **Singleton** : un second `resolve` de la même classe renvoie la même instance, et une dépendance partagée par deux classes n'est créée qu'une fois.

## 3. `Container.register(cls, instance)`

Enregistre une instance toute faite (c'est l'équivalent de `useValue`) : `resolve(cls)` la renverra ensuite telle quelle. Les tests s'en servent pour remplacer une dépendance.
