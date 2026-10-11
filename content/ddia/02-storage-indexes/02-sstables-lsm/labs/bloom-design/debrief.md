**Un filtre de Bloom troque de la mémoire contre des lectures évitées.** Il ne produit jamais de faux négatif : « absent » est certain, « présent » est seulement probable. Avec 10 bits par clé et 7 hachages, le taux de faux positifs tombe à **0,82 %**, pour 1,25 Mo de RAM par million de clés.

Règle pratique : `k ≈ 0,69 × bits par clé`. En dessous du bon `k`, on laisse passer des clés ; au-dessus, on remplit trop de bits et on dégrade aussi la précision. Un filtre bien réglé évite la grande majorité des lectures de segments pour les clés absentes.
