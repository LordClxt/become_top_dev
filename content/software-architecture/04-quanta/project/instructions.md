## archkit, épisode 5

Les quanta se comptent sur un graphe. Cet épisode donne à archkit un calculateur, un détecteur de décalages et un petit simulateur pour chiffrer le choix synchrone/asynchrone.

### `findQuanta(components, links)`
Relie deux composants par un lien `sync` ou `data` ; un lien `async` ne relie pas, et un composant de type `queue` n'appartient à aucun quantum (c'est l'infrastructure qui sépare). Un lien vers un composant inconnu lève `UnknownComponentError`. Chaque quantum est trié, la liste triée par premier membre.

### `analyze(components, links)`
- Profil de chaque quantum : pour chaque caractéristique citée par un membre, le niveau **maximal** exigé.
- `mismatches` : pour chaque lien **synchrone** et chaque caractéristique citée par l'un des deux, l'appelant exige-t-il plus que l'appelé ? (un niveau absent vaut 1). Triés par `from`, `to`, caractéristique.

### `settle(arrivalsMs, serviceMs, mode)`
Un serveur unique traite les requêtes **dans l'ordre d'arrivée**, une à la fois, en `serviceMs`.
- `{ sync: { timeoutMs } }` : une requête n'est traitée que si elle peut **finir** avant le timeout de son appelant (fin − arrivée ≤ timeout) ; sinon elle échoue sans consommer de capacité.
- `{ async: { maxQueue } }` : une requête est refusée si `maxQueue` requêtes **attendent** déjà (acceptées, pas encore commencées) au moment de son arrivée ; les autres sont toutes traitées.

Renvoie `succeeded`, `failed`, `lastCompletionMs` et `maxWaitMs` (plus longue attente avant traitement).
