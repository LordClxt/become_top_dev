---
id: arch-ch09-l03
title: "Le recyclage électronique, et quand choisir ce style"
source: { chapter: 13, pages: "192-198" }
duration_min: 40
concepts:
  - id: arch-sb-recycling
    label: "L'exemple du recyclage : sept services, deux interfaces fédérées, deux bases dans des zones réseau séparées"
  - id: arch-sb-ratings
    label: "Notes : quatre étoiles en agilité, testabilité, déployabilité, tolérance aux pannes, disponibilité ; scalabilité 3, élasticité 2 ; simple et peu coûteux pour du distribué"
  - id: arch-sb-when
    label: "Quand le choisir : pragmatisme (la Ferrari à 50 km/h), DDD, préservation de l'ACID, éviter les pièges de granularité"
  - id: arch-orchestration-choreography
    label: "Orchestration (un chef d'orchestre) et chorégraphie (des danseurs sans chef)"
glossary:
  - term: "zone réseau"
    definition: "Partie du réseau séparée par un pare-feu, avec ses propres règles d'accès."
  - term: "pare-feu à sens unique"
    definition: "Règle qui autorise les accès d'une zone vers une autre, mais pas l'inverse."
  - term: "orchestration"
    definition: "Coordination de plusieurs services par un médiateur séparé qui contrôle le workflow, comme un chef d'orchestre."
  - term: "chorégraphie"
    definition: "Coordination sans médiateur central : chaque service parle aux autres, comme des danseurs."
visuals: []
labs: [arch-ch09-l03-lab-recycling-zones]
xp: 40
---

## Pourquoi c'est important

Les styles distribués les plus puissants (microservices, event-driven, space-based) promettent des cinq étoiles. Beaucoup d'entreprises découvrent que ce pouvoir coûte trop cher, ou qu'elles n'en ont tout simplement pas besoin. Cette leçon déroule un exemple réel, celui d'une entreprise de recyclage d'appareils électroniques, puis donne le bulletin du style et les situations où il est le meilleur choix.

## Le recyclage électronique

Le processus :

1. Le client demande, sur un site web ou une borne, combien il obtiendra pour son vieil appareil : le **devis** (*Quoting*).
2. S'il est d'accord, il envoie l'appareil, que l'entreprise **reçoit** (*Receiving*).
3. L'appareil est **évalué** (*Assessment*) : fonctionne-t-il bien ?
4. S'il est en bon état, l'entreprise paie le client : la **comptabilité** (*Accounting*).
5. À tout moment, le client peut consulter le **statut** de son appareil (*Item Status*).
6. Selon l'évaluation, l'appareil est **recyclé** (*Recycling*) : détruit proprement ou revendu.
7. L'entreprise lance périodiquement des **rapports** financiers et opérationnels (*Reporting*).

Chaque domaine est un **service de domaine** déployé séparément. Puis viennent les décisions qui font la force du style :

- **Scalabilité ciblée** : seuls les services exposés aux clients, **Quoting** et **Item Status**, ont besoin de débit ; ils ont plusieurs instances. Les autres n'en ont qu'une.
- **Interfaces fédérées** : **Customer Facing**, **Receiving**, **Recycling and Accounting**. Cela apporte tolérance aux pannes, scalabilité, et **sécurité** : les clients externes n'ont **aucun chemin réseau** vers les fonctions internes.
- **Deux bases physiques** : une pour les opérations **externes** (clients), une pour les opérations **internes**. La base interne vit dans une **zone réseau séparée**. Un **pare-feu à sens unique** permet aux services internes de lire et mettre à jour les informations clients, mais **pas l'inverse**. (Selon la base, on peut aussi utiliser la réplication ou la synchronisation de tables.)

Résultat : scalabilité, tolérance aux pannes, sécurité (protection des données et des fonctions), et aussi agilité, testabilité, déployabilité. Exemple : le service **Assessment** change **sans cesse** (nouvelles règles à chaque nouveau produit reçu). Ce changement fréquent est **isolé** dans un seul service : on le modifie, le teste et le déploie sans toucher au reste.

## Le bulletin de notes

- **Partitionné par domaine** : chaque service est une unité déployable centrée sur un domaine. Un changement de l'évaluation ne touche que son service, son interface et sa base.
- **Quanta** : **un ou plus**. Même avec 4 à 12 services, une base ou une interface **partagée** en fait un seul quantum. Fédérer interfaces et bases en crée plusieurs : le recyclage en a **deux** (la partie client, avec son interface, sa base, Quoting et Item Status ; et les opérations internes, qui ont deux interfaces mais **une** base, donc un seul quantum).
- **Aucune note à cinq étoiles**, mais **quatre étoiles** dans des domaines vitaux :
  - **agilité**, **testabilité** (périmètre limité à un domaine), **déployabilité** (déploiements plus fréquents et moins risqués qu'un gros monolithe) : ensemble, un meilleur **time to market** ;
  - **tolérance aux pannes** et **disponibilité** : les services sont autonomes et ne se parlent pas (ils partagent base et code, pas des appels). Si Receiving tombe, les six autres continuent.
- **Scalabilité** : trois étoiles ; **élasticité** : deux. Possibles, mais on réplique plus de fonctionnalités qu'avec des services fins, donc moins efficace en ressources et en coût. Le revers sympathique : avec une seule instance par service, cache en mémoire et pool de connexions restent simples.
- **Simplicité et coût** : l'un des styles distribués **les plus simples et les moins chers**. Le trade-off : plus on accepte de coût et de complexité (microservices), meilleures deviennent les notes à quatre étoiles.
- **Fiabilité** : meilleure que les autres styles distribués. Des services plus gros, c'est moins de trafic réseau, moins de transactions distribuées, moins de bande passante.

### Sous le capot : où vont les appels réseau

```typescript
// Une commande = 4 étapes métier. Combien d'appels réseau selon la granularité ?
const steps = ['créer', 'numéroter', 'payer', 'réserver le stock'];
const serviceBased = 1;                    // l'interface appelle la façade ; tout le reste est interne
const microservices = 1 + (steps.length - 1); // l'interface, puis un appel par service fin supplémentaire
console.log(serviceBased, microservices, `${(0.999 ** microservices * 100).toFixed(1)} % de succès sans retry`);
// 1 4 99.6 % de succès sans retry
```

Chaque appel réseau évité est une erreur du distribué (module 06) en moins : c'est l'origine de la meilleure fiabilité du style.

## Quand le choisir

- **Le pragmatisme.** La flexibilité des variantes et le nombre de trois et quatre étoiles en font l'un des styles les plus pragmatiques. Le livre compare les styles plus puissants à une **Ferrari** utilisée pour aller au bureau à **50 km/h** dans les bouchons : impressionnant, mais quel gaspillage.
- **Le Domain-Driven Design.** Des services à gros grain, centrés sur un domaine : chaque domaine trouve naturellement sa place dans un service.
- **L'ACID.** De tous les styles distribués, c'est celui qui **préserve le mieux** les transactions ACID. Quand l'interface ou la gateway orchestre plusieurs services, il faut recourir aux sagas et au BASE ; mais la plupart du temps, la transaction reste dans **un** service.
- **Éviter les pièges de la granularité.** Plus les services sont fins, plus il faut les coordonner :
  - l'**orchestration** : un service **médiateur** séparé contrôle le workflow de la transaction, comme un **chef d'orchestre** ;
  - la **chorégraphie** : chaque service parle aux autres **sans** médiateur central, comme des **danseurs**.

  Les services à gros grain du style service-based en ont beaucoup moins besoin.

## Pièges fréquents

- **Faire monter en charge tous les services** alors que deux seulement en ont besoin.
- **Une interface unique pour clients et opérateurs** : un chemin réseau vers l'interne que la fédération aurait supprimé.
- **Croire à plusieurs quanta** avec une base commune.
- **Choisir la Ferrari** sans trajet qui la justifie.

## À retenir

- Recyclage : **sept services**, **deux** qui montent en charge, **trois interfaces fédérées**, **deux bases** en **zones réseau séparées** avec un pare-feu à sens unique, **deux quanta**.
- Quatre étoiles : **agilité, testabilité, déployabilité, tolérance aux pannes, disponibilité** ; scalabilité 3, élasticité 2 ; **simple, peu cher, fiable** pour du distribué.
- À choisir pour le **pragmatisme**, le **DDD**, l'**ACID**, et pour éviter les pièges de **granularité**.
- **Orchestration** = un chef d'orchestre ; **chorégraphie** = des danseurs sans chef.
