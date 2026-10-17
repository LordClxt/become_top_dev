## Ce que ce combat évaluait

- **La fusion des métadonnées.** `design:paramtypes` donne les types écrits par tsc ; tes `@Inject` notent `{ index, token }` et remplacent ces positions. C'est exactement ce que fait l'injecteur de Nest avec `self:paramtypes`.
- **Les erreurs comme outil.** Un message qui cite le jeton, la classe demandeuse et l'index fait gagner des heures. Nest fait de même (« Nest can't resolve dependencies of X (?, B). Please make sure that the argument at index [0]… »).
- **La détection de cycle par chemin.** Garder la pile des jetons en cours de construction suffit à voir `A -> B -> A` avant de boucler à l'infini.
- **L'ordre d'initialisation.** Comme une instance n'est créée qu'après ses dépendances, l'ordre de création est déjà un ordre topologique : appeler les hooks dans cet ordre garantit qu'une dépendance est prête avant son consommateur. Nest suit la même logique pour `onModuleInit`.
- **Ce que Nest ajoute** : les modules et leur encapsulation (exports), les portées REQUEST et TRANSIENT, les fabriques asynchrones (`useFactory` + `inject`), `forwardRef`, et les hooks d'arrêt (`onModuleDestroy`, `beforeApplicationShutdown`).
