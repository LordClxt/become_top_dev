**« Petite » est une question de multiplication.** Diffuser 40 Go de produits à 1 500 tâches map, c'est lire 60 000 Go : vingt fois plus que le shuffle de la jointure côté reduce (3 040 Go), et 40 Go ne tiennent de toute façon pas dans un mapper de 8 Go. Les 20 Mo de catégories, eux, ne coûtent que 30 Go diffusés : broadcast sans hésiter.

La console star porte 12 % de 2 milliards d'événements : 248,8 millions de lignes pour un seul reducer sur 200. En étalant cette clé sur au moins 22 reducers (et en répliquant sa fiche produit sur chacun), le plus chargé tombe sous 20 millions.

Le workflow lit des entrées immuables (logs, instantané), écrit une base neuve, la contrôle, puis la publie d'un bloc ; il est rejouable parce que tout ce qui pourrait varier (date de référence, graine, ordre) est fixé par le job.
