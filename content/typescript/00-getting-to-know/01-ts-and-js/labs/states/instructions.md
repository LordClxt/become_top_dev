## Contexte

Ce fichier est du JavaScript parfaitement valide… avec une faute de frappe cachée dans les données : `capitol` au lieu de `capital`. À l'exécution, rien ne plante, on obtient simplement `undefined`. Tu vas laisser **le vérificateur de types** la trouver, en lui disant ce que tu veux.

Tu édites `states.ts`.

## À faire

1. Déclare et **exporte** `interface State { name: string; capital: string }`, puis annote `states` avec `State[]`. Lis l'erreur de `tsc` : elle désigne la bonne ligne et propose la bonne correction. Corrige la donnée.
2. `capitals(list)` renvoie la capitale de chaque État, dans l'ordre.
3. `byCapital(list, capital)` renvoie l'État dont la capitale correspond **sans tenir compte de la casse**, ou `undefined`.

Type les paramètres et les retours : les tests vérifient les types avec `tsc --strict`, pas seulement les valeurs.

## Contraintes

Pas de `any`, pas d'assertion `as`. Les tests de types refusent aussi qu'on écrive `capitol` dans un `State`.
