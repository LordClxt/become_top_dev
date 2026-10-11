## Hint 1
Commence par les deux zones, puis mets dans chacune un leader et son suiveur. Les utilisateurs restent hors des zones.

## Hint 2
Les utilisateurs appellent leur leader local (flèche synchrone) ; chaque leader réplique vers son suiveur (flèche de réplication).

## Hint 3
Entre les deux leaders, il faut une flèche asynchrone **dans chaque sens**. Un verrou global ou une séquence partagée imposeraient un aller-retour entre sites à chaque écriture.
