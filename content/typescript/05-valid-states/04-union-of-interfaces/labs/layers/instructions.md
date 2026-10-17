## Contexte

La bibliothèque de dessin de la leçon et une fiche biographique. Leurs types actuels autorisent des combinaisons absurdes. Tu les retournes en **unions d'interfaces** et en **optionnels groupés**, puis tu écris les fonctions qui en profitent.

Tu édites `layers.ts`.

## À faire

1. `Layer` : une union de `FillLayer`, `LineLayer` et `PointLayer`, taguées par `type` (`'fill'`, `'line'`, `'point'`), chacune avec son `layout` et son `paint`.
2. `describeLayer(layer)` : `"remplissage #ff0000 (opacité 0.5)"`, `"ligne #00f de 2px, bouts round"`, `"points de rayon 4 #0f0"` (switch exhaustif).
3. `Person` : `name` et un `birth` optionnel qui regroupe `place` et `date`.
4. `eulogize(person)` : `"Alan est né le 1912-06-23 à London."` (date ISO `AAAA-MM-JJ`) ou `"Alan."` sans naissance.
5. `fromApi(raw)` : convertit la forme plate de l'API (`placeOfBirth?`, `dateOfBirth?` en chaîne ISO) en `Person`. Si **un seul** des deux est présent, lève une `Error("naissance incomplète")`.

## Contraintes

Pas de `any`, pas d'assertion `as`.
