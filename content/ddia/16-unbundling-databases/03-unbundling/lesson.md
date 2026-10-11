---
id: ddia-ch16-l03
title: "Dégrouper la base : index, caches et vues comme abonnés d'un log"
source: { chapter: 12, pages: "499-504" }
duration_min: 40
concepts:
  - id: ddia-unbundled-database
    label: "Une base contient déjà des données dérivées (index, vues, réplicas) ; dégrouper, c'est faire la même chose entre systèmes"
  - id: ddia-index-as-stream
    label: "Créer un index = instantané cohérent + rattrapage du log + suivi des nouvelles écritures"
  - id: ddia-federated-vs-unbundled
    label: "Méta-base de données : fédération (unifier les lectures) contre dégroupement (unifier les écritures)"
  - id: ddia-unbundling-async-log
    label: "Faire marcher le dégroupement : log asynchrone et écritures idempotentes plutôt que transactions hétérogènes"
  - id: ddia-unbundled-vs-integrated
    label: "Dégroupé ou intégré : combiner seulement quand un seul outil ne suffit pas ; il manque encore un langage de composition"
glossary:
  - term: "dégrouper (unbundle)"
    definition: "Séparer les fonctions qu'une base intègre (stockage, index, vues, réplication) en systèmes distincts reliés par un log d'événements."
  - term: "base fédérée (polystore)"
    definition: "Une interface de requête unique au-dessus de plusieurs systèmes de stockage, qui unifie les lectures."
  - term: "philosophie Unix"
    definition: "Des outils simples qui font une seule chose bien, composés par un mécanisme uniforme (le tube et ses octets)."
  - term: "couplage faible"
    definition: "Les composants ne se connaissent que par une interface stable (ici le log) : ils évoluent et tombent en panne indépendamment."
visuals: []
labs: [ddia-ch16-l03-lab-unbundled-design]
xp: 40
---

## Pourquoi c'est important

On pense souvent à une base de données comme à une boîte noire : on écrit, on lit. Mais à l'intérieur, elle passe son temps à **dériver** des données : elle met à jour des index, des vues matérialisées, des réplicas. Le livre propose de regarder une architecture entière avec ces lunettes : un index Elasticsearch alimenté par CDC n'est rien d'autre qu'un **index secondaire** sorti de la base. Comprendre ce parallèle te donne un modèle mental pour concevoir, et un vocabulaire pour juger quand cela vaut la peine.

## Ce que la base fait déjà en interne

Les bases et les systèmes Unix ont des philosophies opposées :

- **Unix** offre une abstraction de bas niveau, presque brute (des fichiers, des octets), et la **composition** d'outils simples par des tubes ;
- une **base relationnelle** offre une abstraction de haut niveau (SQL déclaratif, transactions) qui cache la complexité des structures de données, de la concurrence et des pannes.

Le livre voit dans la base une collection de **mécanismes de dérivation** que tu utilises sans y penser :

- un **index secondaire** est dérivé de la table ;
- une **vue matérialisée** est une forme de cache précalculé ;
- un **réplica** est dérivé du log de réplication ;
- un **index plein texte** est dérivé des documents ;
- les **déclencheurs** et procédures stockées réagissent aux changements.

« Dégrouper » (*unbundle*), c'est faire ces mêmes dérivations **entre systèmes**, chacun spécialisé, plutôt qu'à l'intérieur d'un seul produit.

## Créer un index, c'est consommer un flux

Que fait une base quand tu lances `CREATE INDEX` sur une table vivante de 50 millions de lignes ?

1. elle prend un **instantané cohérent** de la table ;
2. elle parcourt toutes les lignes, extrait la valeur indexée, trie, écrit l'index ;
3. elle applique ensuite le **retard** : les écritures arrivées depuis l'instantané ;
4. puis elle **maintient** l'index à chaque nouvelle écriture.

C'est exactement ce que tu fais pour **ajouter un réplica** (chapitre sur la réplication : instantané associé à une position dans le log, puis rattrapage) ou pour **amorcer une capture de changements** vers un nouvel index de recherche. Créer un index n'est qu'un cas particulier de « retraiter le log existant puis suivre le flux ». Les mêmes outils marchent dans les deux cas.

## La méta-base de données de tout

Si l'on regarde tous les flux d'une organisation, on voit **une énorme base de données** : chaque fois qu'un processus par lots, un processeur de flux ou un ETL transporte des données d'un endroit à un autre, il joue le rôle de la routine interne qui maintient un index ou une vue. Les traitements de lots et de flux sont des déclencheurs, des procédures stockées et des mainteneurs de vues, **à l'échelle de l'organisation**.

Le livre voit deux manières d'unifier ce patchwork :

| | Fédération (unifier les **lectures**) | Dégroupement (unifier les **écritures**) |
|---|---|---|
| Idée | une interface de requête unique sur des moteurs différents | un log qui synchronise les écritures entre moteurs |
| Exemple | les *foreign data wrappers* de PostgreSQL, les « polystores » | CDC + log de type Kafka + consommateurs |
| Ce que ça règle | interroger plusieurs systèmes ensemble | garder des systèmes différents d'accord |
| Ce que ça ne règle pas | la synchronisation des écritures | une requête unique sur tout |

La fédération suit la tradition relationnelle (un langage de haut niveau). Le dégroupement suit la tradition Unix : de petits outils qui font une chose bien, reliés par une API uniforme, ici **le log**. Le livre juge le second problème, synchroniser les écritures, le plus difficile, donc le plus intéressant.

## Faire marcher le dégroupement

Garder des écritures cohérentes entre plusieurs systèmes de stockage, c'est le problème classique. Deux voies :

- **transactions distribuées entre systèmes hétérogènes** : il faudrait que tous parlent le même protocole de validation ; en pratique cela marche mal (XA, chapitre sur le consensus) ;
- **log d'événements ordonné + consommateurs idempotents** : beaucoup plus robuste et réaliste.

Le log apporte surtout du **couplage faible**, à deux niveaux :

- **niveau système** : le log **met en tampon** ; si l'index de recherche tombe pendant 2 heures, le producteur et les autres consommateurs continuent, et l'index rattrape à son retour. Une transaction distribuée, elle, échoue si un participant est absent : elle **amplifie** les pannes ;
- **niveau humain** : l'équipe qui possède l'index et celle qui possède la base évoluent **indépendamment** ; elles ne partagent qu'un format d'événements. Chaque équipe se spécialise sur son outil.

Condition indispensable : des consommateurs **idempotents**. Avec une livraison « au moins une fois », un changement peut arriver deux fois ; on note l'offset déjà appliqué et on ignore ce qui est en double (chapitre sur le traitement de flux).

## Dégroupé ou intégré ?

Le dégroupement **ne remplace pas** les bases : elles restent nécessaires pour stocker l'état des consommateurs et répondre aux requêtes. L'objectif est de **combiner** plusieurs bases pour couvrir plus d'usages qu'un seul produit, avec une bonne performance sur chacun.

Mais un système intégré a ses atouts : une performance plus prévisible, des optimisations transversales (un optimiseur de requêtes connaît tous les index), une seule chose à exploiter. Le livre est clair : **si un seul produit couvre tes besoins, utilise-le**. Dégrouper n'a d'intérêt que lorsqu'aucun logiciel ne fait tout ce dont tu as besoin. Le but n'est pas la composition pour elle-même, c'est la **largeur** de ce qu'on peut faire.

### Ce qui manque
Il n'existe pas encore d'équivalent de l'interpréteur Unix pour les données : un langage déclaratif où l'on écrirait « mes données MySQL doivent être indexées dans Elasticsearch » (l'idée d'un `mysql | elasticsearch`) et où l'outil installerait seul l'instantané, le CDC et la maintenance. Même chose pour déclarer un cache précalculé ou une vue. Des travaux de recherche comme le *differential dataflow* vont dans ce sens.

### Aller plus loin
Depuis le livre, des outils comme Debezium + Kafka Connect (connecteurs source et puits configurés en JSON) ou Materialize (vues SQL maintenues de façon incrémentale sur un flux, issu du differential dataflow) se rapprochent de cette « coquille Unix des données ».

## Pièges fréquents

- **Dégrouper par principe** : si PostgreSQL et son index plein texte suffisent, un pipeline CDC ajoute surtout de l'exploitation.
- **Confondre fédération et dégroupement** : interroger plusieurs systèmes ensemble ne les garde pas cohérents.
- **Consommateur non idempotent** : la première relivraison double un compteur.
- **Oublier l'instantané initial** : un nouvel index alimenté par le seul flux ignore tout l'existant.

## À retenir

- Une base dérive déjà des données (index, vues, réplicas) ; dégrouper, c'est le faire entre systèmes.
- Créer un index = instantané + rattrapage + suivi : comme un réplica ou un amorçage CDC.
- Fédération unifie les lectures ; dégroupement unifie les écritures via un log.
- Log + consommateurs idempotents : couplage faible des systèmes et des équipes.
- Ne combine des outils que si un seul ne suffit pas.
