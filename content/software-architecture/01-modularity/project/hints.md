## Hint 1
Commence par une table `chemin → package` des fichiers connus : elle sert à la fois à regrouper et à ignorer les imports externes.

## Hint 2
Pour chaque package, garde deux `Set` : les packages qu'il importe et ceux qui l'importent. Un `Set` règle tout seul le problème des dépendances comptées plusieurs fois.

## Hint 3
Pour LCOM, un union-find suffit : retiens pour chaque champ la première méthode qui l'utilise, et unis chaque méthode suivante avec elle. Les racines finales sont les groupes.
