## Hint 1
Deux options de `NestFactory.create` sont en jeu : l'une change l'**ordre d'enregistrement** des routes, l'autre décide quoi faire des **conflits**.

## Hint 2
`routeResolutionStrategy: 'specificity'` et `routeConflictPolicy: { duplicate: 'error', shadow: 'error' }`. Lance les tests : l'erreur de démarrage te dit exactement quelle route est déclarée deux fois, et par quels contrôleurs.

## Hint 3
`AdminController` est monté sous `books` et redéclare `GET /books/stats`. Change son préfixe en `admin` : sa route devient `GET /admin/stats`.
