---
id: arch-ch00-l02
title: "Ce qu'on attend d'un architecte"
source: { chapter: 1, pages: "28-39" }
duration_min: 40
concepts:
  - id: arch-guide-not-specify
    label: "Une décision d'architecture guide le choix technique au lieu de le faire à la place des équipes"
  - id: arch-vitality-decay
    label: "Vitalité de l'architecture et dégradation structurelle : analyser l'existant en continu"
  - id: arch-compliance-fitness
    label: "Faire respecter les décisions, idéalement par des fitness functions automatisées"
  - id: arch-breadth-domain-people
    label: "Largeur technique, connaissance du métier, compétences humaines et politique"
  - id: arch-intersections
    label: "L'architecture croise pratiques d'ingénierie, DevOps, process et données"
  - id: arch-hands-on
    label: "Rester dans le code sans devenir le goulot d'étranglement de l'équipe"
glossary:
  - term: "vitalité de l'architecture"
    definition: "Mesure de la pertinence, aujourd'hui, d'une architecture définie il y a plusieurs années, au vu des changements métier et techniques."
  - term: "dégradation structurelle"
    definition: "Érosion progressive des caractéristiques (performance, disponibilité…) causée par des changements de code qui ignorent l'architecture."
  - term: "fitness function"
    definition: "Tout mécanisme qui donne une évaluation objective de l'intégrité d'une caractéristique d'architecture : test, métrique, moniteur, chaos engineering."
  - term: "inconnus inconnus"
    definition: "Ce qu'on ne sait même pas ignorer : les surprises qui rendent toute architecture itérative."
  - term: "piège du goulot d'étranglement"
    definition: "L'architecte possède du code du chemin critique et bloque l'équipe parce qu'il n'y travaille pas à plein temps."
  - term: "silo applicatif"
    definition: "Décision qui réserve l'accès à une base de données à l'application qui la possède ; les autres passent par son API."
visuals: []
labs: [arch-ch00-l02-lab-guide-or-impose]
xp: 35
---

## Pourquoi c'est important

Six mois après la mise en production, l'application rame. En fouillant, tu trouves un écran qui interroge la base **directement** depuis la couche présentation, « pour aller plus vite ». La règle des couches fermées existait pourtant ; elle était même documentée dans un beau PDF. Personne ne l'a vérifiée.

Cette leçon passe en revue les **huit attentes** envers un architecte, quel que soit son titre. Deux d'entre elles expliquent ce bug : *analyser l'architecture en continu* et *faire respecter les décisions*. Et elle montre ce qu'est, très concrètement, une **fitness function**, l'outil qui aurait attrapé cet écran dès la première revue de code.

## 1. Prendre des décisions… qui guident

L'architecte définit les décisions et principes qui **guident** les choix techniques. Le mot important est *guider*.

- « Le front sera en React » : c'est une **décision technique**, prise à la place de l'équipe.
- « Le front utilisera un framework web **réactif** » : c'est une **décision d'architecture**. L'équipe choisit entre React, Vue, Angular, Elm… en connaissance de cause.

Exception : il arrive qu'une technologie précise soit nécessaire pour **préserver une caractéristique** (scalabilité, performance, disponibilité). Imposer une base précise parce qu'elle seule tient la charge reste alors une décision d'architecture. La question à se poser : *est-ce que je donne un cadre pour bien choisir, ou est-ce que je choisis à leur place sans raison architecturale ?*

## 2. Analyser l'architecture en continu

Une architecture conçue il y a trois ans est-elle encore **viable** aujourd'hui, vu ce qui a changé côté métier et côté technique ? C'est sa **vitalité**. La plupart des architectes l'analysent trop peu, et presque toutes les architectures subissent une **dégradation structurelle** : des changements de code ou de design qui, un par un, érodent la performance, la disponibilité ou la scalabilité.

Souvent oubliés : les **environnements de test et de release**. Un code facile à modifier ne sert à rien si tester prend des semaines et livrer des mois : l'agilité du système entier est nulle.

## 3. Rester à jour

Les décisions d'un architecte durent longtemps et coûtent cher à défaire ; suivre les tendances lui permet de ne pas parier sur une technologie en fin de vie. Le module 19 donne une méthode (radar personnel, 20 minutes par jour).

## 4. Faire respecter les décisions

Reprenons l'écran du début. La règle « seules les couches métier et services accèdent à la base » n'était pas un caprice : elle sert à **contrôler le changement**. Avec des couches fermées, on peut modifier le schéma sans toucher à la présentation. Le développeur qui la contourne gagne quelques millisecondes et fait perdre au système la caractéristique pour laquelle la règle existait.

Vérifier à la main ne passe pas à l'échelle. D'où l'idée du livre *Building Evolutionary Architectures* (Neal Ford) : la **fitness function**, « une évaluation objective de l'intégrité d'une caractéristique ». Le terme vient des algorithmes génétiques, où une fonction mesure si une solution mutée se rapproche de l'objectif (pour le voyageur de commerce : la longueur du trajet). En architecture, c'est un test, une métrique ou un moniteur qui tourne **en continu**, typiquement dans la CI.

### Sous le capot : à quoi ressemble une fitness function

Rien de magique : un programme qui lit la structure du code et échoue si une règle est violée. Voici le cœur d'une fitness function de couches, en TypeScript, sur un graphe d'imports (module → modules importés) :

```typescript
type Imports = Record<string, string[]>;

// Chaque couche n'a le droit d'importer que les couches listées.
const allowed: Record<string, string[]> = {
  presentation: ['business'],
  business: ['persistence'],
  persistence: [],
};

const layerOf = (mod: string) => mod.split('/')[0]!;

export function violations(imports: Imports): string[] {
  const found: string[] = [];
  for (const [from, targets] of Object.entries(imports)) {
    for (const to of targets) {
      const a = layerOf(from), b = layerOf(to);
      if (a !== b && !allowed[a]?.includes(b)) found.push(`${from} → ${to}`);
    }
  }
  return found;
}

console.log(violations({
  'presentation/orders-page': ['business/orders', 'persistence/orders-repo'],
  'business/orders': ['persistence/orders-repo'],
}));
// [ 'presentation/orders-page → persistence/orders-repo' ]
```

Branché dans la CI, ce test refuse le *merge* de l'écran fautif le jour même, avec un message qui cite la règle. Des outils industriels font la même chose : **ArchUnit** (Java), **NetArchTest** (.NET), **dependency-cruiser** (TypeScript, hors livre). Tu construiras ta propre version complète (couches ouvertes, variances) dans le projet de ce module, et tu verras d'autres familles de fitness functions au module 03 (métriques, cycles, chaos engineering).

Retiens la corrélation : **plus une fitness function tourne souvent, plus le retour est rapide**. Une règle vérifiée à chaque commit vaut mieux qu'un audit annuel.

## 5 à 8. Les attentes « non techniques »

- **Exposition variée** : connaître beaucoup de technologies sans être expert de toutes. Mieux vaut connaître **dix** produits de cache et leurs compromis qu'en maîtriser un seul. C'est la **largeur** technique (leçon suivante).
- **Connaissance du métier** : un architecte bancaire qui ignore ce qu'est une dette non prioritaire perd sa crédibilité auprès des décideurs. Les meilleurs combinent largeur technique et domaine.
- **Compétences humaines** : Gerald Weinberg disait que, « quoi qu'on vous dise, c'est toujours un problème de personnes ». Le leadership représente **au moins la moitié** du métier.
- **Politique** : un développeur qui applique le pattern Strategy n'a besoin de l'accord de personne. Un architecte qui crée des **silos applicatifs** (seul le CRM accède à sa base, les autres passent par son API) contrôle enfin la sécurité et le changement… mais toutes les autres équipes doivent maintenant passer par des appels distants. **Presque toute décision d'architecture sera contestée** : il faut savoir négocier (module 18).

## Où l'architecture croise le reste

Le périmètre a grandi. Quatre intersections à connaître :

- **Pratiques d'ingénierie.** Le **process** (Scrum, réunions, organisation) est distinct des **pratiques** (intégration continue, tests automatisés), qui ont un bénéfice reproductible. D'XP à Continuous Delivery puis DevOps, ces pratiques permettent les fitness functions. Et à cause des **inconnus inconnus**, « toutes les architectures deviennent itératives ; l'Agile le reconnaît simplement plus tôt ».
- **Ops / DevOps.** Quand l'exploitation était externalisée sous contrat, les architectes intégraient eux-mêmes l'élasticité dans le système (ESB, SOA), au prix d'une complexité énorme. Les microservices ont fait l'inverse : laisser les ops gérer ce qu'ils gèrent bien. **Pets.com** rappelle l'enjeu : le site a fait faillite après un rush de Noël qu'il ne savait pas absorber, faute d'**élasticité**.
- **Process.** Une architecture distribuée moderne bâtie avec un process en cascade et des déploiements manuels crée une friction énorme : style et pratiques doivent être **symbiotiques**. Les migrations progressives (pattern **Strangler**, *feature toggles*) supposent des boucles de retour courtes.
- **Données.** Code et données vivent en symbiose ; la base fait partie de l'architecture (elle entrera dans le calcul des quanta au module 04).

## Rester dans le code sans bloquer l'équipe

Tout architecte devrait coder. Le piège : prendre en charge du code du **chemin critique** (le framework, le cœur) et devenir le **goulot d'étranglement**, puisqu'on passe la moitié de son temps en réunion. Le remède : déléguer ce code à l'équipe et coder une **fonctionnalité métier** prévue une à trois itérations plus tard. L'équipe gagne en autonomie, et l'architecte ressent les mêmes douleurs que les développeurs.

Autres façons de garder la main :

- des **preuves de concept** (POC), écrites en qualité production, car elles finissent souvent dans le dépôt comme exemple de référence ;
- des stories de **dette technique** ou d'architecture, et des **corrections de bugs** ;
- de l'**automatisation** : outils en ligne de commande, validateurs, fitness functions ;
- des **revues de code** (pour vérifier le respect de l'architecture et mentorer).

## Pièges fréquents

- **Choisir la techno à la place de l'équipe** sans raison architecturale : l'équipe se désengage, et la décision vieillit mal.
- **Documenter une règle sans la vérifier** : elle sera violée sous la pression d'un délai. Automatise-la.
- **Ne regarder que le code** : des cycles de test et de release de plusieurs semaines annulent toute agilité.
- **Garder le framework pour soi** : le piège du goulot d'étranglement.
- **POC jetable bâclé** : il deviendra le modèle copié partout.

## À retenir

- Une décision d'architecture **guide** ; elle n'impose une techno que pour préserver une caractéristique.
- Analyse en continu la **vitalité** et traque la **dégradation structurelle**.
- Fais **respecter** les décisions avec des **fitness functions** qui tournent souvent (CI).
- Largeur, métier, humain, politique : le leadership est au moins la moitié du rôle.
- Code, mais **hors du chemin critique** : POC de qualité, dette, bugs, automatisation, revues.
