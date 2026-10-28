---
id: arch-ch05-l03
title: "Les composants de Going, Going, Gone"
source: { chapter: 8, pages: "132-138" }
duration_min: 40
concepts:
  - id: arch-actor-actions-ggg
    label: "Acteurs et actions de Going, Going, Gone (enchérisseur, commissaire-priseur, système) et les composants qui en découlent"
  - id: arch-split-by-characteristics
    label: "Scinder un composant quand ses utilisateurs exigent des caractéristiques différentes (Bid Capture / Auctioneer Capture)"
  - id: arch-monolith-vs-distributed
    label: "Un seul jeu de caractéristiques → monolithe ; plusieurs → distribué, décidé tôt grâce aux quanta"
  - id: arch-style-vs-pattern
    label: "Un style organise toute l'architecture ; un pattern est une structure de plus bas niveau à l'intérieur d'un style"
glossary:
  - term: "BidTracker"
    definition: "Composant qui suit les offres et sert de système de référence (system of record)."
  - term: "system of record"
    definition: "La source de vérité d'une donnée : le composant qui fait foi."
  - term: "style d'architecture"
    definition: "Structure d'ensemble : comment l'interface et le code backend sont organisés et comment ils interagissent avec les données."
  - term: "pattern d'architecture"
    definition: "Structure de plus bas niveau qui résout un problème précis à l'intérieur d'un style (haute scalabilité d'un ensemble d'opérations, par exemple)."
visuals: []
labs: [arch-ch05-l03-lab-actors-to-components]
xp: 40
---

## Pourquoi c'est important

Fonctionnellement, capturer une offre, c'est capturer une offre : qu'elle vienne d'un enchérisseur derrière son écran ou du commissaire-priseur en salle, le code est le même. Un seul composant `BidCapture` semble donc évident. C'est pourtant une erreur, et pas une erreur de code : une erreur de **caractéristiques**. Cette leçon déroule la découverte des composants de Going, Going, Gone jusqu'à la décision la plus structurante du projet : monolithe ou distribué.

## Acteurs et actions

Sans contrainte particulière, l'approche **acteurs/actions** est un bon choix généraliste. Going, Going, Gone a trois rôles : l'**enchérisseur**, le **commissaire-priseur**, et un participant fréquent de cette technique, le **système** lui-même, pour les actions qu'il déclenche (à la fin d'une vente, le système lance le paiement).

| Acteur | Actions |
|---|---|
| Enchérisseur | Voir la vidéo en direct, voir le fil des offres en direct, enchérir |
| Commissaire-priseur | Saisir les offres faites en salle, recevoir les offres en ligne, adjuger un lot |
| Système | Démarrer la vente, faire payer, suivre l'activité des enchérisseurs |

## Les composants de départ

En itérant sur ces actions, on obtient un premier jeu :

- **VideoStreamer** : diffuse la vente en direct.
- **BidStreamer** : diffuse les offres au fil de l'eau. Avec VideoStreamer, il offre à l'enchérisseur une vue **en lecture seule** de la vente.
- **BidCapture** : capture les offres des enchérisseurs **et** du commissaire-priseur.
- **BidTracker** : suit les offres ; c'est le **système de référence** (*system of record*).
- **AuctionSession** : démarre et arrête la vente ; à la fin, déclenche le paiement et la clôture, y compris la notification des enchérisseurs.
- **Payment** : prestataire externe de paiement par carte.

## Le tour des caractéristiques

Le cycle d'identification (leçon précédente) demande ensuite d'analyser les **caractéristiques**. `BidCapture` a du sens fonctionnellement. Mais le commissaire-priseur n'a pas besoin de la même **scalabilité** ni de la même **élasticité** que des milliers d'enchérisseurs. À l'inverse, la **fiabilité** (les connexions ne tombent pas) et la **disponibilité** du commissaire-priseur doivent être **plus élevées** que partout ailleurs. Qu'un enchérisseur ne puisse pas se connecter, c'est mauvais pour les affaires ; que ça arrive au commissaire-priseur, c'est un **désastre** pour la vente.

D'où la décision : **scinder** `BidCapture` en **Bid Capture** (les enchérisseurs en ligne) et **Auctioneer Capture** (le commissaire-priseur), pour que chacun porte ses propres caractéristiques. Auctioneer Capture alimente **Bid Streamer** (pour que les enchérisseurs voient les offres de la salle) et **Bid Tracker**, qui devient le point qui **unifie** deux flux très différents : un flux unique venant du commissaire-priseur, et une multitude venant des enchérisseurs.

### Sous le capot : une décision guidée par les données

```typescript
type Needs = { scalability: number; elasticity: number; availability: number; reliability: number };
const bidders: Needs = { scalability: 3, elasticity: 3, availability: 2, reliability: 2 };
const auctioneer: Needs = { scalability: 1, elasticity: 1, availability: 3, reliability: 3 };
const diverge = (Object.keys(bidders) as (keyof Needs)[]).filter((k) => Math.abs(bidders[k] - auctioneer[k]) >= 1);
console.log(diverge.join(', '));
// scalability, elasticity, availability, reliability
```

Quand **toutes** les caractéristiques divergent entre deux groupes d'utilisateurs d'un même composant, ce composant doit être scindé : sinon, il faut payer le niveau maximal de chaque caractéristique pour tout le monde.

## Pas « le » bon design

Ce découpage n'est sûrement pas définitif : il manque l'inscription des participants, l'administration des paiements, etc. C'est un bon point de départ pour itérer. Et ce n'est pas **la** solution : peu de systèmes n'ont qu'une façon d'être implémentés. Ne cherche pas obstinément le design unique et vrai (beaucoup conviendront, et seront moins sur-conçus) ; évalue objectivement les trade-offs et choisis l'ensemble **le moins mauvais**.

## Retour aux quanta : monolithe ou distribué ?

Le quantum (module 04) définit la portée des caractéristiques. Il mène à une décision majeure, à prendre dès la fin du premier découpage en composants :

- **Monolithique** : une seule unité déployable, toute la fonctionnalité dans un processus, en général une seule base (en couches ou monolithe modulaire, module 07).
- **Distribuée** : plusieurs services dans leur propre environnement, qui communiquent par le réseau, chacun avec éventuellement son propre rythme de livraison et ses pratiques.

La décision repose sur le **nombre de quanta** découverts. Si le système peut vivre avec **un seul jeu de caractéristiques**, le monolithe offre beaucoup d'avantages. S'il en faut **plusieurs**, comme ici, le distribué s'impose. Pour Going, Going, Gone : la diffusion en lecture seule (VideoStreamer, BidStreamer) ne doit pas être mélangée avec des mises à jour à très grande échelle, et l'enchérisseur et le commissaire-priseur ont des profils opposés. **Architecture distribuée.** Pouvoir trancher cela aussi tôt est l'un des grands avantages de raisonner en quanta.

## Style ou pattern ?

La partie suivante du cours étudie les **styles**. Une distinction utile avant d'y entrer :

- Un **style** d'architecture est la structure d'**ensemble** : comment l'interface et le code backend sont organisés (en couches d'un monolithe, en services déployés séparément…) et comment ce code interagit avec les données.
- Un **pattern** d'architecture est une structure de **plus bas niveau**, qui résout un problème précis **à l'intérieur** d'un style (atteindre une forte scalabilité sur un ensemble d'opérations, par exemple).

Chaque style embarque un ensemble connu de trade-offs : c'est ce qui permet de choisir.

## Pièges fréquents

- **Un composant par fonction** sans regarder qui l'utilise : Bid Capture unique pour tous.
- **Chercher le design parfait** au lieu du moins mauvais.
- **Repousser la décision monolithe/distribué** : les quanta permettent de la prendre tôt.
- **Appeler « style » un pattern** (ou l'inverse) : le style organise tout, le pattern résout un point.

## À retenir

- **Acteurs/actions** : enchérisseur, commissaire-priseur, **système** ; chaque action trouve son composant.
- Composants de départ : VideoStreamer, BidStreamer, BidCapture, BidTracker (référence), AuctionSession, Payment.
- **Scinder** quand les caractéristiques divergent : Bid Capture / Auctioneer Capture ; BidTracker unifie les flux.
- **Un jeu de caractéristiques → monolithe ; plusieurs → distribué**, et on le sait tôt.
- **Style** = structure d'ensemble ; **pattern** = solution locale dans un style.
