---
id: ddia-ch00-l01
title: "Systèmes de données et trois exigences"
source: { chapter: 1, pages: "25-28" }
duration_min: 20
concepts:
  - id: ddia-data-intensive
    label: "Application intensive en données plutôt qu'en calcul"
  - id: ddia-composite-system
    label: "Un système de données composite : plusieurs outils assemblés par du code"
  - id: ddia-three-concerns
    label: "Fiabilité, scalabilité et maintenabilité : trois exigences à définir précisément"
glossary:
  - term: "application intensive en données"
    definition: "Application dont la difficulté vient du volume, de la complexité et du rythme de changement des données, plus que de la puissance de calcul brute."
  - term: "système de données"
    definition: "Brique qui stocke ou transporte des données : base, cache, index de recherche, file de messages, traitement par lots ou en flux."
  - term: "exigence non fonctionnelle"
    definition: "Propriété que le système doit avoir au-delà de ce qu'il fait : fiabilité, performance, sécurité, maintenabilité."
  - term: "fiabilité"
    definition: "Continuer à fonctionner correctement, au niveau de performance attendu, même quand des choses tournent mal."
visuals: [ddia-ch00-composite-system]
labs: []
xp: 20
---

## Pourquoi c'est important

La plupart des applications que tu écriras ne sont pas limitées par la vitesse du processeur. Elles sont limitées par la **quantité** de données, leur **complexité** et la vitesse à laquelle elles **changent**. Ce cours est consacré à cette famille d'applications, et à la boîte à outils qui permet de les construire : bases de données, caches, index de recherche, files de messages, traitements par lots. Avant de plonger dans les mécanismes, cette première leçon fixe le vocabulaire et les trois questions qui guideront toute la suite.

## Intensif en données ou en calcul ?

Une application est **intensive en calcul** quand son goulet d'étranglement est le processeur (simulation, rendu, entraînement). Elle est **intensive en données** quand le défi est de stocker, retrouver et faire évoluer beaucoup de données de façon fiable. Une boutique en ligne, un réseau social, un outil de facturation : le processeur y est rarement saturé, mais la cohérence du stock, la rapidité d'un fil d'actualité ou la perte d'une commande sont des problèmes quotidiens.

Ces applications se construisent à partir de briques standard :

| Besoin | Brique | Exemples |
|---|---|---|
| Stocker pour retrouver plus tard | base de données | PostgreSQL, MySQL |
| Mémoriser le résultat d'une opération coûteuse | cache | Redis, Memcached |
| Chercher par mot-clé ou filtrer | index de recherche | Elasticsearch, Solr |
| Envoyer un message à traiter plus tard | traitement de flux / file | Kafka |
| Traiter périodiquement un gros volume accumulé | traitement par lots | Hadoop, Spark |

Ces briques forment une abstraction si réussie qu'on les utilise sans y penser. Personne n'écrit son propre moteur de stockage « pour une application web », parce qu'une base de données fait très bien le travail.

## Mais le choix de la brique n'est pas simple

Il existe de nombreuses bases de données, parce que les applications ont des besoins différents. Il y a plusieurs approches du cache, plusieurs façons de construire un index de recherche. Et il est difficile de **combiner** les outils quand un seul ne suffit pas.

Deux phénomènes brouillent les catégories :

1. **Les frontières s'estompent.** Redis est un magasin de données qu'on utilise aussi comme file de messages. Kafka est une file de messages avec des garanties de durabilité proches de celles d'une base.
2. **Les besoins dépassent un seul outil.** Beaucoup d'applications ont des exigences si variées qu'aucun outil unique ne les couvre. On découpe alors le travail en tâches que chaque outil exécute bien, et on les **recolle avec du code applicatif**.

Exemple typique : une base principale, un cache géré par l'application, un serveur de recherche séparé. C'est au code de l'application de garder le cache et l'index **synchronisés** avec la base.

::visual{id="ddia-ch00-composite-system"}

## Tu deviens concepteur de système de données

Quand tu assembles plusieurs outils, l'interface de ton service cache les détails d'implémentation aux clients. Tu viens, en fait, de créer un **nouveau système de données**, spécialisé, à partir de composants généralistes. Et ce système offre (ou n'offre pas) des garanties : par exemple « le cache est invalidé ou mis à jour à chaque écriture, donc les clients voient des résultats cohérents ».

Tu n'es plus seulement développeur d'applications : tu es **concepteur de système de données**. Les questions difficiles arrivent :

- Comment garder les données **correctes et complètes** quand des choses échouent en interne ?
- Comment garantir de bonnes **performances** même quand une partie du système est dégradée ?
- Comment **passer à l'échelle** quand la charge augmente ?
- À quoi ressemble une **bonne API** pour ce service ?

Beaucoup de facteurs influencent les réponses : compétences de l'équipe, systèmes hérités, délais de livraison, tolérance de l'organisation à différents risques, contraintes réglementaires. Il n'existe pas de recette universelle : il existe des **principes** et des **compromis** (*trade-offs*).

## Les trois exigences

Le livre se concentre sur trois préoccupations importantes dans la plupart des systèmes logiciels.

### Fiabilité

> Le système doit continuer à fonctionner **correctement** (faire la bonne chose, au niveau de performance voulu), même face à l'adversité : pannes matérielles, bugs logiciels, erreurs humaines.

### Scalabilité

> Quand le système grandit (en volume de données, en trafic, en complexité), il doit exister des moyens **raisonnables** de gérer cette croissance.

### Maintenabilité

> Avec le temps, beaucoup de personnes différentes travailleront sur le système (ingénierie et exploitation, pour maintenir le comportement actuel et l'adapter à de nouveaux usages). Elles doivent pouvoir y travailler **efficacement**.

Ces trois mots sont lancés à tout propos, sans définition claire. D'où les trois prochaines leçons : on va les rendre mesurables.

## Exigences fonctionnelles et non fonctionnelles

Une application doit remplir des **exigences fonctionnelles** (ce qu'elle fait : stocker, retrouver, chercher, traiter les données) et des **exigences non fonctionnelles** (propriétés générales : sécurité, fiabilité, conformité, scalabilité, compatibilité, maintenabilité). Les premières font vendre le produit ; les secondes décident s'il survit en production.

> **Au-delà du livre.** Les équipes de fiabilité (SRE) traduisent aujourd'hui ces trois mots en chiffres : un **SLI** (ce qu'on mesure, par exemple la proportion de requêtes réussies en moins de 300 ms), un **SLO** (l'objectif visé sur ce SLI) et un **budget d'erreur** (la marge d'échec acceptée). Tu retrouveras les SLO au prochain module.

## Pièges fréquents

- **Parler de scalabilité, de fiabilité ou de performance sans chiffres.** « Notre système est scalable » ne veut rien dire tant qu'on n'a pas dit *quelle charge* et *quelle croissance*.
- **Empiler les outils par réflexe** (« il nous faut Kafka, Redis et Elasticsearch ») avant d'avoir compris le besoin. Chaque outil ajouté est un système à garder synchronisé.
- **Oublier que le code qui recolle les outils est la partie fragile** : invalidation de cache, double écriture, rattrapage après panne.
- **Croire qu'il existe un choix « correct » universel.** Chaque choix est un compromis dépendant du contexte.

## À retenir

- Une application intensive en données est limitée par le volume, la complexité et la vitesse de changement des données, pas par le CPU.
- Elle se construit avec des briques standard (base, cache, index, flux, lots) qu'on assemble, ce qui fait de toi un concepteur de système de données.
- Fiabilité (continuer à bien fonctionner malgré les fautes), scalabilité (grandir raisonnablement), maintenabilité (rester productif sur la durée) : trois exigences à rendre mesurables.
- Il n'y a pas de solution universelle, seulement des principes et des compromis.
