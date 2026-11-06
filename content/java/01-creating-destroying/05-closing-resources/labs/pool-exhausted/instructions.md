## Le ticket

> **Astreinte — priorité haute.** « Toutes les 3 ou 4 heures, le service de commandes tombe en `PoolExhaustedException` : les 5 connexions sont prises alors que le trafic est faible. Un redémarrage règle le problème jusqu'à la fois suivante. Aucune erreur dans les logs avant la panne. »
>
> Et une remarque d'un collègue, sans lien apparent : « Hier, le tableau de bord affichait `available = 6` sur un pool de 5. J'ai cru à un bug d'affichage. »

Le code est dans `ConnectionPool.java`, `Connection.java`, `Retry.java` et `OrderRepository.java`. `Database` et les deux exceptions sont fournies. En production, la base renvoie une `QueryFailedException` transitoire sur environ 1 % des requêtes.

## Ta mission

1. **Reproduis** chaque symptôme avant de modifier quoi que ce soit : quelle suite d'appels l'amène ? Écris-la (sur papier ou dans un `main` jetable).
2. **Trouve la cause racine** de chacun. Il y en a deux, dans deux fichiers différents.
3. **Corrige** sans changer l'API publique. Les réessais doivent continuer à fonctionner : une panne transitoire ne doit pas remonter à l'appelant.

Les tests décrivent le comportement attendu. Ils ne te disent pas où est le bug.

Dans le débriefing, explique en une phrase par symptôme la cause, et pourquoi **aucune erreur** n'apparaissait dans les logs.
