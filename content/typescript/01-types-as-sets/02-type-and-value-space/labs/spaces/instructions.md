## Contexte

Une constante contient déjà toute l'information d'un type : recopier ses clés ou sa forme dans un type écrit à la main crée deux sources de vérité qui divergeront. Tu dérives les types **de la valeur** avec `typeof`, `keyof` et l'accès indexé `T[K]`, et tu distingues le type d'une classe de celui de ses instances.

Tu édites `spaces.ts`.

## À faire

1. `ThemeName` : les clés de `themes`, sans les recopier. `getTheme` et `themeNames` renvoient respectivement le thème et la liste des noms (`['light', 'dark', 'solar']`).
2. `TextColor<N>` : le type littéral de la couleur de texte du thème `N` (`TextColor<'dark'>` vaut `'#f5f5f5'`).
3. `Settings` : le type de `defaultSettings`, déduit. `settings(overrides)` fusionne les valeurs par défaut et les surcharges, sans partager le tableau `tabs` avec la constante.
4. `TemperatureFactory` : le type de la **classe** `Temperature` (constructeur). `build(factory, celsius)` construit une instance avec elle.

## Contraintes

Pas de `any`. Ne recopie aucune clé ni aucune forme déjà présente dans une valeur.
