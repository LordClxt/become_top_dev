---
id: ddia-ch15-l01
title: "À quoi sert le traitement de flux"
source: { chapter: 11, pages: "464-468" }
duration_min: 30
concepts:
  - id: ddia-sp-three-outputs
    label: "Trois façons d'utiliser un flux : l'écrire dans un système de stockage, le pousser vers un humain, ou produire d'autres flux"
  - id: ddia-sp-cep
    label: "CEP : des requêtes stockées longtemps cherchent des motifs d'événements ; les données défilent devant les requêtes"
  - id: ddia-sp-analytics
    label: "Analytique de flux : agrégats et statistiques sur une fenêtre (débit, moyenne glissante, tendance)"
  - id: ddia-sp-probabilistic
    label: "Algorithmes probabilistes (Bloom, HyperLogLog, percentiles approchés) : réponses approchées avec peu de mémoire"
  - id: ddia-sp-maintain-views
    label: "Maintenir une vue dérivée (cache, index, vue matérialisée) à jour à partir d'un journal de changements, dont la fenêtre remonte au début des temps"
  - id: ddia-sp-search-streams
    label: "Recherche sur flux : on indexe les requêtes, et chaque document qui passe est testé contre elles (percolateur)"
  - id: ddia-sp-vs-actors
    label: "Acteurs et traitement de flux : gestion de la concurrence d'un côté, gestion de données de l'autre (logs durables, pipelines acycliques)"
glossary:
  - term: "opérateur (job)"
    definition: "Morceau de code qui consomme un ou plusieurs flux d'entrée et produit des flux de sortie ; l'équivalent en continu d'une tâche de traitement par lots."
  - term: "CEP (complex event processing)"
    definition: "Traitement d'événements complexes : on décrit un motif d'événements (langage proche de SQL ou interface graphique) et le moteur émet un événement complexe quand il le reconnaît."
  - term: "HyperLogLog"
    definition: "Algorithme probabiliste qui estime le nombre d'éléments distincts d'un flux avec quelques kilo-octets de mémoire et une erreur de l'ordre du pour cent."
  - term: "percolateur"
    definition: "Fonction d'Elasticsearch qui stocke des requêtes et teste chaque nouveau document contre elles : la recherche à l'envers."
  - term: "vue matérialisée"
    definition: "Copie précalculée du résultat d'une requête, mise à jour quand les données sources changent."
visuals: []
labs: [ddia-ch15-l01-lab-uses-design]
xp: 40
---

## Pourquoi c'est important

Le chapitre précédent t'a montré comment **transporter** des événements : brokers à file, logs partitionnés, capture des changements (CDC), event sourcing. Reste la question : une fois le flux en main, **qu'en fait-on** ? Un traitement par lots (ch. 13) lit une entrée finie et s'arrête. Un traitement de flux ne s'arrête jamais : son entrée n'a pas de fin. Ce simple fait change tout (pas de tri global possible, pas de « recommencer depuis le début » bon marché), et il oblige à savoir **pour quoi** on traite le flux, car chaque usage a ses propres exigences de latence, d'exactitude et d'état.

## Trois destinations pour un flux

Une fois que tu as un flux, tu as essentiellement trois options :

1. **L'écrire dans un système de stockage** (base, cache, index de recherche) où d'autres clients l'interrogeront. C'est la façon de garder un système dérivé synchronisé : l'équivalent continu d'un job batch qui produit un index.
2. **Le pousser vers des humains** : alerte e-mail, notification mobile, tableau de bord temps réel. L'humain est le consommateur final.
3. **Produire un ou plusieurs autres flux** : un processus lit des flux d'entrée et écrit des flux de sortie, et l'on enchaîne ces étapes en pipeline. C'est ce troisième cas qu'on appelle proprement **traitement de flux**, et le code qui le fait est un **opérateur** (ou *job*).

Le schéma ressemble beaucoup à Unix et à MapReduce : on lit en lecture seule, on écrit en ajout seul, on partitionne et on parallélise de la même façon. Les opérations de transformation et de filtrage d'enregistrements sont identiques. La différence fondamentale reste le **flux infini** : un tri ne peut pas se faire (on n'a jamais tout vu), donc une jointure par tri-fusion est impossible, et la tolérance aux pannes doit trouver autre chose que « relancer depuis le début ». Un job qui tourne depuis un an ne peut pas être rejoué entièrement après une panne.

## Le traitement d'événements complexes (CEP)

Historiquement, le traitement de flux sert d'abord à la **surveillance** : une banque qui détecte qu'une carte est utilisée à Lyon puis à Singapour en vingt minutes, une salle de marché qui réagit à des mouvements de prix, une usine qui guette la dérive d'un capteur, un système militaire qui signale une activité suspecte.

Le **CEP**, apparu dans les années 1990, formalise cela : tu décris un **motif** d'événements, souvent dans un langage proche de SQL (« trois échecs de connexion pour le même compte en moins de 2 minutes, suivis d'un succès depuis un autre pays »), et le moteur maintient une machine à états qui émet un **événement complexe** quand le motif apparaît. Esper, IBM InfoSphere Streams, Apama, TIBCO StreamBase ou SQLstream en sont des implémentations.

Le point clé est l'**inversion des rôles** par rapport à une base de données :

- dans une base, les **données** sont persistantes et la **requête** est éphémère : elle arrive, lit, repart ;
- dans un moteur CEP, ce sont les **requêtes** qui sont stockées longtemps, et les **événements** défilent devant elles. Ce qui « reste », c'est la question.

## L'analytique de flux

Frontière floue avec le CEP, mais l'accent est différent : on cherche moins une séquence précise d'événements que des **agrégats et des statistiques** sur beaucoup d'événements :

- le **débit** d'un type d'événement (combien de paiements par seconde ?) ;
- la **moyenne glissante** d'une valeur sur une période (latence moyenne des 5 dernières minutes) ;
- la **comparaison** avec une période précédente pour repérer une tendance (« +40 % d'erreurs 500 par rapport à la même heure hier »).

Ces statistiques sont calculées sur un **intervalle de temps fixe** : la **fenêtre**. Lisser sur 5 minutes gomme les fluctuations d'une seconde à l'autre tout en donnant une image à jour ; on verra en leçon 3 les différents types de fenêtres.

Pour tenir la cadence avec peu de mémoire, l'analytique de flux s'appuie souvent sur des **algorithmes probabilistes** :

- **filtre de Bloom** (déjà croisé avec les SSTables au ch. 2) pour l'appartenance à un ensemble ;
- **HyperLogLog** pour estimer le nombre d'éléments distincts : compter les visiteurs uniques d'une journée avec 12 Ko au lieu d'un ensemble de 50 millions d'identifiants ;
- estimation de **percentiles** (rappel du ch. 0 : le p99 compte plus que la moyenne).

Attention à une idée reçue : un système de flux n'est **pas intrinsèquement approximatif**. Les algorithmes probabilistes sont une **optimisation** qu'on choisit, pas une limite du modèle. Apache Storm, Spark Streaming, Flink, Concord, Samza et Kafka Streams sont des frameworks open source conçus pour l'analytique ; Google Cloud Dataflow et Azure Stream Analytics en sont des versions hébergées.

## Maintenir des vues matérialisées

Au chapitre précédent, la CDC et l'event sourcing produisaient un flux de **changements** : un consommateur peut s'en servir pour tenir à jour un cache, un index de recherche ou un entrepôt. C'est un cas particulier de **maintien de vue matérialisée** : une vue dérivée d'un jeu de données, qu'on garde synchronisée pour l'interroger efficacement. En event sourcing, l'état de l'application lui-même est une vue matérialisée du journal d'événements.

Différence avec l'analytique : ici, une fenêtre de 5 minutes ne suffit pas. Pour reconstruire l'état d'un compte, il faut **tous** les événements depuis l'origine, à l'exception de ceux rendus obsolètes par la **compaction de log**. La fenêtre remonte donc **au début des temps**. Certains frameworks d'analytique pensés pour des fenêtres courtes s'y prêtent mal ; Samza et Kafka Streams le prennent en charge explicitement, en s'appuyant sur la compaction de Kafka.

## Rechercher dans un flux

Autre besoin : une agence immobilière veut prévenir un client dès qu'un appartement de 3 pièces à moins de 400 000 € sort à Nantes ; un service de veille média veut tous les articles qui mentionnent une marque. C'est la recherche **à l'envers** :

- une recherche classique indexe les **documents** et fait passer une requête dessus ;
- ici, on **stocke les requêtes**, et chaque **document** qui arrive est testé contre elles.

Le **percolateur** d'Elasticsearch implémente cette idée. Tester chaque document contre 2 millions de requêtes une par une serait trop lent ; on **indexe les requêtes** elles-mêmes, pour ne tester que celles qui peuvent correspondre (même principe que le CEP : la requête est l'objet persistant).

## Messages, RPC et acteurs

On a vu au ch. 4 les frameworks d'acteurs : eux aussi échangent des messages. Sont-ils des systèmes de flux ? Pas vraiment, et la nuance compte :

| | Acteurs | Traitement de flux |
|---|---|---|
| But premier | gérer la **concurrence** et l'exécution distribuée | technique de **gestion de données** |
| Communication | souvent éphémère, **un à un** | **logs d'événements durables**, plusieurs abonnés |
| Topologie | n'importe quel motif, **cycles** compris (requête/réponse) | **pipelines acycliques**, chaque flux est la sortie d'un job |

Il existe des zones de recouvrement : la fonction *distributed RPC* d'Apache Storm envoie des requêtes à travers un pipeline de flux et renvoie la réponse à l'appelant. Et l'on peut faire du traitement de flux avec un framework d'acteurs, mais il ne garantit généralement pas la livraison en cas de panne : il faudra ajouter la tolérance aux pannes soi-même.

## Pièges fréquents

- **Confondre l'usage et l'outil** : un tableau de bord sur 5 minutes et une vue matérialisée de profils n'ont pas la même fenêtre (5 minutes contre « depuis toujours »).
- **Croire que le flux est forcément approximatif** : HyperLogLog est un choix d'optimisation, pas une fatalité.
- **Faire une recherche sur flux en testant chaque requête une à une** : il faut indexer les requêtes.
- **Prendre un système d'acteurs pour un broker durable** : messages éphémères, pas de relecture, livraison non garantie.

## À retenir

- Un flux s'écrit dans un stockage, se pousse vers un humain, ou alimente d'autres flux (opérateurs en pipeline).
- CEP et recherche sur flux inversent la base de données : les requêtes sont stockées, les données défilent.
- L'analytique agrège sur des fenêtres de temps, souvent avec des algorithmes probabilistes optionnels.
- Maintenir une vue dérivée exige tout l'historique (compacté) : la fenêtre va jusqu'au début des temps.
- Acteurs = concurrence et messages éphémères ; flux = données, logs durables, pipelines acycliques.
