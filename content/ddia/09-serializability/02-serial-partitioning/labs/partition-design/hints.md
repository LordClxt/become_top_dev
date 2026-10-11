## Hint 1
L'application ne connaît pas les partitions : elle passe par le routeur.

## Hint 2
Une transaction qui touche plusieurs partitions ne peut pas être exécutée par une seule d'entre elles : le routeur la confie au coordinateur, qui l'exécute sur les partitions concernées.

## Hint 3
Les réplicas reçoivent les procédures par une flèche de réplication ; les rapports lisent les réplicas, jamais les partitions.
