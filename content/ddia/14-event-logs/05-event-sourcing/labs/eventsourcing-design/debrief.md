**L'état n'est qu'une accumulation du log.** 300 − 85 − 85 + 50 − 12 + 12 = 180 € : la correction des frais n'efface rien, elle **compense**, comme dans un livre de comptes. Et c'est pour cela qu'on ne compacte pas un event store : « Crédité 50 » ne remplace pas « Crédité 300 ». On stocke des instantanés pour démarrer vite, pas pour jeter l'historique.

Une **commande** peut échouer, un **événement** est un fait : la double vente de F12 se règle **avant** le log, par une validation synchrone (un seul consommateur des commandes d'un concert, ou une transaction). Une fois écrit, l'événement est lu par toutes les vues (plan de salle, hésitations, chiffre d'affaires), qu'on ajoute ou remplace sans migration.

Le prix : 4 000 × 30 × 60 = 7,2 millions d'événements pour 4 000 places vivantes, et des données personnelles qu'un simple événement de plus ne retire pas. Il faut réécrire l'historique et reconstruire les vues, en sachant que des copies peuvent subsister.
