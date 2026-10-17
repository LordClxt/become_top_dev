## Le ticket

> **Support client — priorité haute.** « J'ajoute deux livres à mon panier, je recharge la page : il est vide. » Plusieurs clients le signalent depuis la mise en production de l'audit. Et le tableau de bord des ventes affiche 0 € de paniers en cours, depuis toujours.

L'application est dans `cart.ts`, `stats.ts`, `audit.ts` et `app.module.ts`. Elle démarre, aucune erreur dans les logs.

## Ta mission

1. **Reproduis** chaque symptôme avant de toucher au code : quelle requête, quel résultat attendu, quel résultat obtenu ?
2. **Trouve la cause racine** de chacun. Il y en a deux, indépendantes.
3. **Corrige** sans perdre l'audit : chaque ligne doit toujours porter le `x-request-id` de sa requête.

Les tests décrivent le comportement attendu. Ils ne te disent pas où est le bug.

Dans le débriefing, écris en une phrase par symptôme : la cause, et pourquoi aucune erreur n'apparaissait.
