---
id: arch-ch06-l03
title: "Les erreurs du distribué (2) : l'exploitation, et le reste"
source: { chapter: 9, pages: "148-152" }
duration_min: 40
concepts:
  - id: arch-fallacy-topology
    label: "Erreur 5 : la topologie ne change jamais. Une mise à jour « mineure » invalide les hypothèses de latence"
  - id: arch-fallacy-admins
    label: "Erreur 6 : il n'y a qu'un administrateur. En réalité, des dizaines, à coordonner"
  - id: arch-fallacy-cost-homogeneous
    label: "Erreurs 7 et 8 : le transport est gratuit, le réseau est homogène"
  - id: arch-distributed-concerns
    label: "Journalisation distribuée, transactions (cohérence à terme, sagas, BASE), contrats et versions"
glossary:
  - term: "topologie réseau"
    definition: "L'ensemble des routeurs, commutateurs, pare-feu, réseaux et équipements qui relient les services."
  - term: "cohérence à terme (eventual consistency)"
    definition: "Les données de plusieurs unités finiront par être cohérentes, à un moment non spécifié."
  - term: "saga"
    definition: "Transaction distribuée gérée par une suite d'étapes, avec compensation (événements) ou machine à états en cas d'échec."
  - term: "BASE"
    definition: "Basic availability, Soft state, Eventual consistency : une technique (pas un logiciel) opposée à ACID."
  - term: "ACID"
    definition: "Atomicité, cohérence, isolation, durabilité : les garanties d'une transaction classique de base de données."
visuals: []
labs: [arch-ch06-l03-lab-audit-the-proposal, arch-ch06-l03-lab-monday-timeouts]
xp: 40
---

## Pourquoi c'est important

Les quatre premières erreurs concernent le réseau vu du code. Les quatre suivantes concernent le réseau vu de l'**organisation** : qui le change, qui le gère, combien il coûte, de quoi il est fait. Et au-delà des huit erreurs, le distribué apporte trois difficultés qui n'existent pas dans un monolithe : retrouver une requête dans les journaux, garder des données cohérentes sans transaction, et faire évoluer des contrats entre équipes.

## Erreur 5 : la topologie ne change jamais

La topologie, ce sont tous les routeurs, concentrateurs, commutateurs, pare-feu, réseaux et équipements. On suppose qu'elle est fixe ; elle **change tout le temps**.

Le scénario du livre : lundi matin, tout le monde court partout parce que des services expirent en production. Aucun service n'a été déployé du week-end. Après des heures d'enquête, l'architecte découvre qu'une mise à jour réseau « **mineure** » a eu lieu à **2 h du matin** : elle a invalidé toutes les hypothèses de latence, déclenchant timeouts et circuit breakers.

La parade : être en **communication constante** avec l'exploitation et les administrateurs réseau, pour savoir ce qui change et quand, et ajuster. Facile à dire, difficile à faire… ce qui mène à l'erreur suivante.

## Erreur 6 : il n'y a qu'un administrateur

Une grande entreprise compte des **dizaines** d'administrateurs réseau. À qui parler de la latence (erreur 2) ou des changements de topologie (erreur 5) ? Cette erreur révèle la **complexité de coordination** du distribué. Un monolithe, unité de déploiement unique, n'exige pas ce niveau de communication et de collaboration.

## Erreur 7 : le transport ne coûte rien

On la confond souvent avec la latence. Il s'agit ici d'**argent** : le coût réel d'un « simple appel REST ». On suppose que l'infrastructure nécessaire est en place et suffisante pour découper un monolithe ; elle ne l'est généralement **pas**. Les architectures distribuées coûtent nettement plus cher : matériel et serveurs supplémentaires, gateways, pare-feu, nouveaux sous-réseaux, proxies… Avant de se lancer, il faut analyser la topologie actuelle (capacité, bande passante, latence, zones de sécurité) pour ne pas être pris par surprise.

## Erreur 8 : le réseau est homogène

On suppose un réseau fait d'un seul fournisseur de matériel. Rien de plus faux : la plupart des entreprises en ont plusieurs. Le matériel Juniper s'intègre-t-il parfaitement avec Cisco ? Les standards ont progressé, mais toutes les situations, charges et circonstances n'ont pas été testées, et des **paquets se perdent** parfois. Ce qui ramène à la fiabilité (1), à la latence (2) et à la bande passante (3) : cette erreur boucle sur toutes les autres, en une spirale de confusion bien connue de quiconque exploite du distribué.

## Les autres défis du distribué

Le livre en liste trois, sans entrer dans le détail :

### La journalisation distribuée

Trouver pourquoi une commande a été perdue est **difficile et long** en distribué : un monolithe a typiquement **un** journal, où l'on suit une requête de bout en bout ; une architecture distribuée en a des dizaines ou des centaines, à des endroits différents, dans des formats différents. Des outils de consolidation (Splunk et consorts) aident, mais ne font qu'effleurer le problème. (Hors livre : la pratique standard est de propager un **identifiant de corrélation** dans chaque appel et chaque message, et d'utiliser le traçage distribué, par exemple OpenTelemetry.)

### Les transactions distribuées

Dans un monolithe, on tient les transactions pour acquises : commit et rollback **ACID** garantissent des données cohérentes et intègres. En distribué, ce n'est plus le cas. On s'appuie sur la **cohérence à terme** : les données des différentes unités finiront par être cohérentes, à un moment **non spécifié**. C'est **le** trade-off du distribué : scalabilité, performance et disponibilité, **au prix** de la cohérence et de l'intégrité des données.

Deux outils :

- les **sagas transactionnelles**, qui s'appuient sur l'**event sourcing** pour la compensation, ou sur des **machines à états** pour suivre l'état de la transaction ;
- les transactions **BASE** (*Basic availability, Soft state, Eventual consistency*) : une **technique**, pas un logiciel. L'« état mou » désigne les données en transit d'une source vers une cible et l'incohérence temporaire entre sources ; grâce à la disponibilité de base des services et à des patterns de messagerie, le système **finit** par devenir cohérent.

### Contrats et versions

Un **contrat**, c'est le comportement et les données sur lesquels client et service s'accordent. Le créer, le maintenir et le **versionner** est particulièrement difficile en distribué, parce que les services appartiennent à des équipes et des départements différents. Plus complexe encore : organiser la **dépréciation** d'une version (qui l'utilise encore ? qui prévenir ? quand la couper ?).

### Sous le capot : le coût d'une seule transaction devenue distribuée

```typescript
// Probabilité qu'une opération touchant N services réussisse partout du premier coup,
// si chaque appel réussit 99,9 % du temps.
for (const n of [1, 3, 6]) console.log(n, (0.999 ** n * 100).toFixed(2) + ' %');
// 1 99.90 % · 3 99.70 % · 6 99.40 %
```

À un million d'opérations par jour, 6 services en jeu, c'est environ **6 000 opérations par jour** à compenser ou à rattraper. En monolithe, un rollback ACID s'en chargeait gratuitement.

## Pièges fréquents

- **Découvrir les changements réseau par les incidents** au lieu de les suivre avec l'exploitation.
- **Chiffrer un découpage sans compter l'infrastructure** (gateways, pare-feu, sous-réseaux).
- **Promettre de l'ACID entre services** : c'est de la cohérence à terme, et il faut le dire au métier.
- **Changer un contrat sans plan de dépréciation.**
- **Ne pas propager d'identifiant de corrélation** : l'enquête sur une commande perdue devient une fouille archéologique.

## À retenir

- **5.** La topologie change (la mise à jour de 2 h du matin) ; **6.** il y a des dizaines d'administrateurs ; **7.** le transport coûte de l'argent ; **8.** le réseau est hétérogène et perd des paquets.
- Le distribué ajoute la **journalisation distribuée**, les **transactions distribuées** (cohérence à terme, sagas, BASE) et la gestion des **contrats et versions**.
- Le grand trade-off : **scalabilité, performance, disponibilité** contre **cohérence et intégrité** des données.
