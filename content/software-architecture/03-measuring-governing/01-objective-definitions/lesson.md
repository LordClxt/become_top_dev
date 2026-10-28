---
id: arch-ch03-l01
title: "Des définitions objectives"
source: { chapter: 6, pages: "97-102" }
duration_min: 35
concepts:
  - id: arch-measure-problems
    label: "Trois problèmes : pas de la physique, définitions divergentes, caractéristiques composites"
  - id: arch-objective-definitions
    label: "Des définitions objectives créent un langage commun et décomposent les composites en mesures"
  - id: arch-average-vs-percentiles
    label: "La moyenne cache les cas extrêmes : mesurer aussi le maximum et les percentiles"
  - id: arch-performance-budgets
    label: "Budgets de performance (premier rendu, poids des pages) et modèles statistiques avec alertes"
  - id: arch-process-measures
    label: "Mesures de process : testabilité (couverture ≠ confiance) et déployabilité"
glossary:
  - term: "définition objective"
    definition: "Définition d'une caractéristique par des mesures sur lesquelles tout le monde s'accorde."
  - term: "caractéristique composite"
    definition: "Caractéristique faite d'autres plus petites : l'agilité = modularité + déployabilité + testabilité."
  - term: "percentile"
    definition: "Valeur sous laquelle se trouve un pourcentage donné des mesures : p99 = 99 % des requêtes sont plus rapides."
  - term: "budget de performance"
    definition: "Limite chiffrée pour une partie précise de l'application, par exemple 500 ms pour le premier rendu."
  - term: "budget de poids (K-weight)"
    definition: "Nombre maximal d'octets de bibliothèques et frameworks autorisés sur une page."
visuals: []
labs: [arch-ch03-l01-lab-warmup-make-it-measurable, arch-ch03-l01-lab-average-lies]
xp: 35
---

## Pourquoi c'est important

Réunion de crise. Le directeur produit : « Le site est lent. » L'équipe technique : « Non, le temps de réponse moyen est de 120 ms, c'est excellent. » Les deux ont raison. La moyenne est bonne parce que 99 % des requêtes sont rapides ; le 1 % restant prend 6 secondes, et ce sont justement les paniers les plus gros, donc les meilleurs clients.

Tant que « performance » n'a pas de **définition objective** partagée, cette conversation tourne en rond. Ce module apprend à transformer les -ilités en chiffres, puis à les **protéger** automatiquement.

## Trois problèmes de définition

1. **Ce n'est pas de la physique.** Beaucoup de caractéristiques ont un sens flou. Comment conçoit-on « pour l'agilité » ou « pour la déployabilité » ? Les définitions varient d'une entreprise à l'autre, parfois pour de bonnes raisons de contexte, parfois par accident.
2. **Des définitions divergentes.** Dans une même organisation, le développement, l'architecture et l'exploitation ne mettent pas la même chose derrière « performance ». Tant qu'ils ne s'accordent pas, toute discussion est un dialogue de sourds.
3. **Trop composites.** Beaucoup de caractéristiques désirables en contiennent d'autres. L'**agilité** se décompose en **modularité**, **déployabilité** et **testabilité**.

La réponse aux trois : des **définitions objectives**, adoptées par toute l'organisation. Elles créent le **langage ubiquitaire** du module précédent, et elles forcent à décomposer les composites jusqu'à des éléments mesurables.

## Mesures opérationnelles

Certaines caractéristiques ont des mesures évidentes (performance, scalabilité), mais même elles cachent des nuances.

### La moyenne ment par omission

Mesurer le temps de réponse **moyen** est un bon début. Mais si une condition limite fait que **1 %** des requêtes prend **10 fois** plus de temps, la moyenne bouge à peine, et avec assez de trafic, les cas extrêmes disparaissent du tableau de bord. Il faut aussi suivre le **maximum**, et en pratique des **percentiles** (p95, p99) : « 99 % des requêtes répondent en moins de X ».

```typescript
const latencies = [...Array(990).fill(100), ...Array(10).fill(6000)]; // ms
const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
const sorted = [...latencies].sort((a, b) => a - b);
const p = (q: number) => sorted[Math.ceil(q * sorted.length) - 1];
console.log(mean, p(0.5), p(0.99), p(0.999));
// 159 100 100 6000
```

Moyenne 159 ms, médiane 100 ms, p99 100 ms… et pourtant dix clients sur mille attendent 6 secondes. Seul le p99,9 (ou le max) les voit. Le choix du percentile est une **décision** : il dépend du trafic et de qui se cache dans la queue de distribution.

### Les budgets de performance

Les équipes avancées définissent des **budgets** par partie de l'application. Exemples cités par le livre :

- **Premier rendu de la page** (le premier signe visible de progression) : la recherche sur le comportement des utilisateurs situe l'optimum à **500 ms**.
- **Budget de poids** (*K-weight*) : un nombre maximal d'octets de bibliothèques et frameworks par page. La raison est physique : un réseau mobile à forte latence ne transporte qu'un nombre limité d'octets par seconde.
- D'autres métriques de navigateur comme le *first contentful paint* et le *first CPU idle*, très parlantes pour les utilisateurs mobiles.

Un budget a une propriété précieuse : il **influence le design**. Un budget de poids interdit d'ajouter une bibliothèque de 300 Ko pour formater une date.

### Les modèles statistiques

Les meilleures équipes ne fixent pas toujours un seuil arbitraire. Un service de streaming qui suit sa scalabilité **mesure la charge dans le temps**, construit un **modèle statistique** de ce qui est normal, et déclenche une alerte quand la mesure sort de la prédiction. Une alerte a alors deux sens possibles, tous deux utiles : soit le **modèle** est faux, soit **quelque chose ne va pas**.

## Mesures structurelles

Mesurer la qualité interne du code est plus difficile : il n'existe pas de métrique globale de « bonne modularité ». Mais des métriques étroites existent : celles du module 01 (couplage, distance, LCOM), et la **complexité cyclomatique**, sujet de la leçon suivante.

## Mesures de process

Certaines caractéristiques croisent le process de développement. L'**agilité** se décompose en **testabilité** et **déployabilité**, qui se mesurent :

- **Testabilité** : la **couverture de code** est mesurable sur toutes les plateformes. Mais elle ne remplace pas la réflexion : un code base peut avoir **100 % de couverture** avec des assertions médiocres qui ne prouvent rien.
- **Déployabilité** : pourcentage de déploiements réussis, durée d'un déploiement, nombre d'incidents causés par les déploiements…

Chaque équipe doit trouver l'ensemble de mesures qui capture des données **utiles** pour elle. Et ces mesures de process remontent jusqu'à la structure : si testabilité et facilité de déploiement sont prioritaires, l'architecte poussera vers une meilleure **modularité** et plus d'**isolation**. Presque tout peut devenir une caractéristique d'architecture, dès qu'il remplit les trois critères.

### Sous le capot : une couverture qui ne prouve rien

```typescript
function applyDiscount(total: number, code: string) {
  if (code === 'VIP') return total * 0.8;
  return total;
}
// Ce « test » exécute les deux branches : 100 % de couverture.
applyDiscount(100, 'VIP');
applyDiscount(100, 'NONE');
// …et ne vérifie rien. Remplace 0.8 par 8 : il reste vert.
```

La couverture mesure ce qui a été **exécuté**, pas ce qui a été **vérifié**. Le *mutation testing* (hors livre : Stryker en TypeScript) modifie le code et regarde si les tests échouent ; c'est une mesure bien plus honnête de la testabilité.

## Pièges fréquents

- **Piloter à la moyenne** : elle masque précisément les cas qui font fuir les clients.
- **Garder une caractéristique composite sans la décomposer** : « être agile » ne se mesure pas ; la durée d'un déploiement, si.
- **Prendre la couverture pour de la confiance.**
- **Fixer un seuil arbitraire** là où un modèle statistique du normal serait plus juste.

## À retenir

- Les caractéristiques ne sont pas de la physique : écris des **définitions objectives** communes, et **décompose** les composites.
- Moyenne **et** maximum, et surtout des **percentiles** choisis selon ton trafic.
- **Budgets de performance** (premier rendu, poids) : ils guident le design.
- **Modèles statistiques** : alerter quand on sort du normal.
- **Process** : couverture ≠ confiance ; la déployabilité se mesure en taux de succès, durée, incidents.
