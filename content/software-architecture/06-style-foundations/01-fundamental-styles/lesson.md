---
id: arch-ch06-l01
title: "Les styles fondamentaux"
source: { chapter: 9, pages: "139-144" }
duration_min: 30
concepts:
  - id: arch-style-name
    label: "Un nom de style condense une topologie, des caractéristiques par défaut, un modèle de déploiement et de données"
  - id: arch-big-ball-of-mud
    label: "Big Ball of Mud : l'absence de structure discernable, fruit d'une croissance sans gouvernance"
  - id: arch-client-server
    label: "Unitaire, client/serveur (bureau + base, navigateur + serveur web) et trois tiers"
  - id: arch-long-term-simplicity
    label: "Les décisions ont des conséquences à long terme imprévisibles : préférer la simplicité (la sérialisation Java)"
  - id: arch-monolithic-distributed
    label: "Styles monolithiques (couches, pipeline, microkernel) et distribués (service-based, event-driven, space-based, SOA, microservices)"
glossary:
  - term: "Big Ball of Mud"
    definition: "Anti-pattern (Foote et Yoder, 1997) : un système sans structure, où l'information est partagée partout et tout dépend de tout."
  - term: "architecture unitaire"
    definition: "Un seul système, une seule machine : aujourd'hui surtout dans l'embarqué."
  - term: "client/serveur (deux tiers)"
    definition: "Séparation entre une interface (bureau ou navigateur) et un serveur (base, ou serveur web + base)."
  - term: "trois tiers"
    definition: "Base de données, serveur d'application, interface : populaire à la fin des années 1990 (CORBA, DCOM)."
  - term: "architecture distribuée"
    definition: "Plusieurs unités de déploiement reliées par des protocoles d'accès distant."
visuals: [arch-ch06-mud-circle]
labs: [arch-ch06-l01-lab-warmup-name-the-style]
xp: 30
---

## Pourquoi c'est important

Quand un architecte dit « monolithe en couches », son interlocuteur entend aussitôt une structure, des caractéristiques qui marchent bien (et d'autres qui posent problème), un mode de déploiement, une stratégie de données. Un nom de style est un **raccourci** entre gens du métier, comme un nom de design pattern. Avant d'étudier les styles un par un (modules 07 à 10 et au-delà), cette leçon pose le vocabulaire de base, et le premier grand partage : **monolithique** ou **distribué**.

## Ce que dit un nom de style

Un style d'architecture (parfois appelé *pattern* d'architecture) décrit une **relation nommée de composants**, avec :

- sa **topologie** ;
- ses caractéristiques **supposées et par défaut**, bonnes et mauvaises ;
- ses modèles de **déploiement** et de **données** typiques.

Quelques patterns **fondamentaux** reviennent sans cesse, souvent cachés à l'intérieur des styles plus grands. Les **couches**, par exemple, sont aussi vieilles que le logiciel et réapparaissent sous de nouvelles formes.

## Le Big Ball of Mud

L'absence de toute structure discernable a un nom, tiré d'un article de Brian Foote et Joseph Yoder (1997) : la **grosse boule de boue**. Ils décrivent un système structuré au hasard, tentaculaire, bricolé au scotch et au fil de fer, une jungle de code spaghetti, qui porte les marques d'une **croissance non régulée** et de **réparations expéditives répétées**. L'information y est partagée sans discernement entre des éléments éloignés, au point que presque tout ce qui compte devient global ou dupliqué.

En termes modernes : une application de scripts dont les gestionnaires d'événements appellent directement la base, sans structure interne. Beaucoup d'applications triviales commencent ainsi, puis deviennent ingérables en grossissant. Une boule de boue rend chaque changement plus difficile, et souffre en **déploiement**, **testabilité**, **scalabilité** et **performance**.

Personne n'en crée une volontairement. Elle naît d'un **manque de gouvernance** de la qualité et de la structure du code. Neal Ford montre la visualisation du couplage d'une application Java construite à la hâte pendant des années : chaque classe est un point sur un cercle, chaque dépendance une ligne ; le cercle est noir de traits. Dans un tel code, impossible de prévoir l'onde de choc d'un changement : modifier devient terrifiant. Les fitness functions du module 03 (cycles, couches, distance) sont précisément l'antidote.

## Unitaire, puis client/serveur

Au départ, il n'y avait que l'ordinateur, et le logiciel tournait dessus : l'architecture **unitaire**. Les mainframes, puis les premiers PC, ont commencé ainsi, avant de séparer les données dans leurs propres systèmes. Aujourd'hui, l'unitaire ne survit guère que dans l'**embarqué** et les environnements très contraints : les systèmes grossissent et ont besoin de séparer les préoccupations pour tenir leurs caractéristiques opérationnelles.

Le premier découpage fondamental sépare l'avant et l'arrière : le **client/serveur**, ou **deux tiers**.

- **Bureau + serveur de base de données** : une application riche (Windows, par exemple) sur le poste, les données sur un serveur de base dédié, plus robuste, joint par le réseau.
- **Navigateur + serveur web** : le client devient encore plus léger. Même si le serveur web et la base sont séparés, on parle souvent encore de deux tiers, car les deux tournent dans la salle des serveurs et l'interface dans le navigateur.
- **Trois tiers** (fin des années 1990) : un tier de base de données industrielle, un tier applicatif géré par un **serveur d'application** (Java, .NET), une interface en HTML généré, puis en JavaScript. Il allait de pair avec des protocoles comme **CORBA** et **DCOM**, dont les capacités existent aujourd'hui sous forme d'outils (files de messages) ou de styles (event-driven, module 10).

### Une leçon de long terme : la sérialisation Java

Quand Java a été conçu, le trois tiers était à la mode, et l'on pensait que **tous** les systèmes seraient trois tiers pour toujours. Déplacer des objets sur le réseau était pénible en C++ ; les concepteurs ont donc intégré la **sérialisation** au cœur du langage. Le style est passé ; la sérialisation est restée, et pèse encore sur les concepteurs du langage qui doivent la supporter pour la compatibilité, alors que presque personne ne s'en sert.

Anticiper les conséquences à long terme d'une décision nous échappe, en logiciel comme ailleurs. Le conseil perpétuel de **préférer la simplicité** est, en grande partie, une **défense** contre ces conséquences futures.

## Monolithique ou distribué

Les styles se rangent en deux familles :

- **Monolithiques** : une seule unité de déploiement pour tout le code. Le livre détaille l'architecture **en couches** (module 07), **pipeline** (module 07) et **microkernel** (module 08).
- **Distribués** : plusieurs unités de déploiement reliées par des protocoles d'accès distant. **Service-based** (module 09), **event-driven** (module 10), puis **space-based**, **SOA orchestrée** et **microservices**.

Aucune classification n'est parfaite, mais celle-ci sépare bien les styles, parce que **tous** les styles distribués partagent un ensemble de défis absents des monolithes. Ils sont beaucoup plus puissants en performance, scalabilité et disponibilité, mais ce pouvoir a un prix : c'est l'objet des deux leçons suivantes.

### Sous le capot : à quoi ressemble une boule de boue mesurée

```typescript
// Densité de dépendances : arêtes réelles / arêtes possibles entre n modules.
const density = (n: number, edges: number) => edges / (n * (n - 1));
console.log(density(40, 60).toFixed(3), density(40, 900).toFixed(3));
// 0.038 0.577
```

Un système de 40 modules et 60 dépendances est structuré ; avec 900, plus de la moitié de toutes les paires possibles sont reliées. C'est le cercle noir de traits de Neal Ford, en un nombre : une métrique simple à suivre dans le temps.

::visual{id="arch-ch06-mud-circle"}

## Pièges fréquents

- **Croire qu'on ne fait pas de boule de boue** : on n'en décide jamais, on y glisse faute de gouvernance.
- **Confondre deux tiers et deux machines** : navigateur + serveur web + base est souvent appelé deux tiers.
- **Graver un style du moment dans quelque chose de durable** (un langage, un framework, un format) : la sérialisation Java.
- **Passer au distribué pour la puissance** sans en accepter les défis communs.

## À retenir

- Un **nom de style** condense topologie, caractéristiques par défaut, déploiement et données.
- **Big Ball of Mud** : pas de structure, croissance non régulée ; l'antidote est la gouvernance.
- **Unitaire** → **client/serveur** (bureau + base, navigateur + serveur web) → **trois tiers**.
- **Préférer la simplicité** protège des conséquences à long terme qu'on ne sait pas prévoir.
- **Monolithiques** : couches, pipeline, microkernel. **Distribués** : service-based, event-driven, space-based, SOA, microservices, tous soumis aux mêmes défis.
