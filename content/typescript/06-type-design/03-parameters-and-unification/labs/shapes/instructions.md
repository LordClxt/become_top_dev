## Contexte

Une petite bibliothèque SVG et un tableau d'honneur d'école. Les signatures d'origine enchaînent les paramètres du même type ; tu les remplaces par des **types nommés** et des **objets de paramètres**. Les lignes d'étudiants restent en `snake_case` : pas de deuxième type, pas de conversion.

Tu édites `shapes.ts`.

## À faire

1. `rect({ topLeft, size, opacity })` → `'<rect x="25" y="50" width="75" height="100" opacity="1"/>'` (`opacity` vaut `1` par défaut).
2. `line(from, to)` (deux `Point`, ordre naturel) → `'<line x1="0" y1="0" x2="10" y2="5"/>'`.
3. `overlaps(a, b)` : deux `Interval` (`{ start, end }`, bornes incluses) se chevauchent-ils ? (commutatif : deux paramètres positionnels conviennent).
4. `honorRoll(rows, minAverage)` : les étudiants dont la moyenne de `scores` est au moins `minAverage`, au format `"NOM Prénom (moyenne)"` avec une décimale, triés par moyenne décroissante. Les lignes gardent leurs noms de colonnes `first_name`, `last_name`.

## Contraintes

Aucune fonction n'a plus de deux paramètres du même type à la suite. Pas de type `Student` en camelCase.
