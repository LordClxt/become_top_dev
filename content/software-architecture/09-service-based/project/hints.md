## Hint 1
Garde, pour la transaction en cours, une `Map<table, Map<id, ligne | marqueur de suppression>>` et une `Map` des séquences. `get` regarde d'abord ces écritures en attente, puis la base. Au commit, recopie-les dans la base ; en cas d'exception, il suffit de ne rien recopier.

## Hint 2
Utilise `structuredClone` pour ne jamais renvoyer ni stocker une référence partagée avec l'appelant. Un drapeau « transaction en cours », remis à faux dans un `finally`, détecte l'imbrication.

## Hint 3
Pour l'impact, construis l'index inverse table → bibliothèques, puis l'ensemble des bibliothèques changées, puis filtre les services. La moyenne : appelle `redeployImpact` pour chaque table et divise par le nombre de tables.
