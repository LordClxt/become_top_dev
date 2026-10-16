## Hint 1
Détecteur : garde les `window` derniers intervalles entre battements. Timeout = ceil(moyenne + k × écart-type de la population), jamais sous `min` ; tant qu'il y a moins de 2 intervalles, renvoie `min`.

## Hint 2
Lamport : `tick` fait +1 ; `receive(remote)` prend max(local, remote) + 1. Pour LWW, à horodatage égal, départage par l'identifiant de nœud le plus grand.

## Hint 3
Intervalles : a est sûrement avant b si a.latest < b.earliest ; ils se chevauchent si aucun n'est avant l'autre. Commit-wait : attends que latest soit sûrement passé.

## Hint 4
Baux : un bail libre ou expiré (now ≥ expiration) donne un NOUVEAU jeton ; le titulaire qui redemande à temps garde le même. Le stockage retient le plus grand jeton vu et rejette les plus petits.
