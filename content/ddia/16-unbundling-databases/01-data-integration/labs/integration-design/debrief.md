**Sans ordre commun, deux systèmes divergent sans le dire** : la base finit à 45 €, l'index à 50 €, et rien ne lève d'erreur. En faisant passer les changements par un log ordonné (CDC), l'index applique le même ordre que la base et converge forcément.

Le prix de cette approche, c'est le **retard** : 10 minutes de panne laissent 900 000 changements en attente, rattrapés en 900 000 / (2 000 − 1 500) = 30 minutes. Si l'on exige de relire immédiatement ses écritures, il faut une transaction distribuée, avec son couplage. Pour tout le reste (isolation des pannes, nouveaux abonnés, systèmes hétérogènes), le log gagne.

Enfin, l'ordre total n'existe que si un seul nœud voit tout. Dès qu'on partitionne, qu'on géo-distribue, qu'on découpe en services ou qu'on travaille hors ligne, il faut se contenter de la **causalité**, par exemple en enregistrant l'état lu avec la décision.
