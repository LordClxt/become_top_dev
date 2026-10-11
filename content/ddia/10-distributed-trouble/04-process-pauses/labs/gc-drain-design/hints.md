## Hint 1
Pour qu'un nœud puisse être retiré du trafic, aucune requête ne doit l'atteindre sans passer par le répartiteur.

## Hint 2
L'avertissement « GC imminent » va du nœud vers le répartiteur, et le nœud n'attend pas de réponse : flèche asynchrone.

## Hint 3
Pose trois nœuds, relie chacun au répartiteur dans les deux sens (requêtes et avertissement), au redémarrage roulant et à la base. Le swap et le disque réseau sont des pièges.
