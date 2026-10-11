## Contexte

Ton équipe hésite : « Notre test de charge dit que tout va bien, mais les utilisateurs se plaignent. » Tu vas construire un petit simulateur qui montre pourquoi, puis un vérificateur de SLO.

## À implémenter dans `queue.go`

1. **`OpenLoop(arrivals, service)`** : un serveur unique FIFO. Chaque requête démarre à `max(arrivée, serveur libre)`. Le temps de réponse est `fin − arrivée`. Longueurs différentes → `nil`.
2. **`ClosedLoop(service)`** : un client qui attend chaque réponse n'a jamais de file : le temps de réponse est le temps de service (renvoie une copie).
3. **`Summarize(responses)`** : moyenne, p50, p95, p99 (rang le plus proche : `ceil(p/100 × n)`) et maximum, sans modifier l'entrée.
4. **`Violations(summary, slo)`** : les objectifs (`"p50"`, `"p99"`) dépassés **strictement**, slice vide non nil si tout va bien.

## Exemple

Arrivées `0, 10, 20, 30, 40, 50` (ms), durées `5, 5, 100, 5, 5, 5`. En boucle ouverte, les réponses valent `5, 5, 100, 95, 90, 85` : trois requêtes de 5 ms ont attendu la lente. En boucle fermée, `5, 5, 100, 5, 5, 5` : la médiane est de 5 ms au lieu de 85, et l'attente a disparu des mesures.

## Pour la revue

Rédige en commentaire de `Summarize` deux phrases : pourquoi la moyenne de cet exemple (63 ms) ne décrit aucun utilisateur réel.
