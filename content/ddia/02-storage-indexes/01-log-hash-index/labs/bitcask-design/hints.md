## Hint 1
Trois chemins à dessiner : l'écriture (application → segment actif), la lecture (application → index → segments), et la compaction (segments fermés → segment fusionné).

## Hint 2
L'application ne lit jamais un segment directement : c'est l'index, en mémoire, qui sait où se trouve la valeur (segment + offset).

## Hint 3
La compaction ne lit que des segments **fermés** : le segment actif reçoit encore des écritures, on n'y touche pas.
