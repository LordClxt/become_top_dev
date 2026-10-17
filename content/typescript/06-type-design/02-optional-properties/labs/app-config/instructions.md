## Contexte

L'application de randonnée de la leçon. La configuration saisie par l'utilisateur est pleine d'optionnels ; tu la **normalises une fois** puis tout le reste du code lit une configuration complète.

Tu édites `config.ts`.

## À faire

1. `AppConfig` : `InputAppConfig` avec **toutes** les propriétés obligatoires (dérive-le).
2. `DEFAULTS` : `unitSystem: 'imperial'`, `darkMode: false`, `decimals: 1`. `normalize(input)` applique ces défauts (une valeur `undefined` explicite compte comme absente).
3. `formatHike(hike, config)` : `"3.1 mi à 2.1 mph"` en impérial, `"5.0 km à 3.3 km/h"` en métrique (1 mile = 1,609344 km), avec `config.decimals` décimales. `hike` est en miles et heures.
4. `describeConfig(config)` : `"impérial, thème clair, 1 décimale(s)"` / `"métrique, thème sombre, 2 décimale(s)"`.

## Contraintes

`formatHike` et `describeConfig` prennent un `AppConfig` : aucun `??` ni test d'`undefined` dans ces deux fonctions.
