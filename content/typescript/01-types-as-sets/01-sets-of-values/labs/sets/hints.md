## Hint 1
Une union de littéraux s'écrit `'mon' | 'tue' | …`. Pour `Person`, demande-toi quelle opération sur les ensembles garde seulement ce qui appartient à `Named` et à `Aged`.

## Hint 2
Un prédicat de type s'écrit `(day: Day): day is Weekend`. Pour les clés, `keyof A & keyof B` est l'intersection des ensembles de clés, `keyof A | keyof B` l'union.

## Hint 3
`T extends U ? never : T` appliqué à une union est évalué membre par membre : les membres inclus dans `U` donnent `never` (l'ensemble vide disparaît de l'union), les autres restent. Pour `swap`, `readonly [number, number]` impose exactement deux éléments.
