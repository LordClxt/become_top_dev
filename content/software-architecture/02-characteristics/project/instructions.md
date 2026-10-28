## archkit, épisode 3

« Scalable » et « élastique » se discutent mal sans chiffres. Tu vas écrire le simulateur qui les produit : la même charge, plusieurs configurations, et des résultats comparables (rejets, attente, coût).

### Modèle (un tick = une unité de temps)
1. Si une décision d'autoscaling tombe à ce tick, le nombre d'instances change.
2. Les `arrivals` du tick entrent dans la file **FIFO**.
3. Les instances servent jusqu'à `instances × capacityPerInstance` requêtes, **les plus anciennes d'abord**. L'attente d'une requête servie = tick courant − tick d'arrivée.
4. Au-delà de `maxQueue` requêtes en file, l'excédent est **rejeté**, en commençant par les plus récentes.
5. Le coût augmente de `instances × costPerInstanceTick`.
6. Avec `autoscale` : voulu = ⌈(arrivées du tick + file restante) / (capacityPerInstance × targetUtilization)⌉, borné par `min` et `max`, appliqué au tick `t + delayTicks`.

### Résultat
Les statistiques de chaque tick, les totaux servis et rejetés, le coût, et `p50Wait`/`p99Wait` calculés par `percentile` (rang le plus proche : la plus petite attente telle qu'au moins q × N requêtes ont attendu au plus autant ; 0 si rien n'a été servi).
