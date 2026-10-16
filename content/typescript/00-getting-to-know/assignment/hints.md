## Hint 1
Une valeur `unknown` n'autorise aucune opération tant que tu ne l'as pas testée. Commence par une petite fonction `isRecord(raw): raw is Record<string, unknown>` et par un helper qui lit une chaîne non vide dans un objet.

## Hint 2
`switch (raw.type)` sur un `Record<string, unknown>` ne t'affine rien, mais chaque `case` te permet de construire le bon objet champ par champ, avec des valeurs que tu as déjà validées.

## Hint 3
Pour `summarize`, un `Set<string>` d'identifiants actifs règle le doublon et la suppression ; un `switch (event.type)` sur l'union taguée affine `event` dans chaque branche.
