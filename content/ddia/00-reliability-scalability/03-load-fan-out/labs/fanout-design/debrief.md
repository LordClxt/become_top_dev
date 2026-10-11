**Le coût du fan-out se mesure en nombres, pas en intuitions.** Préparer à l'écriture coûte `4 600 × 75 = 345 000` écritures/s ; assembler à la lecture coûte `300 000 × 75 = 22,5 millions` de recherches/s. Avec 65 lectures pour une écriture, le premier choix gagne.

Mais la **moyenne cache la distribution**. Un compte à 30 millions d'abonnés déclenche 30 millions d'écritures d'un seul tweet. D'où l'approche hybride : le fan-out pour la majorité, la fusion à la lecture pour les quelques cas extrêmes. Le seuil se règle sur la distribution des abonnés, pas sur sa moyenne.

Le paramètre de charge décisif de cet exemple n'est donc ni le débit d'écriture, ni le débit de lecture, mais **la distribution du nombre d'abonnés**.
