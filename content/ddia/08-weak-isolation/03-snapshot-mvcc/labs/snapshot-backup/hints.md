## Hint 1
En snapshot isolation, les lecteurs ne bloquent jamais les écrivains : la sauvegarde peut lire la base de production directement.

## Hint 2
La sauvegarde et le contrôle **lisent** la base ; le service et le ramasse-miettes y **écrivent**. La sauvegarde écrit sa copie dans le stockage des sauvegardes.

## Hint 3
Aucun verrou global ni copie de fichiers à chaud : l'instantané MVCC suffit à rendre la copie cohérente.
