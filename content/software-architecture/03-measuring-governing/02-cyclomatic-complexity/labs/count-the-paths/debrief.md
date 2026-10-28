**A = 6** (if, for, ternaire, if, `||`), **B = 5** (quatre `case`, le `default` ne compte pas), **C = 4** (while, catch, `??`) ; le graphe de C le confirme : 9 − 7 + 2 = 4. La CC donne aussi le nombre minimal de tests pour exécuter chaque chemin de base : 6 pour A.

Pour `computeTax`, la complexité est **accidentelle** : des taux sont des **données**. Les sortir dans une table fait tomber la CC et rend chaque taux vérifiable. Couper la fonction en quatre déplacerait la complexité sans la réduire.
