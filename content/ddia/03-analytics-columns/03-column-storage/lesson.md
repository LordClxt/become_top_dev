---
id: ddia-ch03-l03
title: "Stockage en colonnes et compression"
source: { chapter: 3, pages: "95-99" }
duration_min: 40
concepts:
  - id: ddia-row-vs-column
    label: "Stockage par lignes ou par colonnes : une requête analytique ne lit que les colonnes dont elle a besoin"
  - id: ddia-column-position
    label: "Les fichiers de colonnes gardent le même ordre de lignes : la k-ième valeur de chaque colonne forme la k-ième ligne"
  - id: ddia-bitmap-encoding
    label: "Encodage par bitmap : un bitmap par valeur distincte, utilisable avec AND et OR au niveau des bits"
  - id: ddia-run-length-encoding
    label: "Run-length encoding : on remplace une suite de répétitions par (valeur, longueur)"
  - id: ddia-vectorized
    label: "Traitement vectoriel : boucle serrée sur un bloc de colonne compressée qui tient dans le cache L1"
glossary:
  - term: "stockage orienté lignes"
    definition: "Toutes les valeurs d'une ligne sont rangées côte à côte (bases OLTP, documents)."
  - term: "stockage orienté colonnes"
    definition: "Toutes les valeurs d'une colonne sont rangées ensemble, dans un fichier séparé par colonne."
  - term: "encodage par bitmap"
    definition: "Pour une colonne à n valeurs distinctes : n bitmaps, un par valeur, avec un bit par ligne (1 si la ligne a cette valeur)."
  - term: "run-length encoding (RLE)"
    definition: "Compression des répétitions : une séquence de zéros ou de valeurs identiques devient le nombre de répétitions."
  - term: "traitement vectoriel"
    definition: "Opérateurs qui travaillent directement sur des blocs de colonne compressés, dans une boucle sans appels de fonction."
  - term: "famille de colonnes (Bigtable)"
    definition: "Dans Cassandra et HBase : toutes les colonnes d'une ligne sont stockées ensemble sans compression de colonnes ; le modèle reste donc surtout orienté lignes."
visuals: [ddia-ch03-column-bitmap]
labs: [ddia-ch03-l03-lab-column-design]
xp: 40
---

## Pourquoi c'est important

Une table de faits compte des billions de lignes et plus de 100 colonnes. Une requête typique en lit quatre ou cinq. Un moteur orienté lignes doit pourtant charger chaque ligne **entière** depuis le disque, l'analyser, puis jeter presque tout. Le stockage en colonnes retourne le problème : il range les données pour que **ce qu'on lit ensemble soit stocké ensemble**.

## Le problème d'une requête analytique

Reprenons la requête type : ventes de fruits frais et de bonbons en 2013, par jour de la semaine. Elle accède à des millions de lignes (chaque achat de fruit ou de bonbon de l'année), mais seulement à **trois colonnes** de `fact_sales` : la clé de date, la clé de produit et la quantité. Tout le reste est ignoré.

Dans la plupart des bases OLTP, le stockage est **orienté lignes** : toutes les valeurs d'une ligne sont côte à côte. Les bases de documents font de même : un document est une suite contiguë d'octets. Même avec des index sur la date et le produit, le moteur doit encore charger les lignes complètes (plus de 100 attributs chacune), les analyser et filtrer. C'est long.

## L'idée : ranger par colonne

Au lieu de regrouper les valeurs d'une ligne, on regroupe **les valeurs d'une colonne**. Si chaque colonne est dans un fichier séparé, la requête ne lit et n'analyse que les colonnes utilisées.

Ce principe s'applique aussi aux données non relationnelles : Parquet est un format en colonnes qui gère un modèle de documents (il s'inspire de Dremel).

Une condition : chaque fichier de colonne doit contenir **les lignes dans le même ordre**. Pour reconstituer la 23ᵉ ligne, on prend la 23ᵉ valeur de chaque fichier. La position remplace l'identifiant.

> **Attention aux faux amis.** Les « familles de colonnes » de Cassandra et HBase (héritées de Bigtable) ne sont pas du stockage en colonnes : dans une famille, toutes les colonnes d'une ligne sont stockées ensemble, avec la clé de ligne, et sans compression de colonnes. Le modèle Bigtable reste surtout orienté lignes.

## La compression par colonne

Les colonnes sont souvent **très répétitives** (un pays, un produit, une date), ce qui les rend faciles à compresser. Moins d'octets à lire = moins de débit disque demandé.

### Encodage par bitmap

Souvent, le nombre de **valeurs distinctes** est petit par rapport au nombre de lignes : un détaillant a des milliards d'achats mais seulement 100 000 produits. On transforme alors une colonne à *n* valeurs distinctes en **n bitmaps**, un par valeur, avec **un bit par ligne** : 1 si la ligne a cette valeur, 0 sinon.

Exemple, colonne `product_sk` sur 9 lignes : `29 29 69 69 69 69 29 31 31`.

| Valeur | Bitmap (9 lignes) |
|---|---|
| 29 | `110000100` |
| 31 | `000000011` |
| 69 | `001111000` |

Si *n* est très petit (environ 200 pays), ces bitmaps se stockent avec un bit par ligne. Si *n* est plus grand, ils contiennent surtout des zéros (ils sont **creux**) : on les compresse par **run-length encoding**. `110000100` devient « 0 zéro avant, 2 uns, 4 zéros, 1 un, 2 zéros » : on garde seulement les longueurs `0, 2, 4, 1, 2`. La colonne devient remarquablement compacte.

Pourquoi c'est si utile en entrepôt ?

- `WHERE product_sk IN (30, 68, 69)` : on charge les trois bitmaps et on calcule leur **OU bit à bit**, très rapide.
- `WHERE product_sk = 31 AND store_sk = 3` : on charge deux bitmaps et on fait un **ET bit à bit**. Ça marche parce que toutes les colonnes contiennent les lignes **dans le même ordre** : le k-ième bit d'un bitmap correspond à la même ligne que le k-ième bit d'un autre.

Il existe d'autres schémas de compression selon les données ; le principe reste de profiter de la répétition.

::visual{id="ddia-ch03-column-bitmap"}

## Bande passante mémoire et traitement vectoriel

Pour une requête qui balaie des millions de lignes, le goulot n'est pas seulement le disque vers la mémoire. Les concepteurs de bases analytiques se soucient aussi de la bande passante **mémoire vers cache CPU**, des erreurs de prédiction de branchement, des bulles dans le pipeline d'instructions, et des instructions **SIMD**.

Le stockage en colonnes aide aussi ici. Le moteur prend un bloc de colonne compressée qui tient dans le **cache L1**, et le parcourt dans une **boucle serrée**, sans appel de fonction. Un CPU exécute cela bien plus vite qu'un code qui appelle plusieurs fonctions et teste plusieurs conditions pour chaque enregistrement. La compression fait tenir plus de lignes dans le même cache. Les opérateurs comme le ET et le OU bit à bit travaillent directement sur ces blocs compressés : c'est le **traitement vectoriel**.

## Pièges fréquents

- **Appeler « colonnes » les familles de colonnes de Cassandra** : elles restent orientées lignes et ne compressent pas par colonne.
- **Trier chaque colonne séparément** : on ne saurait plus quelles valeurs appartiennent à la même ligne (leçon suivante).
- **Utiliser des bitmaps pour une colonne à millions de valeurs distinctes** : trop de bitmaps ; c'est pour les colonnes à peu de valeurs distinctes.
- **Croire que le stockage en colonnes est toujours meilleur** : pour lire une ligne entière, le stockage par lignes reste plus simple (c'est le cas OLTP).

## À retenir

- Requête analytique : peu de colonnes, beaucoup de lignes. Le stockage en colonnes lit seulement ce dont la requête a besoin.
- Chaque colonne garde l'ordre des lignes : la position identifie la ligne.
- Bitmap par valeur distincte + RLE pour les bitmaps creux ; ET/OU bit à bit pour les filtres.
- Traitement vectoriel : boucle serrée sur un bloc compressé dans le cache L1.
- Les familles de colonnes de Bigtable ne sont pas du vrai stockage en colonnes.
