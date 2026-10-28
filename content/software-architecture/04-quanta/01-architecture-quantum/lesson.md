---
id: arch-ch04-l01
title: "Le quantum d'architecture"
source: { chapter: 7, pages: "111-114" }
duration_min: 35
concepts:
  - id: arch-scope-narrowed
    label: "La portée des caractéristiques s'est réduite : du système entier à des parties qui ont chacune leurs besoins"
  - id: arch-quantum-definition
    label: "Quantum = artefact déployable indépendamment, à forte cohésion fonctionnelle et à connascence synchrone"
  - id: arch-sync-alignment
    label: "Un appel synchrone aligne les caractéristiques opérationnelles de l'appelant et de l'appelé pendant l'appel"
  - id: arch-async-decoupling
    label: "Un lien asynchrone (file) absorbe la différence de rythme et sépare les quanta"
glossary:
  - term: "quantum d'architecture"
    definition: "Artefact déployable indépendamment, à forte cohésion fonctionnelle et à connascence synchrone ; il inclut ce dont il a besoin pour fonctionner, base de données comprise."
  - term: "connascence synchrone"
    definition: "Couplage dynamique créé par un appel où l'appelant attend la réponse : pendant l'appel, les deux doivent avoir les mêmes caractéristiques opérationnelles."
  - term: "connascence asynchrone"
    definition: "Couplage d'un envoi « tire et oublie » : les deux côtés peuvent avoir des caractéristiques opérationnelles différentes."
  - term: "déployable indépendamment"
    definition: "Qui contient tout ce qu'il faut pour fonctionner sans les autres parties de l'architecture."
visuals: [arch-ch04-sync-vs-async]
labs: [arch-ch04-l01-lab-warmup-how-many-quanta]
xp: 35
---

## Pourquoi c'est important

Ton équipe a rendu le service Enchères **élastique** : il passe de 3 à 60 instances en deux minutes pour absorber la fin des ventes. Victoire ? Le premier soir, toutes les enchères se terminent à 21 h et appellent le service Paiement… qui traite **un paiement toutes les 500 ms**. Les 60 instances attendent, les appels expirent, les adjudications échouent.

L'élasticité d'Enchères n'a servi à rien : pendant l'appel, Enchères n'était pas plus rapide que Paiement. Pour raisonner sur ce genre de système, il faut une unité plus fine que « le système » : le **quantum d'architecture**.

## Un axiome qui a vieilli

On a longtemps parlé des caractéristiques **au niveau du système** : « la scalabilité du système ». C'était raisonnable quand presque tout était monolithique. Avec les styles modernes (microservices en tête), la portée des caractéristiques s'est **considérablement réduite** : chaque partie peut avoir ses propres besoins.

Deuxième constat : les métriques de code (module 01) ne voient que le code. Or beaucoup de caractéristiques **opérationnelles** dépendent de composants **hors du code**. Tu peux concevoir un code parfaitement élastique ; si la base de données derrière ne suit pas, l'application ne le sera pas.

Il fallait donc une mesure qui englobe ces dépendances. C'est en écrivant *Building Evolutionary Architectures* que Neal Ford et ses coauteurs ont défini le quantum d'architecture.

## Connascence : statique, synchrone, asynchrone

La définition s'appuie sur la connascence (module 01).

- **Statique** : deux services qui partagent la même définition de classe `Address` sont connascents ; changer la classe oblige à changer les deux.
- **Dynamique**, que l'on précise ici en deux variantes :
  - **synchrone** : l'appelant **attend** la réponse de l'appelé ;
  - **asynchrone** : « tire et oublie », typique des architectures événementielles ; les deux côtés peuvent alors avoir des caractéristiques opérationnelles **différentes**.

C'est le maillon manquant de la connascence des années 1990 : elle ne disait rien du synchrone et de l'asynchrone.

## La définition

Le mot *quantum* vient du latin (« combien ») ; en physique, c'est la plus petite quantité d'une entité impliquée dans une interaction. En architecture :

> **Quantum d'architecture** : un artefact **déployable indépendamment**, à **forte cohésion fonctionnelle** et à **connascence synchrone**.

Décortiquons.

### Déployable indépendamment

Le quantum contient **tout** ce qu'il lui faut pour fonctionner seul. Si l'application utilise une base, la base **fait partie** du quantum : sans elle, rien ne marche. Conséquence immédiate : presque tous les systèmes historiques déployés avec **une seule base** forment **un seul quantum**, quel que soit le nombre de services. En microservices, chaque service a sa base : l'architecture compte **plusieurs** quanta.

### Forte cohésion fonctionnelle

Le quantum fait **quelque chose de cohérent**, comme un composant `Customer` dont tout concerne le client, à l'opposé d'un `Utility` fourre-tout. Dans un monolithe à une base, ce critère change peu de choses ; en microservices, chaque service est conçu autour d'un flux métier (un **contexte borné**, voir plus bas), donc fortement cohésif.

### Connascence synchrone

Si un service en appelle un autre de façon **synchrone**, ils ne peuvent pas avoir des caractéristiques opérationnelles **très différentes**. Si l'appelant est bien plus scalable que l'appelé, les timeouts et les problèmes de fiabilité arrivent. L'appel crée une connascence dynamique **pour la durée de l'appel** : tant que l'un attend l'autre, leurs caractéristiques opérationnelles doivent être les mêmes.

## L'exemple Enchères → Paiement

Reprenons la scène du début. Le service Paiement ne traite qu'**un paiement toutes les 500 ms**. Quand beaucoup d'enchères se terminent en même temps :

- **Mauvaise architecture** : l'appel est synchrone. Le premier passe, les suivants attendent et **expirent**.
- **Meilleure architecture** : un lien **asynchrone**. Enchères dépose la demande de paiement dans une **file**, qui **tamponne** la différence de rythme ; Paiement la vide à son pas.

La connascence asynchrone rend l'architecture plus souple. Et elle change le découpage : Enchères et Paiement ne sont plus forcés d'avoir les mêmes caractéristiques, ils deviennent **deux quanta**.

### Sous le capot : ce que coûte l'attente

```typescript
// 40 enchères se terminent au même instant ; Paiement traite 1 paiement / 500 ms.
// En synchrone, chaque appelant abandonne après 3 s d'attente.
const ended = 40, serviceMs = 500, timeoutMs = 3000;
let ok = 0, timedOut = 0;
for (let i = 0; i < ended; i++) {
  const finishesAt = (i + 1) * serviceMs;    // le i-ième paiement finit à ce moment
  if (finishesAt <= timeoutMs) ok++; else timedOut++;
}
console.log(ok, timedOut, `${(ended * serviceMs) / 1000} s pour vider la file en asynchrone`);
// 6 34 20 s pour vider la file en asynchrone
```

En synchrone : 6 paiements réussis, **34 échecs**. En asynchrone : les 40 paiements passent, le dernier 20 s plus tard, et aucune enchère n'échoue. Le projet archkit de ce module généralise ce calcul.

## Le contexte borné (DDD)

Le *Domain-Driven Design* d'Eric Evans a profondément influencé l'architecture moderne. Il définit le **contexte borné** (*bounded context*) : tout ce qui concerne un domaine est visible à l'intérieur, opaque à l'extérieur.

Avant le DDD, on cherchait la **réutilisation globale** : une seule classe `Customer` pour toute l'organisation. Mais un artefact commun partagé crée du couplage, de la coordination et de la complexité. Le contexte borné reconnaît que chaque entité fonctionne mieux **dans un contexte local** : chaque domaine a son propre `Customer`, et on réconcilie les différences aux points d'intégration. C'est la même intuition que le quantum : des frontières à l'intérieur desquelles tout est cohérent, et à travers lesquelles le couplage est faible.

::visual{id="arch-ch04-sync-vs-async"}

## Pièges fréquents

- **Compter les services pour compter les quanta** : cinq services sur une base partagée forment un seul quantum.
- **Oublier la base** : elle fait partie du quantum.
- **Rendre élastique un service qui appelle en synchrone un service qui ne l'est pas** : pendant l'appel, c'est le plus lent qui décide.
- **Un `Customer` unique pour toute l'organisation** : le couplage du partage global.

## À retenir

- Les caractéristiques ne se pensent plus pour le **système entier** : leur portée s'est réduite.
- **Quantum** = **déployable indépendamment** (base comprise) + **forte cohésion fonctionnelle** + **connascence synchrone**.
- Un appel **synchrone** aligne les caractéristiques opérationnelles des deux côtés **pendant l'appel**.
- Un lien **asynchrone** tamponne la différence de rythme et **sépare** les quanta.
- Le **contexte borné** préfère des modèles locaux à un modèle global partagé.
