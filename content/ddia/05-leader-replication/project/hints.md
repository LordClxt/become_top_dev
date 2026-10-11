## Hint 1
Indice d'une position dans le log : l'entrée de LSN `p` est à `log[p - base - 1]`, donc les entrées après `lsn` commencent à `log[lsn - base]`. Pour copier : `append([]Entry(nil), …)` et `maps.Clone`.

## Hint 2
Dans `Apply`, vérifie l'époque **une fois**, avant la boucle : c'est l'époque de l'**envoyeur** qui compte, pas celle des entrées (le nouveau leader renvoie des entrées écrites par l'ancien, avec l'ancienne époque, et c'est normal).

## Hint 3
`Promote` : parcours les followers pour vérifier les époques et trouver le plus avancé (comparaison stricte, pour garder le premier à égalité), puis mets `epoch` à tous et construis `&Leader{epoch, base, copie du log, copie des données}`. Pour le routeur, une petite fonction `remember(user, lsn)` qui ne fait qu'augmenter `seen[user]` sert à la fois à `Write` et à `Read`.
