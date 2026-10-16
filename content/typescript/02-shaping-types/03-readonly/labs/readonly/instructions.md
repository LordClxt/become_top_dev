## Contexte

`arraySum` vide le tableau de l'appelant avec `pop()` ; `sortedCopy` trie en place ; `rename` modifie l'utilisateur reçu. Ces effets de bord cachés produisent des bugs à distance. Tu déclares ce qui ne doit **pas** être modifié avec `readonly`, ce qui fait apparaître les mutations, et tu les corriges.

Tu édites `pure.ts`. Les tests passent des tableaux et objets **gelés** (`Object.freeze`) : une mutation lèverait une erreur.

## À faire

1. `arraySum(arr)` : paramètre `readonly number[]`, sans mutation. `triangles(n)` : les sommes cumulées `0 1 3 6 10…` des `n` premiers entiers, en s'appuyant sur `arraySum`.
2. `sortedCopy(nums)` : copie triée par ordre croissant, l'original reste intact.
3. `User.id` est en lecture seule. `rename(user, name)` accepte un `Readonly<User>` et renvoie un **nouvel** utilisateur (tags copiés).
4. `lastTwo(items)` : les deux derniers éléments sous forme de paire `readonly [string, string]`, ou `undefined` s'il y en a moins de deux.

## Contraintes

Pas de `any`, pas d'assertion qui retire `readonly`.
