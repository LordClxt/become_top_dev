---
id: ddia-ch02-l05
title: "Autres index : secondaires, composites, spatiaux, mémoire"
source: { chapter: 3, pages: "85-90" }
duration_min: 35
concepts:
  - id: ddia-secondary-index
    label: "Index secondaire : clés non uniques, liste d'identifiants ou clé + identifiant"
  - id: ddia-heap-clustered-covering
    label: "Heap file, index clustered et index couvrant"
  - id: ddia-concatenated-index
    label: "Index concaténé : utilisable seulement par préfixe de colonnes"
  - id: ddia-multidim-index
    label: "Index multidimensionnels : R-tree, courbes de remplissage de l'espace"
  - id: ddia-fulltext-fuzzy
    label: "Recherche plein texte et floue : distance d'édition et automate de Levenshtein"
  - id: ddia-in-memory-db
    label: "Bases en mémoire : rapides par l'absence d'encodage disque, pas par l'absence de lectures"
glossary:
  - term: "index primaire"
    definition: "Identifie de façon unique une ligne, un document ou un sommet ; les autres enregistrements s'y réfèrent par cette clé."
  - term: "index secondaire"
    definition: "Index supplémentaire sur d'autres colonnes (CREATE INDEX), dont les clés ne sont pas uniques ; essentiel pour les jointures."
  - term: "heap file"
    definition: "Fichier où les lignes sont stockées sans ordre particulier ; plusieurs index y renvoient plutôt que de dupliquer les données."
  - term: "index clustered"
    definition: "La ligne entière est stockée dans l'index lui-même (clé primaire d'InnoDB), évitant un saut vers le heap."
  - term: "index couvrant (covering index)"
    definition: "Compromis : l'index stocke quelques colonnes de la table, ce qui permet de répondre à certaines requêtes sans lire la ligne."
  - term: "index concaténé"
    definition: "Combine plusieurs champs en une seule clé, dans l'ordre de la définition (comme l'annuaire papier : nom, prénom)."
  - term: "R-tree"
    definition: "Index spatial qui répond à des requêtes d'intervalle sur plusieurs dimensions à la fois (PostGIS)."
  - term: "base en mémoire"
    definition: "Base qui garde ses données en RAM ; la durabilité vient d'un journal, de snapshots ou de la réplication."
visuals: []
labs: [ddia-ch02-l05-lab-indexes-design]
xp: 35
---

## Pourquoi c'est important

Jusqu'ici, nous avons indexé une clé primaire. Dans une vraie application, tu cherches par plusieurs colonnes, par zone géographique, par texte approximatif, et tu te demandes si un index aidera une requête ou ne fera que ralentir les écritures. Cette leçon donne les types d'index que tu rencontreras et la règle pour décider lequel utiliser.

## Index secondaires

Un **index primaire** identifie une ligne, un document ou un sommet de façon unique. Les **index secondaires** (`CREATE INDEX`) portent sur d'autres colonnes ; ils sont souvent indispensables pour des jointures rapides (par exemple sur `user_id` dans chaque table liée à un utilisateur).

On construit facilement un index secondaire à partir d'un index clé-valeur. La différence : les clés **ne sont pas uniques**. Deux solutions :

1. chaque valeur de l'index est une **liste d'identifiants** de lignes (comme une postings list) ;
2. on rend chaque clé unique en lui **ajoutant l'identifiant de la ligne**.

B-trees et index log-structurés conviennent tous deux.

### Où ranger la valeur : heap, clustered, couvrant

La valeur d'un index peut être la **ligne elle-même** ou une **référence** vers l'endroit où elle est rangée. Dans le second cas, le lieu de stockage est un **heap file** : lignes sans ordre particulier. Avantage : pas de duplication quand il y a plusieurs index secondaires, chacun référence la position dans le heap. Mettre à jour une valeur sans changer la clé est efficace si la nouvelle valeur n'est pas plus grande ; sinon la ligne déménage, et il faut soit mettre à jour tous les index, soit laisser un **pointeur de redirection**.

Parfois le saut de l'index vers le heap coûte trop cher en lecture. On stocke alors la ligne **dans l'index** : **index clustered**. Dans InnoDB (MySQL), la clé primaire est toujours clustered, et les index secondaires renvoient à la clé primaire. SQL Server permet un index clustered par table.

Entre les deux : l'**index couvrant** (*covering index*, *index with included columns*) stocke **certaines colonnes** de la table dans l'index. Certaines requêtes se résolvent avec l'index seul : l'index « couvre » la requête.

> Comme toute duplication de données, clustered et couvrant accélèrent les lectures mais coûtent de l'espace et ralentissent les écritures. La base doit aussi fournir un effort supplémentaire pour que les transactions ne voient pas d'incohérence.

## Index sur plusieurs colonnes

### Index concaténé

Le plus courant : il **concatène** plusieurs champs en une seule clé, dans l'ordre de la définition. C'est l'annuaire papier : index de `(nom, prénom)` vers le numéro de téléphone. Grâce au tri, il retrouve toutes les personnes d'un nom donné, ou d'une combinaison nom-prénom. Mais il est **inutile** pour chercher tous les gens d'un prénom donné.

Règle : un index concaténé sur `(a, b, c)` sert pour `a`, pour `a` + `b`, pour `a` + `b` + `c`. Pas pour `b` seul, ni `c` seul. On appelle cela la règle du **préfixe**.

### Index multidimensionnels

Une requête comme

```sql
SELECT * FROM restaurants WHERE latitude > 51.4946 AND latitude < 51.5079
                            AND longitude > -0.1162 AND longitude < -0.1004;
```

est un intervalle sur **deux dimensions** à la fois. Un B-tree ou un LSM-tree donne tous les restaurants d'un intervalle de latitudes (à toute longitude), ou de longitudes, mais pas les deux ensemble. Options : traduire la position 2D en un nombre avec une **courbe de remplissage de l'espace** puis un B-tree ordinaire ; ou, plus souvent, un index spatial comme un **R-tree** (PostGIS). Ces index ne servent pas qu'à la géographie : trois dimensions `(rouge, vert, bleu)` pour des produits par plage de couleurs, ou `(date, température)` pour des observations météo (HyperDex).

## Recherche plein texte et floue

Les index vus jusqu'ici supposent des données **exactes**. Chercher des clés **similaires** (fautes de frappe) demande d'autres techniques : synonymes, variantes grammaticales, mots proches les uns des autres. Lucene sait chercher les mots à une certaine **distance d'édition** (1 = une lettre ajoutée, retirée ou remplacée). Son dictionnaire de termes ressemble à une SSTable, mais l'index en mémoire est un **automate à états finis** sur les caractères des clés (proche d'un trie), qu'on peut transformer en **automate de Levenshtein**.

## Tout garder en mémoire

Les structures vues sont des réponses aux limites des disques. Avec une RAM moins chère et beaucoup de jeux de données pas si gros, on peut tout garder en mémoire : les **bases en mémoire**.

- **Memcached** sert de cache : perdre les données au redémarrage est acceptable.
- D'autres visent la durabilité : matériel spécial (RAM sur batterie), **journal** des changements, **snapshots** périodiques, ou **réplication**. Une base qui écrit sur disque reste « en mémoire » si le disque ne sert que de journal et si les lectures viennent entièrement de la RAM.
- VoltDB, MemSQL, Oracle TimesTen (relationnelles) ; RAMCloud (clé-valeur durable) ; Redis et Couchbase (durabilité faible par écriture asynchrone).

**Contre-intuitif.** L'avantage de performance **ne vient pas** de l'absence de lectures disque : même un moteur sur disque n'y touche jamais s'il a assez de mémoire, puisque l'OS met en cache les blocs récents. Il vient de l'**évitement de l'encodage** des structures en mémoire dans un format écrivable sur disque. Autre intérêt : des modèles de données difficiles à implémenter avec des index sur disque (files de priorité, ensembles de Redis).

## Pièges fréquents

- **Index concaténé dans le mauvais ordre** : `(prénom, nom)` ne sert pas une recherche par nom.
- **Multiplier les index secondaires** « au cas où » : chacun ralentit chaque écriture.
- **Croire qu'un index B-tree sait répondre à un intervalle sur deux dimensions** : il en traite une seule.
- **Expliquer la vitesse d'une base en mémoire par « pas de disque »** : l'encodage évité est la vraie raison.

## À retenir

- Index secondaire : clés non uniques, résolues par une liste d'identifiants ou une clé augmentée de l'identifiant.
- Valeur de l'index : référence dans un heap file, ligne entière (clustered) ou quelques colonnes (couvrant) : lecture contre écriture et espace.
- Index concaténé : règle du préfixe. Plusieurs dimensions : R-tree ou courbe de remplissage de l'espace.
- Recherche floue : distance d'édition, automate de Levenshtein.
- En mémoire : rapide grâce à l'absence d'encodage disque, durable grâce au journal, aux snapshots ou à la réplication.
