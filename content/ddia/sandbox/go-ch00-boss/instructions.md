## Contexte

Ton service reçoit des requêtes utilisateur qui déclenchent chacune des appels vers un backend. Le backend est un pool de workers FIFO. L'équipe veut répondre à une question : **combien de workers faut-il pour tenir un p99 donné ?** Tu construis le simulateur qui la tranche, en rassemblant le chapitre : file d'attente et head-of-line blocking, percentiles, amplification de la latence de queue.

## À implémenter dans `sim.go`

- **`Run(arrivals, service, workers)`** : multi-workers FIFO. Chaque requête, dans l'ordre d'arrivée, prend le worker libre le plus tôt (à égalité, le plus petit indice) et démarre à `max(arrivée, libération)`. Renvoie les temps de réponse (fin − arrivée) dans l'ordre d'entrée ; `nil` si `workers < 1` ou longueurs différentes.
- **`FanOut(calls)`** : une requête utilisateur attend le plus lent de ses appels parallèles ; sans appel, 0.
- **`Percentile(responses, p)`** : rang le plus proche, sans modifier l'entrée ; vide → 0.
- **`SlowShare(responses, threshold)`** : part des réponses **strictement** supérieures au seuil.
- **`MinWorkers(arrivals, service, target, maxWorkers)`** : plus petit nombre de workers (1 à `maxWorkers`) dont le p99 est ≤ `target`, sinon `0, false`.

## Ce que les tests racontent

Un backend où 1 appel sur 100 est lent produit des requêtes utilisateur qui sont **toutes** lentes quand chacune fait 100 appels. Et un seul worker devant 8 ms de travail toutes les 5 ms sature : il faut 2 workers.
