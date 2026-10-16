## Contexte

Les objets d'options sont partout, et c'est là que les deux contrôles de TypeScript brillent : le **contrôle des propriétés en trop** sur les littéraux et la règle des **types faibles**. Tu modèles trois API et tu laisses les tests de types vérifier que les fautes de frappe sont bien refusées.

Tu édites `options.ts`.

## À faire

1. `WindowOptions` (`title` obligatoire, `darkMode` et `width` optionnels) et `WindowSpec` (tout obligatoire). `createWindow` complète : `darkMode: false`, `width: 800` par défaut.
2. `ChartOptions` : trois booléens optionnels (`logscale`, `invertedYAxis`, `areaChart`). `describeChart` renvoie `'standard'` sans option active, sinon les noms actifs joints par `+`, dans l'ordre ci-dessus.
3. `Labelled` : `title` obligatoire, mais d'autres propriétés tolérées (signature d'index). `titleOf` renvoie le titre.

## Contraintes

Pas de `any`. Les tests de types exigent que `createWindow({ title: 'x', darkmode: true })` soit refusé, et qu'une variable `{ logScale: true }` ne passe pas pour un `ChartOptions`.
