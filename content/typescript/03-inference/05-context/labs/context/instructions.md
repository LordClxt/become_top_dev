## Contexte

Un module de carte interactive. Quelqu'un a « nettoyé » le code en extrayant des valeurs dans des constantes, et **tsc ne compile plus** : chaque extraction a fait perdre un contexte de typage. Tu rétablis les types sans changer les valeurs, puis tu termines deux fonctions.

Tu édites `map.ts`. Les fonctions de l'API (`setLanguage`, `panTo`, `addLayer`, `onClick`) peuvent changer de signature seulement si elles ne modifient pas leurs arguments (`readonly`).

## À faire

1. `language` : fais compiler `setLanguage(language)`.
2. `HOME` reste en `as const` : modifie la **signature** de `panTo` pour l'accepter.
3. `cities` : fais compiler `addLayer(cities)` (une annotation ou `satisfies`).
4. `logClick` : donne-lui un type de fonction pour qu'il compile.
5. `history()` renvoie la liste des positions passées à `panTo`, dans l'ordre (copie). `distance(a, b)` renvoie la distance euclidienne entre deux positions, arrondie au centième.

## Contraintes

Pas de `any`, pas d'assertion `as` (hors du `as const` existant).
