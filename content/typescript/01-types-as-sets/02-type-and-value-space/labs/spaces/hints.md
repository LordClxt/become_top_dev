## Hint 1
Tu dois transformer une **valeur** en **type** : c'est le travail de `typeof` en position de type. Les clés de ce type s'obtiennent avec `keyof`.

## Hint 2
`keyof typeof themes` pour les noms ; `(typeof themes)[N]['color']` pour la couleur d'un thème donné. Pour `Settings`, `typeof defaultSettings` ; pour la classe, `typeof Temperature` (et non `Temperature`, qui désigne les instances).

## Hint 3
`Object.keys` renvoie `string[]` (types ouverts) : une assertion vers `ThemeName[]` est ici justifiée, parce que l'objet est une constante que tu contrôles ; commente-la. Pour `settings`, copie `tabs` avec `[...defaultSettings.tabs]` puis étale `overrides`.
