## Hint 1
Le serveur d'application ne parle qu'au routeur. Le routeur envoie les écritures au leader et lit sur le follower asynchrone ; il ne réplique rien lui-même.

## Hint 2
Le synchrone doit rester proche du leader : 85 ms d'aller-retour vers Montréal s'ajouteraient à chaque écriture. Pose les blocs dans leur zone (propriété « parent »).

## Hint 3
Nouveau follower : le leader écrit le snapshot, le follower le lit, puis le leader lui réplique la suite du log depuis la position du snapshot. Pour l'entrepôt, le leader alimente le lecteur du log logique, qui écrit dans l'entrepôt.
