---
id: arch-ch03-l02
title: "La complexité cyclomatique"
source: { chapter: 6, pages: "99-101" }
duration_min: 35
concepts:
  - id: arch-cc-definition
    label: "CC = nombre de chemins indépendants : 1 + nombre de points de décision"
  - id: arch-cc-formula
    label: "Sur le graphe de flot : CC = E − N + 2, et E − N + 2P pour P composantes"
  - id: arch-cc-thresholds
    label: "Seuils : moins de 10 (industrie), moins de 5 (auteurs), au-delà de 50 irrécupérable"
  - id: arch-cc-essential-accidental
    label: "Complexité essentielle (le problème) vs accidentelle (le code) ; le TDD réduit la seconde"
glossary:
  - term: "complexité cyclomatique (CC)"
    definition: "Métrique de Thomas McCabe (1976) : nombre de chemins d'exécution indépendants d'une fonction."
  - term: "point de décision"
    definition: "Construction qui crée un nouveau chemin : if, else if, case, boucle, catch, opérateur && ou ||, ternaire."
  - term: "graphe de flot de contrôle"
    definition: "Graphe dont les nœuds sont des blocs de code et les arêtes les passages possibles de l'un à l'autre."
  - term: "Crap4J"
    definition: "Outil Java qui combine complexité cyclomatique et couverture pour estimer à quel point un code est « pourri »."
visuals: [arch-ch03-flow-graph]
labs: [arch-ch03-l02-lab-count-the-paths]
xp: 35
---

## Pourquoi c'est important

La fonction `computeShippingFee` a commencé avec trois lignes. Deux ans plus tard : 340 lignes, 47 `if`, des `switch` imbriqués dans des boucles. Chaque correction de bug en crée un autre, et personne n'ose écrire les tests : il faudrait **des dizaines de cas** pour couvrir tous les chemins.

Personne n'a décidé de la rendre complexe : la complexité **s'accumule** quand personne ne la surveille. La complexité cyclomatique donne un chiffre à cette accumulation, et donc une prise pour la gouverner.

## Compter les chemins

La **complexité cyclomatique (CC)**, définie par Thomas McCabe en 1976, mesure la complexité du code au niveau d'une fonction, d'une classe ou d'une application. Elle applique la théorie des graphes aux **points de décision**, qui créent des chemins d'exécution différents :

- une fonction sans aucune décision : **CC = 1** (un seul chemin) ;
- un `if` : **CC = 2** (deux chemins) ;
- en pratique : **CC = 1 + nombre de points de décision**.

En TypeScript, chacun de ces éléments ajoute 1 : `if`, `else if`, chaque `case` d'un `switch`, `for`, `for…of`, `while`, `do…while`, `catch`, le ternaire `? :`, et chaque `&&`, `||` ou `??` dans une condition (ils court-circuitent, donc ils créent un chemin). Un `else` seul n'ajoute rien : il est l'autre branche du `if`.

```typescript
function fee(weightKg: number, express: boolean, country: string) {
  if (weightKg <= 0) throw new Error('poids invalide');   // +1
  let f = weightKg < 2 ? 5 : 9;                           // +1
  if (express && country === 'FR') f += 4;                // +1 (if) +1 (&&)
  for (const _ of country) f += 0;                        // +1
  return f;
}
// CC = 1 + 5 = 6
```

## La formule du graphe

Le livre donne la formule sur le **graphe de flot de contrôle** de la fonction :

> **CC = E − N + 2**, où N est le nombre de nœuds (des blocs de code) et E le nombre d'arêtes (les passages possibles).

Prenons l'exemple du livre :

```typescript
function decision(c1: number, c2: number) {
  if (c1 < 100) return 0;
  else if (c1 + c2 > 500) return 1;
  else return -1;
}
```

Deux conditions, donc deux points de décision : **CC = 3**. Le livre le vérifie sur son graphe (3 = 3 − 2 + 2, avec sa façon de compter les nœuds). Quelle que soit la façon de dessiner le graphe, tant qu'il est **connexe**, E − N + 2 donne le même résultat que « décisions + 1 ».

Le « 2 » est une simplification pour **une seule** fonction. Quand on mesure plusieurs fonctions ensemble (des **composantes connexes** séparées dans le graphe), la formule générale est :

> **CC = E − N + 2P**, où P est le nombre de composantes connexes.

### Sous le capot : pourquoi E − N + 2 marche

Un graphe connexe sans aucun choix est une simple chaîne : N nœuds, N − 1 arêtes, donc E − N + 2 = 1. Chaque décision ajoute une arête de plus que de nœuds (une branche qui part et se rejoint), donc ajoute exactement 1. La formule compte les **cycles indépendants** du graphe (son nombre cyclomatique, d'où le nom), plus un. C'est aussi le **nombre minimal de tests** pour exécuter chaque chemin de base : une CC de 47 annonce au moins 47 cas.

## Quelle valeur viser ?

« Ça dépend » : du domaine. Un problème algorithmiquement complexe produit des fonctions complexes. Les vraies questions :

- La fonction est-elle complexe à cause du **problème** ou à cause d'un **mauvais code** ?
- Le code est-il **mal découpé** ? Une grande méthode pourrait-elle être divisée en morceaux logiques plus petits, qui se partagent la complexité ?

Les repères :

- **Industrie** : moins de **10** est acceptable, sauf domaine complexe.
- **Les auteurs** : 10 est déjà très haut ; ils préfèrent **moins de 5**, signe d'un code cohésif et bien découpé.
- **Crap4J** (Java) combine CC et couverture pour estimer à quel point le code est « pourri » : au-delà de **50**, aucune couverture ne le sauve.
- Le record de Neal Ford : une fonction C au cœur d'un logiciel commercial, **4 000 lignes**, des `GOTO` pour sortir de boucles imbriquées, **CC supérieure à 800**.

## Essentielle ou accidentelle ?

La CC ne distingue pas la complexité **essentielle** (le problème est complexe) de la complexité **accidentelle** (le code est plus compliqué que nécessaire). C'est la limite vue au module 01 : la métrique mesure, l'humain interprète.

Une pratique réduit naturellement la complexité accidentelle : le **TDD**. En écrivant un petit test puis le minimum de code pour le faire passer, on obtient des méthodes plus petites, plus cohésives, avec une CC faible. C'est un effet secondaire, mais un effet constant.

::visual{id="arch-ch03-flow-graph"}

## Pièges fréquents

- **Oublier les `&&` et `||`** : `if (a && b || c)` compte pour 3, pas pour 1.
- **Compter les `else`** : ils ne créent pas de chemin supplémentaire.
- **Viser un chiffre absolu** sans regarder le domaine.
- **Découper mécaniquement** pour faire baisser la CC : on la déplace dans un enchevêtrement d'appels. Le but est un code **cohésif**, pas un score.

## À retenir

- **CC = 1 + points de décision** ; sur le graphe, **E − N + 2** (ou **+ 2P** pour P composantes).
- Elle donne le nombre minimal de tests pour couvrir les chemins de base.
- Repères : **< 10** (industrie), **< 5** (auteurs), **> 50** irrécupérable.
- Elle ne distingue pas l'**essentiel** de l'**accidentel** ; le **TDD** réduit l'accidentel.
