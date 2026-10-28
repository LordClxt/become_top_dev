---
id: arch-ch07-l01
title: "L'architecture en couches"
source: { chapter: 10, pages: "153-158" }
duration_min: 40
concepts:
  - id: arch-layered-topology
    label: "Couches horizontales (présentation, métier, persistance, base) et leurs variantes de déploiement"
  - id: arch-layered-default
    label: "Le style par défaut : simple, familier, peu coûteux, et souvent né par accident (architecture par implication)"
  - id: arch-closed-open-layers
    label: "Couche fermée : on ne la saute pas ; couche ouverte : on peut la contourner"
  - id: arch-layers-of-isolation
    label: "L'isolation des couches : changer une couche sans toucher les autres, si les contrats tiennent"
  - id: arch-open-services-layer
    label: "Ajouter une couche de services ouverte pour interdire l'accès aux objets partagés"
glossary:
  - term: "architecture en couches (n-tiers)"
    definition: "Composants organisés en couches horizontales, chacune avec un rôle technique précis."
  - term: "couche fermée"
    definition: "Une requête doit la traverser : elle ne peut pas la sauter pour atteindre la couche suivante."
  - term: "couche ouverte"
    definition: "Une requête peut la contourner pour atteindre directement la couche du dessous."
  - term: "isolation des couches"
    definition: "Les changements d'une couche n'affectent pas les autres, tant que les contrats entre couches restent stables."
  - term: "architecture par implication"
    definition: "Anti-pattern : ne pas choisir de style, « commencer à coder », et se retrouver par défaut en couches."
visuals: [arch-ch07-layers-isolation]
labs: [arch-ch07-l01-lab-warmup-closed-or-open]
xp: 40
---

## Pourquoi c'est important

Une équipe démarre un projet sans parler d'architecture : « On commence à coder, on verra. » Six mois plus tard, il y a un dossier `controllers`, un dossier `services`, un dossier `repositories`. Personne ne l'a décidé, et pourtant c'est une architecture, avec ses forces et ses pièges : l'architecture **en couches**. C'est le style le plus répandu ; autant savoir exactement ce qu'il garantit, et à quelles conditions.

## Le style par défaut

L'architecture en couches (ou *n-tiers*) est le **standard de fait** de la plupart des applications, pour trois raisons : **simplicité**, **familiarité** et **faible coût**. Elle est aussi naturelle à cause de la **loi de Conway** (module 05) : la plupart des organisations ont des développeurs d'interface, des développeurs backend, des développeurs de règles et des DBA, qui s'emboîtent dans les couches.

Elle tombe aussi dans deux anti-patterns : l'**architecture par implication** et l'**architecture accidentelle**. Si un architecte ne sait pas quel style il applique, ou si une équipe Agile « commence juste à coder », il y a de fortes chances que ce soit celui-ci.

## La topologie

Les composants sont organisés en **couches horizontales logiques**, chacune avec un rôle. Aucune règle n'impose leur nombre, mais la plupart des applications en ont **quatre** : **présentation**, **métier**, **persistance** et **base de données**. Parfois métier et persistance fusionnent (quand le SQL vit dans les composants métier) : trois couches. Les grosses applications en ont cinq ou plus.

Côté déploiement physique, trois variantes :

1. présentation, métier et persistance dans **une** unité de déploiement, la base à part (base externe ou système de fichiers) ;
2. la présentation dans sa **propre** unité, métier et persistance dans une seconde, la base à part ;
3. **tout**, base comprise, dans une seule unité : utile pour de petites applications avec une base embarquée ou en mémoire. Beaucoup de produits livrés **sur site** (*on-prem*) sont construits ainsi.

### Séparation des préoccupations

Chaque couche forme une **abstraction** autour du travail à faire. La présentation ne sait pas comment on obtient les données du client : elle les affiche. Le métier ne sait pas comment les formater ni d'où elles viennent : il les obtient de la persistance, applique ses règles, et les remonte. Chaque développeur peut se concentrer sur son expertise technique.

Le prix de cette séparation : un **manque d'agilité** global. L'architecture en couches est **partitionnée techniquement** : le domaine « client » est présent dans la présentation, le métier, les règles, les services et la base. Toute évolution de ce domaine traverse tout. C'est pourquoi le **Domain-Driven Design** s'y adapte mal.

## Couches fermées, couches ouvertes

Chaque couche est **fermée** ou **ouverte**.

- **Fermée** : une requête qui descend ne peut **pas** la sauter ; elle doit passer par la couche immédiatement en dessous. Avec métier et persistance fermés, une requête de la présentation passe par le métier, puis la persistance, avant d'atteindre la base.
- **Ouverte** : on peut la **contourner**. Pour une simple lecture, il serait plus rapide que la présentation interroge la base directement (on appelait cela le *fast-lane reader* au début des années 2000) ; il faudrait pour cela ouvrir le métier et la persistance.

Lequel choisir ? La réponse tient dans un concept clé.

### L'isolation des couches

> **Isolation des couches** : les changements faits dans une couche n'affectent généralement pas les autres, **tant que les contrats entre couches restent inchangés**.

Chaque couche ignore le fonctionnement interne des autres. Mais pour obtenir cette isolation, les couches du **flux principal** doivent être **fermées**. Si la présentation accède directement à la persistance, un changement de persistance touche à la fois le métier **et** la présentation : l'application devient fortement couplée, fragile, difficile et chère à changer.

L'isolation permet aussi de **remplacer** une couche entière sans toucher les autres (avec des contrats bien définis, par exemple via le pattern *business delegate*) : remplacer une vieille présentation JSF par React sans toucher au métier.

## Ajouter une couche… ouverte

Parfois, ouvrir une couche est la bonne réponse. Le métier contient des **objets partagés** : utilitaires de dates et de chaînes, audit, journalisation. Supposons une décision d'architecture : la présentation ne doit **pas** les utiliser. Difficile à faire respecter : la présentation a accès au métier, donc à tout ce qu'il contient.

La solution : ajouter une nouvelle **couche de services** qui contient tous ces objets partagés, **sous** le métier. Comme le métier est fermé, la présentation n'y a plus accès : la règle devient **structurelle**. Mais cette couche de services doit être **ouverte** : sinon le métier serait obligé de la traverser pour atteindre la persistance. Ouverte, elle permet au métier de l'utiliser… ou de la sauter.

Ce jeu de couches ouvertes et fermées définit les flux de requêtes et guide les développeurs. **Ne pas documenter** quelles couches sont ouvertes ou fermées, et **pourquoi**, mène à des architectures couplées et fragiles, difficiles à tester, à maintenir et à déployer.

### Sous le capot : la règle, en données

```typescript
type Layer = { name: string; open: boolean };
const layers: Layer[] = [
  { name: 'presentation', open: false },
  { name: 'business', open: false },
  { name: 'services', open: true },
  { name: 'persistence', open: false },
  { name: 'database', open: false },
];
// from peut-il appeler to ? Même couche ou juste en dessous, ou en sautant uniquement des couches ouvertes.
function allowed(from: string, to: string) {
  const i = layers.findIndex((l) => l.name === from), j = layers.findIndex((l) => l.name === to);
  return j >= i && layers.slice(i + 1, j).every((l) => l.open);
}
console.log(allowed('business', 'persistence'), allowed('presentation', 'services'), allowed('presentation', 'persistence'));
// true false false
```

C'est exactement la règle que tu as codée dans archkit au module 00 : une architecture en couches documentée est une architecture **vérifiable**.

::visual{id="arch-ch07-layers-isolation"}

## Pièges fréquents

- **Ne pas choisir de style** et se retrouver en couches par implication, sans en connaître les règles.
- **Ouvrir une couche « pour la performance »** du flux principal : on perd l'isolation.
- **Laisser des objets partagés accessibles à tous** dans une couche que la présentation voit.
- **Ne pas documenter** ce qui est ouvert, fermé, et pourquoi.

## À retenir

- Couches horizontales : **présentation, métier, persistance, base** (3 à 5+), trois variantes de déploiement.
- Le style **par défaut** : simple, familier, peu cher… et souvent **accidentel**.
- **Partitionné techniquement** : chaque domaine est étalé dans toutes les couches.
- **Fermée** = on la traverse ; **ouverte** = on peut la sauter. L'**isolation des couches** exige des couches fermées sur le flux principal.
- Une **couche de services ouverte** rend structurelle l'interdiction d'accéder aux objets partagés. **Documente** l'ouvert et le fermé.
