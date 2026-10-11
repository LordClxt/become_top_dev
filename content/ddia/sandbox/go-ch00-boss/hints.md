## Hint 1
Dans `Run`, garde un tableau `free[w]` : l'instant où chaque worker redevient libre. Pour chaque requête, cherche l'indice du plus petit `free`.

## Hint 2
Le worker choisi démarre à `max(arrival, free[w])`, finit à `start + service[i]` ; mets `free[w]` à jour et stocke `fin − arrival`.

## Hint 3
`MinWorkers` boucle sur `w` de 1 à `maxWorkers`, appelle `Run` puis `Percentile(…, 99)` et s'arrête au premier qui convient. Réutilise `Percentile` partout au lieu de recopier le tri.
