---
id: ddia-ch03-l04
title: "Ordre de tri et écritures dans un stockage en colonnes"
source: { chapter: 3, pages: "99-101" }
duration_min: 30
concepts:
  - id: ddia-column-sort-order
    label: "On trie une ligne entière à la fois, selon des colonnes choisies d'après les requêtes fréquentes"
  - id: ddia-sort-compression
    label: "Le tri crée de longues séquences répétées dans la première colonne de tri : le RLE la réduit à presque rien"
  - id: ddia-multiple-sort-orders
    label: "Plusieurs ordres de tri sur des copies différentes des données (C-Store, Vertica)"
  - id: ddia-column-writes
    label: "Écrire dans un stockage en colonnes : mémoire triée puis fusion en bloc, comme un LSM-tree"
glossary:
  - term: "clé de tri"
    definition: "Colonne (ou suite de colonnes) selon laquelle les lignes sont triées dans un stockage en colonnes, choisie par l'administrateur d'après les requêtes courantes."
  - term: "ordre de tri multiple"
    definition: "Plusieurs copies des mêmes données triées différemment, tirant parti de la réplication nécessaire de toute façon (C-Store, Vertica)."
  - term: "mise à jour sur place"
    definition: "Écrire une valeur à son emplacement existant ; impossible avec des colonnes compressées et triées."
visuals: []
labs: [ddia-ch03-l04-lab-sortorder-design]
xp: 30
---

## Pourquoi c'est important

Le stockage en colonnes pose deux questions concrètes. D'abord : dans quel ordre ranger les lignes ? Ce choix décide à la fois de la vitesse des requêtes et de la compression. Ensuite : comment écrire, alors que chaque insertion touche des dizaines de fichiers compressés ? La réponse à la seconde question, tu la connais déjà.

## Quel ordre pour les lignes ?

Dans un stockage en colonnes, l'ordre des lignes n'a pas besoin d'être particulier. Le plus simple est l'ordre d'insertion : ajouter une ligne revient à ajouter une valeur à la fin de chaque fichier de colonne. On peut toutefois **imposer un ordre**, comme pour une SSTable, et s'en servir comme **mécanisme d'indexation**.

**Interdit : trier chaque colonne séparément.** On ne saurait plus quelles valeurs appartiennent à la même ligne, et on ne pourrait plus reconstituer une ligne avec « la k-ième valeur de chaque colonne ». On trie donc **une ligne entière à la fois**, même si le stockage reste en colonnes.

L'administrateur choisit les colonnes de tri d'après les requêtes courantes. Si les requêtes ciblent souvent des plages de dates (le dernier mois), `date_key` en première clé permet de ne balayer que les lignes du mois, ce qui est bien plus rapide. Une deuxième clé départage les lignes qui ont la même première valeur : avec `product_sk` en deuxième, toutes les ventes d'un même produit un même jour sont regroupées, ce qui aide les requêtes qui filtrent ou regroupent par produit dans une plage de dates.

## Le tri aide la compression

Si la première colonne de tri a peu de valeurs distinctes, le tri produit de **longues séquences** de la même valeur. Un simple RLE, comme celui des bitmaps, peut réduire cette colonne à quelques kilooctets, même avec des milliards de lignes.

L'effet est le plus fort sur la **première clé**. La deuxième et la troisième sont plus mélangées : elles ont moins de longues séquences, donc se compressent moins bien. Les colonnes plus loin dans la priorité de tri apparaissent presque au hasard et se compressent peu. Avoir quelques premières colonnes triées reste un gain net.

## Plusieurs ordres de tri

Une extension astucieuse, introduite dans C-Store et adoptée par l'entrepôt commercial Vertica : des requêtes différentes profitent d'ordres différents, alors **pourquoi ne pas stocker les mêmes données triées de plusieurs façons** ? Il faut de toute façon répliquer les données sur plusieurs machines pour ne pas les perdre en cas de panne. Autant que ces copies soient triées différemment : au moment de la requête, on utilise la version la mieux adaptée.

Cela ressemble à avoir plusieurs index secondaires dans un stockage orienté lignes, avec une grande différence : le stockage par lignes garde **chaque ligne à un seul endroit** (heap file ou index clustered) et les index secondaires pointent vers elle. Dans un stockage en colonnes, il n'y a normalement **pas de pointeurs** vers des données ailleurs : seulement des colonnes contenant des valeurs.

## Écrire dans un stockage en colonnes

Ces optimisations ont du sens en entrepôt, où l'essentiel de la charge est constitué de grosses requêtes en lecture seule. Mais elles rendent les écritures **plus difficiles**.

Une **mise à jour sur place**, comme dans un B-tree, est impossible avec des colonnes compressées. Insérer une ligne au milieu d'une table triée obligerait à **réécrire tous les fichiers de colonnes**. Comme les lignes sont identifiées par leur position dans la colonne, l'insertion doit mettre à jour toutes les colonnes de façon cohérente.

La solution est celle de la première moitié du chapitre : le **LSM-tree**. Toute écriture va d'abord dans un **stockage en mémoire**, où elle est ajoutée à une structure triée et préparée pour l'écriture sur disque. Peu importe que ce stockage soit orienté lignes ou colonnes. Quand assez d'écritures se sont accumulées, elles sont **fusionnées avec les fichiers de colonnes** et écrites en bloc dans de nouveaux fichiers. C'est essentiellement ce que fait Vertica.

Les requêtes doivent examiner à la fois les colonnes sur disque et les écritures récentes en mémoire, puis combiner les deux. L'optimiseur masque cette distinction : pour un analyste, une donnée modifiée est visible immédiatement.

## Pièges fréquents

- **Trier chaque colonne indépendamment** : la position ne désigne plus la même ligne.
- **Attendre le même gain de compression sur toutes les colonnes** : seule la première clé de tri se compresse fortement.
- **Choisir la clé de tri sans regarder les requêtes** : le bon ordre dépend de ce que les analystes filtrent le plus.
- **Oublier la mémoire** : après une écriture, la donnée n'est pas encore dans les fichiers de colonnes ; la requête doit consulter aussi le tampon en mémoire.

## À retenir

- On trie des lignes entières, jamais des colonnes isolées.
- Première clé de tri = meilleure compression par RLE ; les suivantes de moins en moins.
- Plusieurs ordres de tri se logent dans les copies déjà nécessaires pour la réplication (C-Store, Vertica).
- Les écritures passent par une mémoire triée puis une fusion en bloc, comme un LSM-tree : les requêtes combinent disque et mémoire.
