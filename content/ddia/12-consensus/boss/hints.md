## Hint 1
Deux pannes tolérées : 2f + 1 votants, tous dans la zone de l'ensemble, qui se répliquent entre eux.

## Hint 2
Chaque leader de partition tient son rôle par un bail écrit dans etcd et réplique vers son propre réplica ; le routeur lit la carte des partitions.

## Hint 3
Une transaction A + B passe par le coordinateur, qui parle aux deux leaders et écrit sa décision dans un journal durable. Les leaders ne se parlent pas, et aucun bloc piège (mémoire, heuristique, opérateur) ne doit apparaître.
