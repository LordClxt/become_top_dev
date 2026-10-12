---
id: ddia-ch07-l02
title: Partitionner par plage ou par hachage de la clé
source:
  chapter: 6
  pages: 202-205
duration_min: 40
concepts:
- id: ddia-range-partitioning
  label: 'Par plage de clés : bornes adaptées aux données, requêtes de plage faciles, mais risque de hot spot (clé = horodatage)'
- id: ddia-hash-partitioning
  label: 'Par hachage de la clé : répartit uniformément les clés mais détruit l''ordre, donc les requêtes de plage'
- id: ddia-compound-key
  label: 'Clé composée (Cassandra) : première partie hachée, le reste trié ; plage efficace à première partie fixée'
- id: ddia-consistent-hashing-term
  label: '« Consistent hashing » prête à confusion : mieux vaut dire partitionnement par hachage'
- id: ddia-hot-key
  label: 'Clé très chaude (célébrité) : le hachage n''aide pas ; ajouter un sel à la clé répartit les écritures mais coûte aux lectures'
glossary:
- term: partitionnement par plage
  definition: Chaque partition possède une plage continue de clés triées, de un minimum à un maximum.
- term: partitionnement par hachage
  definition: Une fonction de hachage est appliquée à la clé ; chaque partition possède une plage de hachages.
- term: clé composée
  definition: 'Clé de plusieurs colonnes : la première détermine la partition, les autres servent de tri à l''intérieur.'
- term: sel (salt)
  definition: Nombre aléatoire ajouté au début ou à la fin d'une clé très chaude pour la répartir sur plusieurs sous-clés.
visuals: []
labs:
- ddia-ch07-l02-lab-key-choice-design
extra: false
xp: 40
---

## Pourquoi c'est important

Le choix de la **clé de partition** est la décision la plus lourde de conséquences d'une base partitionnée : elle détermine quels accès sont rapides, quelles requêtes touchent un seul nœud, et où apparaissent les hot spots. Deux familles : par plage, par hachage.

## Par plage de clés

On attribue à chaque partition une **plage continue de clés**, d'un minimum à un maximum, comme les volumes d'une encyclopédie papier. Si on connaît les bornes entre plages, on sait quelle partition contient une clé donnée, et si on sait quel nœud possède quelle partition, on s'adresse directement à lui (ou, pour l'encyclopédie, on prend le bon volume sur l'étagère).

Les plages ne sont **pas forcément de taille égale**, parce que les données ne sont pas réparties uniformément. Dans l'encyclopédie, le volume 1 contient les mots en A et B, mais le volume 12 les mots en T, U, V, X, Y et Z. Un volume par paire de lettres donnerait des volumes de tailles très inégales : les **bornes doivent s'adapter aux données**. Elles peuvent être choisies à la main ou automatiquement. Cette stratégie est utilisée par Bigtable, HBase, RethinkDB et MongoDB avant la version 2.4.

À l'intérieur d'une partition, on garde les clés triées (SSTables et LSM-trees, module 02) : les **requêtes de plage** sont faciles, et on peut traiter la clé comme un index concaténé pour récupérer plusieurs enregistrements liés en une requête. Exemple : un réseau de capteurs avec pour clé l'horodatage (année-mois-jour-heure-minute-seconde). Lire toutes les mesures d'un mois est trivial.

### Le piège : le hot spot

Les accès peuvent créer un hot spot. Si la clé est un horodatage, les partitions correspondent à des plages de temps (par exemple une partition par jour). Or les mesures sont écrites **à mesure qu'elles ont lieu** : toutes les écritures vont à la partition d'aujourd'hui, qui peut être surchargée pendant que les autres sont inactives. Pour y remédier, il faut utiliser autre chose que l'horodatage en **premier élément de clé**. Par exemple préfixer l'horodatage par le **nom du capteur** : on partitionne d'abord par capteur puis par temps. Avec beaucoup de capteurs actifs en même temps, la charge d'écriture se répartit. Contrepartie : pour récupérer les valeurs de plusieurs capteurs sur une plage de temps, il faut une requête de plage **par capteur**.

## Par hachage de la clé

À cause du risque de skew, beaucoup de bases utilisent une **fonction de hachage** pour déterminer la partition. Une bonne fonction transforme des données déséquilibrées en une distribution uniforme : même pour des chaînes très proches, les hachages sont répartis sur toute la plage. Pour le partitionnement, la fonction n'a pas besoin d'être robuste cryptographiquement : Cassandra et MongoDB utilisent MD5, Voldemort la fonction de Fowler–Noll–Vo. Attention aux fonctions de hachage intégrées à certains langages, qui peuvent donner **des valeurs différentes pour la même clé dans des processus différents** (`hashCode` de Java, `hash` de Ruby) : inutilisables pour le partitionnement.

On attribue ensuite à chaque partition une **plage de hachages** (plutôt que de clés). Toute clé dont le hachage tombe dans la plage de la partition lui est affectée. Les bornes peuvent être régulières ou choisies pseudo-aléatoirement.

> **Le piège du vocabulaire.** Cette seconde variante est parfois appelée **consistent hashing**. Défini par Karger et al. pour répartir la charge sur un réseau de caches comme un CDN avec des bornes aléatoires et sans contrôle central, il n'a **rien à voir** avec la cohérence des réplicas ni avec le « C » d'ACID. Il fonctionne mal pour les bases de données : mieux vaut parler de **partitionnement par hachage**.

Mais le hachage fait perdre une belle propriété du partitionnement par plage : les **requêtes de plage efficaces**. Les clés autrefois voisines sont dispersées sur toutes les partitions, leur ordre est perdu. Dans MongoDB en mode hachage, toute requête de plage est envoyée à toutes les partitions ; Riak, Couchbase et Voldemort ne supportent pas les requêtes de plage sur la clé primaire.

### Le compromis de Cassandra : la clé composée

Une table Cassandra peut avoir une **clé primaire composée** de plusieurs colonnes. Seule la **première partie** est hachée pour déterminer la partition ; les autres colonnes servent d'index concaténé pour trier les données dans les SSTables. Une requête ne peut donc pas chercher une plage de valeurs sur la première colonne, mais si elle fixe la première colonne, elle peut faire un parcours de plage efficace sur les autres. Cela permet un modèle élégant pour les relations un-à-plusieurs : sur un réseau social, un utilisateur publie plusieurs mises à jour. Avec la clé `(user_id, update_timestamp)`, on récupère efficacement toutes les mises à jour d'un utilisateur dans un intervalle de temps, triées par horodatage. Des utilisateurs différents sont sur des partitions différentes, mais pour chaque utilisateur, les mises à jour sont ordonnées dans une seule partition.

## Charges déséquilibrées et clés très chaudes

Le hachage réduit les hot spots mais ne les élimine pas : si **toutes** les lectures et écritures visent la même clé, tout est quand même routé vers la même partition. Cas peu courant mais réel : un utilisateur célèbre avec des millions d'abonnés déclenche une tempête d'activité sur sa clé (son identifiant, ou celui d'une publication commentée par tous). Hacher ne change rien : le hachage de deux identifiants identiques est identique.

Aujourd'hui, la plupart des systèmes ne compensent pas automatiquement un tel déséquilibre : c'est à l'application de réduire le skew. Technique simple pour une clé connue pour être très chaude : **ajouter un nombre aléatoire au début ou à la fin de la clé**. Un nombre décimal à deux chiffres répartit les écritures sur **100 clés différentes**, qui iront sur des partitions différentes. Mais les lectures doivent maintenant lire les 100 clés et fusionner les résultats. Et il faut de la comptabilité : ne mettre un sel que sur le petit nombre de clés chaudes (pour les autres, c'est un surcoût inutile), donc savoir lesquelles sont éclatées.


## Pièges fréquents

- **Une clé de plage monotone** (horodatage, identifiant auto-incrémenté) : toutes les écritures sur la dernière partition.
- **Utiliser le hachage du langage** : valeurs différentes d'un processus à l'autre.
- **Hacher puis vouloir des requêtes de plage** : il faudra interroger toutes les partitions.
- **Saler toutes les clés** : coût de lecture inutile pour la grande majorité qui n'est pas chaude.

## À retenir

- Plage : requêtes de plage faciles, risque de hot spot sur clé monotone ; bornes adaptées aux données.
- Hachage : répartition uniforme, mais plus d'ordre ; clé composée = compromis (première partie hachée, reste trié).
- Clé très chaude : sel aléatoire (écritures réparties, lectures fusionnées), à réserver aux clés chaudes.
