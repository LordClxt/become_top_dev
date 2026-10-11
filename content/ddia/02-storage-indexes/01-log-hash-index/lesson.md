---
id: ddia-ch02-l01
title: "Le log append-only et l'index de hachage"
source: { chapter: 3, pages: "69-75" }
duration_min: 35
concepts:
  - id: ddia-log-append-only
    label: "Un log est une suite d'enregistrements en ajout seul ; l'écriture y est O(1), la lecture O(n)"
  - id: ddia-index-tradeoff
    label: "Un index accélère les lectures mais ralentit chaque écriture"
  - id: ddia-hash-index
    label: "Index de hachage en mémoire : clé → décalage (offset) dans le fichier"
  - id: ddia-segments-compaction
    label: "Segments immuables et compaction pour ne garder que la dernière valeur de chaque clé"
  - id: ddia-tombstone-recovery
    label: "Pierre tombale, checksum et reconstruction de l'index après un crash"
glossary:
  - term: "log"
    definition: "Suite d'enregistrements en ajout seul (append-only). Pas forcément lisible par un humain : il peut être binaire."
  - term: "index"
    definition: "Structure supplémentaire dérivée des données primaires, qui sert de repère pour retrouver une donnée sans tout parcourir."
  - term: "offset"
    definition: "Position en octets d'un enregistrement dans un fichier : on s'y place avec un seul seek."
  - term: "segment"
    definition: "Fichier de log fermé quand il atteint une taille donnée ; les écritures continuent dans un nouveau segment."
  - term: "compaction"
    definition: "Jeter les clés en double d'un log et ne garder que la mise à jour la plus récente de chaque clé."
  - term: "tombstone (pierre tombale)"
    definition: "Enregistrement spécial ajouté au log pour dire « cette clé est supprimée » ; la fusion de segments s'en sert pour écarter les anciennes valeurs."
  - term: "checksum"
    definition: "Somme de contrôle stockée avec l'enregistrement : elle permet de détecter une écriture partielle ou corrompue."
visuals: []
labs: [ddia-ch02-l01-lab-bitcask-design]
xp: 35
---

## Pourquoi c'est important

Tu n'écriras sans doute jamais ton propre moteur de stockage. Mais tu dois **en choisir un**, et le régler : pour cela il faut une idée de ce qu'il fait sous le capot. Cette leçon part de la base de données la plus simple possible et la fait évoluer, pas à pas, vers le moteur de Riak (Bitcask). C'est le début du fil rouge de ce cours : **Tinybase**.

## La plus simple des bases de données

Deux fonctions shell suffisent à faire un magasin clé-valeur :

```bash
db_set () { echo "$1,$2" >> database; }
db_get () { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1; }
```

`db_set` **ajoute** une ligne à la fin d'un fichier. Si tu modifies une clé, l'ancienne ligne reste : la valeur courante est la **dernière** occurrence (d'où le `tail -n 1`). C'est un **log** : une suite d'enregistrements en ajout seul (sens général, pas les journaux d'application).

- **Écrire** est excellent : ajouter à la fin d'un fichier est l'opération d'écriture la plus simple qui soit, donc très efficace.
- **Lire** est terrible : `db_get` parcourt tout le fichier. Le coût d'une recherche est **O(n)** : doubler les données double le temps.

## L'index, un compromis fondamental

Pour retrouver une clé vite, il faut une autre structure de données : un **index**. L'idée : garder à côté des **métadonnées** qui servent de repères. Un index est **dérivé** des données primaires : on peut l'ajouter ou le retirer sans changer le contenu de la base, seulement la performance des requêtes.

> **Le compromis à retenir.** Un index bien choisi accélère les lectures, mais **chaque index ralentit les écritures**, car il faut le mettre à jour à chaque écriture.

C'est pourquoi les bases n'indexent pas tout par défaut : c'est à toi de choisir, d'après tes requêtes typiques, les index qui rapportent le plus sans coût inutile.

## Index de hachage : l'approche Bitcask

Les magasins clé-valeur ressemblent au dictionnaire (hash map) de tout langage. Pourquoi ne pas l'utiliser pour indexer le disque ? Garde en **mémoire** une table de hachage qui associe chaque clé à un **offset** dans le fichier. À chaque ajout, mets la table à jour (pour une nouvelle clé comme pour une mise à jour). Pour lire : trouve l'offset dans la table, fais **un seek**, lis la valeur.

C'est essentiellement **Bitcask**, le moteur par défaut de Riak. Lectures et écritures y sont très rapides, à une condition : **toutes les clés tiennent en RAM**. Les valeurs, elles, peuvent dépasser la mémoire (un seek suffit, voire aucun accès disque si le cache du système a le bloc). Ce moteur convient quand une même clé est mise à jour très souvent, avec peu de clés distinctes : par exemple, compter les lectures de chaque vidéo de chats.

### Éviter de manquer de disque : segments et compaction

Un log qui ne fait qu'ajouter finit par saturer le disque. Solution : découper le log en **segments**. Quand un segment atteint une taille donnée, on le ferme et on écrit dans un nouveau. Puis on lance la **compaction** sur les segments figés : jeter les clés en double et **ne garder que la valeur la plus récente** de chaque clé.

Comme la compaction rend souvent les segments bien plus petits, on peut aussi **fusionner plusieurs segments** en même temps. Les segments ne sont jamais modifiés après écriture : la fusion produit un **nouveau fichier**, dans un thread d'arrière-plan, pendant que lectures et écritures continuent sur les anciens segments. Une fois terminé, on bascule les lectures vers le segment fusionné et on supprime les anciens.

Chaque segment a sa propre table de hachage. Pour lire une clé, on consulte d'abord le segment **le plus récent**, puis le précédent, et ainsi de suite. La fusion garde peu de segments à consulter.

## Les détails qui comptent en vrai

- **Format de fichier.** Le CSV est un mauvais format de log. Un format **binaire** qui encode d'abord la longueur de la chaîne en octets, puis la chaîne brute, est plus rapide et dispense d'échappement.
- **Suppression.** On ajoute un enregistrement spécial, la **pierre tombale** (*tombstone*). Lors de la fusion, elle indique de jeter toutes les valeurs précédentes de la clé.
- **Reprise après crash.** La table de hachage est perdue au redémarrage. En principe, on relit chaque segment de bout en bout en notant l'offset de la dernière valeur de chaque clé, mais c'est long. Bitcask accélère en stockant sur disque un **instantané** de chaque table.
- **Enregistrements partiels.** La base peut tomber au milieu de l'ajout d'un enregistrement. Les fichiers Bitcask contiennent des **checksums** qui permettent de détecter et d'ignorer les parties corrompues.
- **Concurrence.** Les écritures étant strictement séquentielles, un choix courant est **un seul thread d'écriture**. Les segments sont immuables, donc lisibles en parallèle.

## Pourquoi pas une mise à jour sur place ?

Un log qui ajoute semble gaspilleur : pourquoi ne pas écraser l'ancienne valeur ? Trois raisons :

1. L'ajout et la fusion sont des écritures **séquentielles**, bien plus rapides que les écritures aléatoires, surtout sur disque magnétique (et préférables, dans une moindre mesure, sur SSD).
2. La concurrence et la reprise sur crash sont **bien plus simples** si les fichiers sont immuables ou en ajout seul : pas de valeur à moitié ancienne, à moitié nouvelle.
3. La fusion évite la **fragmentation** des fichiers au fil du temps.

### Limites de l'index de hachage

- La table doit **tenir en mémoire**. Une table de hachage sur disque performe mal : beaucoup d'accès aléatoires, coûteuse à agrandir, collisions délicates.
- Les **requêtes par intervalle** sont inefficaces : on ne peut pas parcourir facilement toutes les clés entre `kitty00000` et `kitty99999`, il faut chercher chaque clé séparément.

## Pièges fréquents

- **Oublier la pierre tombale** : après un `Delete`, la clé réapparaîtrait au redémarrage parce que l'ancienne valeur est toujours dans le log.
- **Lire dans le mauvais ordre** : entre plusieurs segments, c'est le plus **récent** qui gagne.
- **Faire confiance à la fin du fichier** après un crash : sans checksum, un enregistrement tronqué est lu comme un vrai.
- **Croire que l'index de hachage gère les intervalles** : il ne gère que des recherches exactes.

## À retenir

- Un log (ajout seul) a une écriture O(1) et une lecture O(n) ; l'index répare la lecture au prix des écritures.
- Index de hachage : une table clé → offset en mémoire ; toutes les clés doivent tenir en RAM.
- Segments immuables + compaction : on garde la dernière valeur de chaque clé, sans jamais modifier un fichier.
- Pierres tombales, checksums et reconstruction de l'index rendent le moteur utilisable après un crash.
- Pas de requêtes par intervalle : c'est ce que les SSTables résolvent (leçon suivante).
