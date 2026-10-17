## Contexte

Un tableau de bord affiche la météo de plusieurs villes. Le service (`weatherService.get`) est lent pour certaines villes et échoue pour d'autres, parfois de façon passagère. Tu écris le chargement asynchrone et l'agrégation, en laissant les types circuler.

Tu édites `weather.ts`.

## À faire

1. `retry(task, attempts)` : appelle `task()` jusqu'à `attempts` fois tant qu'elle rejette ; renvoie le premier succès, sinon rejette avec la **dernière** erreur. Type de retour : `Promise<T>`.
2. `loadAll(cities, timeoutMs)` : lance toutes les villes **en parallèle** ; chaque ville a droit à 2 tentatives (`retry`) et doit répondre en moins de `timeoutMs` (au total, tentatives comprises). Renvoie `{ readings, failed }` : les relevés obtenus (dans l'ordre de `cities`) et les villes en échec (dans l'ordre aussi).
3. `averageByCountry(readings)` : un objet pays → température moyenne arrondie à 0,1 °C.
4. `hottest(readings)` : le relevé le plus chaud, ou `undefined` ; ne modifie pas `readings`.

## Contraintes

Pas de `any`, pas de callback imbriqué, pas d'objet vide rempli dans une boucle.
