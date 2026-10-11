## Hint 1
Sans identifiant, chaque envoi qui atteint le `COMMIT` débite. Avec identifiant, tous les envois d'une même intention n'en font qu'un ; deux clics distincts sans identifiant partagé restent deux intentions pour le serveur, d'où l'intérêt de générer l'identifiant à l'affichage du formulaire.

## Hint 2
Débit utile par partition = (1 / temps de décision) × taux d'occupation maximal. Partitions = pic / débit utile.

## Hint 3
Une contrainte stricte qui ne se compense pas passe par la partition du log ; une contrainte dont le dépassement se rattrape par un geste commercial peut être vérifiée après coup.
