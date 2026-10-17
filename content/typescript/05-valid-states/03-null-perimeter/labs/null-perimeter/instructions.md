## Contexte

Un petit module de statistiques et un profil utilisateur. Le code d'origine dispersait les `null` (min et max séparés, champs de classe remplis plus tard) et contenait le bug du `0`. Tu repousses les `null` au périmètre.

Tu édites `stats.ts`.

## À faire

1. `extent(nums)` : `[min, max]` ou `null` si l'itérable est vide. `0` est une valeur comme une autre.
2. `range(nums)` : `max - min`, ou `null` (utilise `extent`, un seul test).
3. `Profile` : une classe dont `user` et `posts` ne sont **jamais** nuls. Le constructeur les reçoit ; `Profile.load(userId, api)` charge les deux **en parallèle** et construit l'objet.
4. `profile.summary()` : `"Ada (2 billets)"`. `profile.latestTitle()` : le titre du billet le plus récent (`publishedAt` le plus grand), ou `null` s'il n'y en a pas.

## Contraintes

Aucun champ nullable dans `Profile`. Pas de `!`.
