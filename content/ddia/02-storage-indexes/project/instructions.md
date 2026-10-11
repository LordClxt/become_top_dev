## Contexte

Tinybase a maintenant un vrai moteur de stockage. Tu assembles la leçon 1 et la leçon 2 : un log **segmenté**, un **index de hachage** en mémoire (clé → segment + offset), la **reprise sur crash** par rejeu, et la **compaction**. Le « disque » est un `Dir` (`map[string][]byte`) : un fichier par segment, nommés `seg-000001.log`, `seg-000002.log`, etc.

Les fonctions `encode`, `decode`, `segName` et `segID` sont fournies (même format que le TP Bitcask : CRC, longueurs, pierre tombale).

## Jalon 1 — Écrire, lire, rejouer
`Open(dir, opts)` rejoue les segments dans l'ordre. Sans segment, crée `seg-000001.log` (vide). Le plus récent segment est l'**actif** ; `Set` y ajoute un enregistrement. `Delete` ajoute une pierre tombale si la clé est vivante. Une fin de segment actif invalide est tronquée (on renvoie le nombre d'octets retirés).

## Jalon 2 — Faire tourner les segments
Quand le segment actif atteint `MaxSegmentBytes` après une écriture, il est **fermé** et le segment d'identifiant + 1 devient actif. L'index mémorise le segment de chaque clé. Un enregistrement invalide dans un segment **fermé** est une vraie corruption : `ErrCorrupt`.

## Jalon 3 — Compacter
`Compact` fusionne **tous** les segments fermés (il en faut au moins 2) en un seul, avec les seules valeurs courantes de ces segments. Le fichier fusionné prend l'identifiant du plus récent segment fermé ; les autres sont supprimés. Le segment actif n'est pas touché. `Stats` donne le nombre de segments, de clés vivantes et d'octets sur disque.

## Pourquoi c'est correct de perdre les pierres tombales

Tu fusionnes **tous** les segments fermés : plus aucun segment fermé plus ancien ne peut contenir une version de la clé. Une pierre tombale du segment actif, elle, doit rester : elle masque la valeur du segment fusionné.
