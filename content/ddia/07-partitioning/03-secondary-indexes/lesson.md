---
id: ddia-ch07-l03
title: "Index secondaires : par document ou par terme"
source: { chapter: 6, pages: "206-209" }
duration_min: 30
concepts:
  - id: ddia-secondary-index-partitioning
    label: "Un index secondaire ne correspond pas proprement aux partitions : il faut choisir comment le partitionner lui aussi"
  - id: ddia-local-document-index
    label: "Index local (partitionné par document) : chaque partition indexe seulement ses propres documents ; une écriture ne touche qu'une partition"
  - id: ddia-scatter-gather
    label: "Scatter/gather : une lecture par index local interroge toutes les partitions et combine, ce qui amplifie la latence de queue"
  - id: ddia-global-term-index
    label: "Index global (partitionné par terme) : l'index couvre toutes les données mais est découpé par terme ; une lecture ne vise que la partition du terme"
  - id: ddia-global-index-async-updates
    label: "Avec un index global, une écriture peut toucher plusieurs partitions d'index ; les mises à jour sont en pratique souvent asynchrones"
glossary:
  - term: "index secondaire"
    definition: "Index sur une autre colonne que la clé primaire (couleur, ville, mot…) ; il n'identifie pas un enregistrement de façon unique mais retrouve ceux qui ont une valeur donnée."
  - term: "index local (document-partitioned index)"
    definition: "Chaque partition garde l'index de ses seuls documents."
  - term: "scatter/gather"
    definition: "Envoyer la requête à toutes les partitions (scatter), puis combiner les réponses (gather)."
  - term: "index global (term-partitioned index)"
    definition: "Index couvrant les données de toutes les partitions, lui-même partitionné selon le terme recherché."
  - term: "terme"
    definition: "Valeur indexée, comme `color:rouge` ou un mot d'un texte (vocabulaire hérité des index plein texte)."
visuals: []
labs: [ddia-ch07-l03-lab-global-index-design]
xp: 40
---

## Pourquoi c'est important

Jusqu'ici, on retrouvait un enregistrement par sa **clé primaire** : on la hache ou on la compare aux bornes, et on va sur la bonne partition. Mais les vraies applications cherchent aussi par **autre chose** : « toutes les voitures rouges », « les commandes du client 18 », « les documents contenant *partition* ». Ce sont des **index secondaires**, le pain quotidien des bases relationnelles et documentaires, et la raison d'être d'Elasticsearch ou Solr. Le problème : ils ne correspondent pas proprement aux partitions. Il faut choisir, et chaque choix rend coûteuse soit la lecture, soit l'écriture.

## Le problème

Certaines bases clé-valeur (HBase, Voldemort) évitent les index secondaires à cause de cette complexité ; d'autres (Riak) ont commencé à en ajouter, car ils sont trop utiles pour la modélisation. Deux approches existent : partitionner l'index **par document** ou **par terme**.

Exemple qui servira tout au long : un site d'annonces de voitures d'occasion. Chaque annonce a un identifiant unique (la clé primaire, qui détermine la partition), et l'utilisateur filtre par **couleur** et par **marque**.

## Index partitionné par document (index local)

Chaque partition maintient **ses propres** index secondaires, qui ne couvrent **que ses documents**. Si les annonces 0 à 499 sont dans la partition 0 et 500 à 999 dans la partition 1, la partition 0 sait que `color:rouge → [191, 306]`, et la partition 1 que `color:rouge → [768]`. Aucune ne connaît les voitures rouges de l'autre.

- **Écriture** : simple. Ajouter, modifier ou supprimer une annonce ne touche **que la partition** de cette annonce, données et index ensemble. D'où le nom d'**index local**.
- **Lecture** : coûteuse. Rien ne regroupe les voitures rouges dans une même partition (sauf si tu as fait quelque chose de spécial avec les identifiants). Pour « toutes les voitures rouges », il faut interroger **toutes** les partitions et combiner : c'est le **scatter/gather**.

### Le coût caché du scatter/gather

Une requête qui attend N partitions est aussi lente que **la plus lente** des N. C'est l'**amplification de la latence de queue** vue dans le module « Fiabilité, charge et percentiles ». Exemple : chaque partition répond en plus de 200 ms dans 1 % des cas. Pour une requête à 20 partitions, la probabilité qu'au moins une soit lente vaut 1 − 0,99²⁰ ≈ 18 %. Ta requête « rare » devient lente une fois sur cinq. Ajouter des partitions augmente la capacité de stockage, mais pas le débit de ces requêtes : chacune mobilise toutes les partitions.

Malgré cela, c'est l'approche la plus répandue : MongoDB, Riak, Cassandra, Elasticsearch, SolrCloud et VoltDB utilisent des index secondaires partitionnés par document. Les éditeurs conseillent de structurer le partitionnement pour que les requêtes fréquentes ne touchent **qu'une** partition, ce qui n'est pas toujours possible, surtout avec plusieurs filtres (couleur **et** marque).

## Index partitionné par terme (index global)

Plutôt qu'un index par partition, on construit un **index global** qui couvre les données de **toutes** les partitions. On ne peut pas le mettre sur un seul nœud (il deviendrait un goulot d'étranglement et annulerait l'intérêt de partitionner) : il est donc **lui-même partitionné**, mais **autrement que les données**.

Exemple : les voitures rouges de **toutes** les partitions sont listées sous `color:rouge` ; les couleurs de `a` à `r` vont dans la partition d'index 0, de `s` à `z` dans la partition d'index 1. L'index des marques est découpé de la même façon. Le **terme** recherché détermine la partition de l'index.

On retrouve le choix de la leçon précédente : découper l'index **par plage de termes** (utile pour des requêtes d'intervalle, « prix entre 5 000 et 8 000 € ») ou **par hachage du terme** (répartition plus uniforme).

- **Lecture** : efficace. Pas de scatter/gather : on va sur la seule partition d'index qui contient le terme, puis on lit les documents trouvés.
- **Écriture** : plus lente et plus compliquée. Une seule annonce peut toucher **plusieurs** partitions d'index : sa couleur est indexée dans l'une, sa marque dans une autre, et chaque terme peut vivre sur un nœud différent.

### Synchrone ou asynchrone ?

Dans un monde idéal, l'index serait toujours à jour : chaque document écrit serait immédiatement visible dans l'index. Pour un index global, cela exigerait une **transaction distribuée** sur toutes les partitions concernées, ce que peu de bases proposent (voir les modules sur les transactions et le consensus).

En pratique, les mises à jour des index globaux sont **souvent asynchrones** : si tu lis l'index juste après une écriture, le changement peut ne pas encore y être. Les index secondaires globaux d'Amazon DynamoDB sont ainsi mis à jour en général en une fraction de seconde, mais **peuvent avoir plus de retard** en cas de panne. Riak Search et l'entrepôt de données d'Oracle (qui laisse choisir entre index local et global) utilisent aussi des index globaux partitionnés par terme.

Tu reconnais une forme de **retard de réplication** (module « Réplication avec leader ») : un utilisateur qui publie une annonce rouge puis filtre sur « rouge » peut ne pas la voir. Les mêmes parades s'appliquent (par exemple, lire ses propres écritures depuis la partition de données).

## Choisir

| | Index local (par document) | Index global (par terme) |
|---|---|---|
| Écriture | une partition | plusieurs partitions d'index, souvent asynchrone |
| Lecture par valeur | toutes les partitions (scatter/gather) | une partition d'index, puis les documents |
| Fraîcheur | à jour avec la donnée | peut être en retard |
| Convient quand | beaucoup d'écritures, recherches rares ou tolérantes | recherches fréquentes, quelques secondes de retard acceptables |

## Pièges fréquents

- **Mettre l'index global sur un seul nœud** : il reçoit toutes les mises à jour et toutes les recherches, c'est le nouveau point chaud.
- **Sous-estimer le scatter/gather** : la latence suit la plus lente des partitions, et ajouter des nœuds n'augmente pas le débit de ces requêtes.
- **Supposer qu'un index global est à jour** juste après l'écriture : il est souvent asynchrone.
- **Oublier qu'une écriture touche plusieurs partitions d'index** avec un index global : plus de travail, et plus de choses qui peuvent échouer.

## À retenir

- Un index secondaire doit lui aussi être partitionné : par document (local) ou par terme (global).
- Local : écritures sur une partition, lectures en scatter/gather sur toutes, latence de queue amplifiée.
- Global : l'index est découpé par terme (plage ou hachage) ; une lecture vise une partition d'index, mais une écriture en touche plusieurs et l'index est souvent mis à jour de façon asynchrone.
- Le choix dépend du rapport lectures/écritures et du retard d'index acceptable.
