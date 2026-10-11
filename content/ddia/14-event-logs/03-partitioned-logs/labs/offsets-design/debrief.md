**Un log partitionné est un grand tampon circulaire dont chaque consommateur tient sa propre position.** 4 To à 25 Mo/s, c'est 160 000 s, environ 44 heures de rétention : de quoi réparer un consommateur pendant un week-end, à condition de surveiller son **retard** (63 500 − 45 500 = 18 000 messages sur la partition 2, résorbés en 60 s à 300 messages/s nets).

Le parallélisme d'un groupe se planifie en **partitions** : avec 6 partitions, 9 consommateurs ne font pas mieux que 6, soit 30 000 messages/s. Et parce que seul l'offset validé est retenu, un crash fait retraiter les 1 500 messages entre 86 000 et 87 499 : le traitement doit tolérer les doublons.

Enfin, lire ne détruit rien : on corrige le code, on repart des offsets de 14 h, on reconstruit une sortie neuve et on bascule après comparaison. C'est le confort du traitement par lots, avec la latence d'un broker.
