## Contexte

Les identifiants publics de la librairie portent un préfixe de type : `usr_1` pour un utilisateur, `ord_1` pour une commande. La logique est la même partout, seul le préfixe change. C'est le cas d'école du **module dynamique**.

Écris `IdGeneratorModule` dans `id-generator.module.ts`, avec `ConfigurableModuleBuilder`.

## Ce qui est attendu

- `IdGeneratorModule.register({ prefix })` : chaque module qui l'importe reçoit **son** `IdGenerator`, qui produit `<prefix>_1`, `<prefix>_2`…
- `IdGeneratorModule.registerAsync({ imports, useFactory, inject })` : le préfixe vient d'un autre provider.
- Une option supplémentaire `isGlobal` (fausse par défaut) rend le module global. Elle ne doit **pas** apparaître dans les options injectées.
- Exporte `MODULE_OPTIONS_TOKEN` : le test le lit.
- Un préfixe qui ne respecte pas `^[a-z]{2,5}$` doit empêcher le démarrage.
