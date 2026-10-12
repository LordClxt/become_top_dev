## Hint 1
Le routeur est le seul point qui connaît le LSN de la dernière écriture de l'utilisateur.

## Hint 2
Deux chemins de lecture vers le leader et les followers : le routeur choisit selon la position.

## Hint 3
Le LSN vit dans un store partagé, pas dans l'appareil : c'est ce qui rend la garantie valable entre appareils.
