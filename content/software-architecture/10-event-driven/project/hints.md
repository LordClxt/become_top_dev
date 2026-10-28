## Hint 1
Un canal = un tableau de messages prêts. Un abonnement durable n'est qu'une file nommée `topic/abonné` ; publier, c'est pousser une copie dans chacune.

## Hint 2
Pour les messages réservés, garde par consommateur une `Map` (clé canal + id) avec le canal, le message et un **numéro d'ordre de lecture**. Au plantage, trie par numéro décroissant et fais `unshift` de chacun : ils se retrouvent en tête, dans l'ordre de lecture.

## Hint 3
Pour le médiateur, utilise `Promise.allSettled` sur les tâches de l'étape qui ne sont pas encore dans `done` : ajoute à `done` celles qui ont réussi, et si l'une a échoué, persiste un état `stopped` sans incrémenter l'étape. La reprise relit cet état et continue la même boucle.
