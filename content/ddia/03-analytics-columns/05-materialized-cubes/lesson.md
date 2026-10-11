---
id: ddia-ch03-l05
title: "Vues matérialisées et cubes de données"
source: { chapter: 3, pages: "101-104" }
duration_min: 30
concepts:
  - id: ddia-materialized-view
    label: "Vue matérialisée : copie des résultats d'une requête écrite sur disque, à mettre à jour quand les données changent"
  - id: ddia-virtual-view
    label: "Vue virtuelle : simple raccourci, la requête est dépliée à chaque lecture"
  - id: ddia-data-cube
    label: "Cube de données (OLAP cube) : grille d'agrégats regroupés par dimensions"
  - id: ddia-olap-oltp-summary
    label: "Bilan du chapitre : deux grandes familles de moteurs, OLTP (LSM, B-tree) et OLAP (colonnes)"
glossary:
  - term: "agrégat matérialisé"
    definition: "Valeur de COUNT, SUM, AVG, MIN ou MAX précalculée et stockée, pour ne pas reparcourir les données brutes à chaque requête."
  - term: "vue virtuelle"
    definition: "Objet qui ressemble à une table mais dont le contenu est le résultat d'une requête, recalculée à chaque lecture."
  - term: "vue matérialisée"
    definition: "Copie réelle, écrite sur disque, du résultat d'une requête : une copie dénormalisée à garder à jour."
  - term: "cube de données (OLAP cube)"
    definition: "Cas particulier de vue matérialisée : une grille d'agrégats regroupés par plusieurs dimensions (date × produit × magasin…)."
visuals: []
labs: [ddia-ch03-l05-lab-cube-design]
xp: 30
---

## Pourquoi c'est important

Beaucoup de requêtes d'un entrepôt se ressemblent : les mêmes sommes par magasin, par jour, par produit. Les recalculer à partir de milliards de lignes à chaque fois est du gaspillage. Cette dernière leçon du chapitre montre comment **précalculer** ces agrégats, et ce que ça coûte en souplesse.

## Agrégats matérialisés

Les requêtes d'entrepôt utilisent presque toujours une fonction d'agrégat : `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Si les mêmes agrégats servent à beaucoup de requêtes, pourquoi ne pas **mettre en cache** les comptes ou les sommes les plus demandés ?

Une première façon est la **vue matérialisée**. Dans un modèle relationnel, on la définit comme une vue ordinaire (**virtuelle**) : un objet qui ressemble à une table, dont le contenu est le résultat d'une requête. Mais :

- une **vue virtuelle** n'est qu'un raccourci d'écriture : quand on la lit, le moteur déplie la requête sous-jacente et l'exécute ;
- une **vue matérialisée** est une **vraie copie** des résultats, écrite sur disque.

Conséquence : quand les données sous-jacentes changent, la vue matérialisée doit être mise à jour, car c'est une copie **dénormalisée**. La base peut le faire automatiquement, mais cela **renchérit les écritures**. C'est pourquoi on voit peu de vues matérialisées dans les bases OLTP. Dans un entrepôt qui lit beaucoup et écrit peu, elles ont plus de sens (le gain réel dépend du cas).

## Le cube de données

Un cas particulier courant est le **cube de données** (ou *cube OLAP*) : une grille d'agrégats regroupés par différentes dimensions.

Imagine que chaque fait n'a de clés étrangères que vers deux dimensions : la date et le produit. Tu dessines un tableau à deux dimensions, les dates sur un axe, les produits sur l'autre. Chaque case contient l'agrégat (par exemple la somme de `net_price`) de tous les faits ayant cette combinaison date-produit. Tu appliques ensuite le même agrégat le long de chaque ligne ou colonne, et tu obtiens un résumé réduit d'une dimension : les ventes par produit toutes dates confondues, ou les ventes par date tous produits confondus.

En réalité, les faits ont souvent plus de deux dimensions : cinq dans le schéma de la leçon 2 (date, produit, magasin, promotion, client). Un hypercube à cinq dimensions est plus dur à imaginer, mais le principe est identique : chaque case contient les ventes pour une combinaison date-produit-magasin-promotion-client, qu'on peut résumer le long de chaque dimension.

**Avantage** : certaines requêtes deviennent très rapides, car elles sont précalculées. Le total des ventes par magasin hier ? Il suffit de lire les totaux sur la bonne dimension, sans balayer des millions de lignes.

**Inconvénient** : un cube n'a pas la souplesse des données brutes. Impossible, par exemple, de calculer la proportion des ventes venant d'articles à plus de 100 €, si le prix ne fait pas partie des dimensions. La plupart des entrepôts conservent donc le plus possible de **données brutes** et n'utilisent les cubes que comme **accélérateur** pour certaines requêtes.

## Bilan du chapitre

Les moteurs de stockage se rangent en deux grandes catégories :

- **OLTP** : optimisés pour un grand nombre de requêtes courtes, chacune touchant peu d'enregistrements par clé. Deux écoles : les moteurs **log-structurés** (LSM-trees, SSTables) qui n'écrivent qu'en ajout, et les moteurs **orientés pages** (B-trees) qui modifient des pages sur place.
- **OLAP** (entrepôts) : optimisés pour de gros balayages analytiques ; le stockage en colonnes, la compression, le tri et les agrégats matérialisés en sont les outils.

Savoir si ta charge est OLTP ou OLAP est la première question à poser avant de choisir un moteur.

## Pièges fréquents

- **Matérialiser tout** : chaque vue matérialisée ralentit les écritures et doit être maintenue à jour.
- **Jeter les données brutes une fois le cube construit** : une question que le cube n'a pas prévue devient impossible à poser.
- **Confondre vue virtuelle et matérialisée** : la première ne calcule rien d'avance et ne fait gagner aucun temps de lecture.
- **Croire que le cube remplace l'entrepôt** : c'est un accélérateur, pas une source de vérité.

## À retenir

- Vue virtuelle = raccourci d'écriture ; vue matérialisée = copie sur disque, à garder à jour, écritures plus chères.
- Cube = grille d'agrégats par dimensions ; lecture instantanée, mais seulement pour les dimensions prévues.
- On garde les données brutes et on ajoute des agrégats comme accélérateur.
- Premier réflexe de conception : ma charge est-elle OLTP ou OLAP ?
