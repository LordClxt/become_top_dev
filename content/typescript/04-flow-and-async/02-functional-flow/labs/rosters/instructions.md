## Contexte

Des effectifs de basket arrivent en CSV. Tu écris l'analyse en style **fonctionnel** : chaque étape produit une nouvelle valeur, et les types sont déduits de bout en bout. Les tests vérifient les valeurs et les types de retour inférés.

Tu édites `rosters.ts`.

## À faire

1. `parseCSV(csv)` : la première ligne donne les en-têtes ; chaque ligne suivante devient un objet `{ [colonne]: valeur }` (`Object.fromEntries`). Les lignes vides sont ignorées. Retour inféré : `{ [k: string]: string }[]`.
2. `toPlayers(rows)` : convertit chaque ligne en `Player` (`salary` en nombre).
3. `allPlayers(rosters)` : tous les joueurs de toutes les équipes, en une expression.
4. `bestPaidByTeam(players)` : une `Map` équipe → nom du joueur le mieux payé (`Map.groupBy`, `toSorted`). Ne modifie pas `players`.
5. `payroll(players)` : un objet équipe → masse salariale (`Object.fromEntries`).

## Contraintes

Pas de `for`, pas de `forEach`, pas d'objet vide rempli à la main : uniquement des expressions.
