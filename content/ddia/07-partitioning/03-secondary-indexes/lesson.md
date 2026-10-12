---
id: ddia-ch07-l03
title: 'Index secondaires : par document ou par terme'
source:
  chapter: 6
  pages: 206-209
duration_min: 35
concepts:
- id: ddia-secondary-index-problem
  label: 'Un index secondaire cherche des valeurs, pas une clé unique : il ne s''aligne pas sur les partitions'
- id: ddia-local-index
  label: 'Index local (par document) : chaque partition indexe ses propres documents ; écriture sur une partition, lecture en scatter/gather'
- id: ddia-scatter-gather
  label: 'Scatter/gather : la requête part à toutes les partitions ; coûteux et sensible à la latence de queue'
- id: ddia-global-index
  label: 'Index global (par terme) : partitionné par terme ; lecture sur une partition, écriture sur plusieurs'
- id: ddia-async-global-index
  label: 'Les mises à jour d''un index global sont souvent asynchrones : une lecture juste après écriture peut ne pas la voir'
glossary:
- term: index secondaire
  definition: Structure pour chercher les occurrences d'une valeur (toutes les voitures rouges) ; n'identifie pas un enregistrement unique.
- term: index local / par document
  definition: Chaque partition garde un index couvrant seulement ses documents.
- term: index global / par terme
  definition: Un index qui couvre tous les documents, lui-même partitionné, par exemple par la valeur du terme.
- term: scatter/gather
  definition: Envoyer la requête à toutes les partitions puis fusionner les résultats.
visuals: []
labs:
- ddia-ch07-l03-lab-index-cost-design
- ddia-ch07-l03-lab-global-index-design
extra: false
xp: 35
---

## Pourquoi c'est important

Tant qu'on n'accède aux données que par leur clé primaire, on déduit la partition de la clé. Les choses se compliquent avec les **index secondaires**, le pain quotidien des bases relationnelles et courants dans les bases de documents : « toutes les actions de l'utilisateur 123 », « tous les articles contenant le mot *hogwash* », « toutes les voitures rouges ». Un index secondaire n'identifie pas un enregistrement unique : il sert à chercher des **occurrences d'une valeur**. C'est aussi la raison d'être des moteurs de recherche (Solr, Elasticsearch). Le problème : **ils ne s'alignent pas proprement sur les partitions**. Deux approches existent : par document et par terme.

## Index par document (local)

Un site d'annonces de voitures d'occasion. Chaque annonce a un identifiant unique (l'identifiant de document), et la base est partitionnée par cet identifiant (les identifiants 0 à 499 dans la partition 0, 500 à 999 dans la partition 1…). Les utilisateurs filtrent par couleur et par marque : il faut un index secondaire sur `color` et `make`. Quand une voiture rouge est ajoutée, la partition l'ajoute automatiquement à la liste d'identifiants de l'entrée d'index `color:red`.

Dans cette approche, **chaque partition est totalement séparée** : elle tient ses propres index secondaires, qui ne couvrent que ses documents. À l'écriture (ajout, suppression, modification d'un document), on ne s'occupe que de la partition de l'identifiant écrit. C'est pourquoi cet index est dit **local**, par opposition à l'index **global** de la section suivante.

Mais la **lecture** demande du soin : rien n'oblige les voitures rouges à se trouver dans la même partition (dans la figure du livre, elles sont dans les partitions 0 et 1). Pour chercher les voitures rouges, il faut envoyer la requête à **toutes les partitions** et combiner les résultats : le **scatter/gather**. Cela rend les lectures par index secondaire coûteuses. Même en les interrogeant en parallèle, le scatter/gather subit l'**amplification de la latence de queue** (module 00). Il est pourtant très utilisé : MongoDB, Riak, Cassandra, Elasticsearch, SolrCloud et VoltDB utilisent des index secondaires par document. Les éditeurs recommandent de concevoir le schéma de partitionnement pour que les requêtes d'index secondaire se servent depuis **une seule partition**, mais ce n'est pas toujours possible, notamment quand on filtre sur plusieurs index à la fois (couleur et marque).

## Index par terme (global)

Au lieu que chaque partition ait son index local, on peut construire un **index global** qui couvre les données de **toutes** les partitions. On ne peut pas le stocker sur un seul nœud (goulot d'étranglement, ce qui annulerait le partitionnement) : il doit être **lui aussi partitionné**, et il peut l'être différemment de l'index de clé primaire.

Exemple : les voitures rouges de toutes les partitions apparaissent sous `color:red` dans l'index, mais l'index est partitionné pour que les couleurs de *a* à *r* soient dans sa partition 0 et celles de *s* à *z* dans sa partition 1. L'index sur la marque est partitionné de même. On l'appelle **partitionné par terme**, car le terme recherché (par exemple `color:red`) détermine la partition de l'index. Le mot vient des index plein texte, où les termes sont tous les mots d'un document. On peut partitionner par le terme lui-même (utile pour des plages, comme le prix demandé) ou par un **hachage du terme** (charge plus uniforme).

**Avantage** sur l'index par document : les lectures sont plus efficaces. Au lieu d'un scatter/gather sur toutes les partitions, un client n'a qu'à interroger **la partition qui contient le terme**. **Inconvénient** : les écritures sont plus lentes et plus compliquées, car l'écriture d'un seul document peut maintenant affecter **plusieurs partitions de l'index** (chaque terme du document peut se trouver sur une partition, un nœud, différent).

Dans un monde idéal, l'index serait toujours à jour. Mais avec un index par terme, cela exigerait une **transaction distribuée** sur toutes les partitions concernées, ce que toutes les bases ne supportent pas (modules 08 et 12). En pratique, les mises à jour d'un index secondaire global sont souvent **asynchrones** : si on lit l'index juste après une écriture, le changement n'y figure peut-être pas encore. Amazon DynamoDB dit que ses index secondaires globaux sont mis à jour en une fraction de seconde en temps normal, mais peuvent connaître des délais plus longs en cas de panne de l'infrastructure. D'autres usages : la recherche de Riak, et l'entrepôt Oracle, qui laisse choisir entre index local et global.


> **Au-delà du livre.** Le choix est un classique de design : écrire coûte plus cher pour que lire coûte moins. Avec peu d'écritures et beaucoup de lectures filtrées, l'index global gagne ; avec une charge d'écriture lourde et des requêtes qui incluent la clé de partition, l'index local suffit.

## Pièges fréquents

- **Croire que l'index secondaire est gratuit sur une base partitionnée** : il impose scatter/gather ou écritures multi-partitions.
- **Oublier le retard d'un index global** : une lecture juste après l'écriture peut rater le résultat.
- **Filtrer sur plusieurs index à la fois** en espérant une seule partition.
- **Ignorer la latence de queue du scatter/gather** : il suffit d'une partition lente.

## À retenir

- Index local : écriture sur une partition, lecture sur toutes (scatter/gather).
- Index global : lecture sur une partition, écriture sur plusieurs, souvent asynchrone.
- Le choix est un compromis lecture / écriture, et un index global a un retard.
