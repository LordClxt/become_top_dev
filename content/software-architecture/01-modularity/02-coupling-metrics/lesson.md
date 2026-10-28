---
id: arch-ch01-l02
title: "Couplage, instabilité et séquence principale"
source: { chapter: 3, pages: "64-68" }
duration_min: 40
concepts:
  - id: arch-afferent-efferent
    label: "Couplage afférent (entrant, Ca) et efférent (sortant, Ce)"
  - id: arch-instability
    label: "Instabilité I = Ce / (Ce + Ca) : la facilité avec laquelle un module casse quand ses dépendances changent"
  - id: arch-abstractness
    label: "Abstraction A : la part d'éléments abstraits (interfaces, classes abstraites) d'un module"
  - id: arch-main-sequence
    label: "Distance à la séquence principale D = |A + I − 1|, zone de douleur et zone d'inutilité"
  - id: arch-metric-limits
    label: "Les métriques de code sont des instruments grossiers qui demandent une interprétation"
glossary:
  - term: "couplage afférent (Ca)"
    definition: "Nombre de connexions entrantes : combien d'autres modules dépendent de celui-ci."
  - term: "couplage efférent (Ce)"
    definition: "Nombre de connexions sortantes : de combien d'autres modules celui-ci dépend."
  - term: "instabilité (I)"
    definition: "Ce / (Ce + Ca), entre 0 (très stable : tout le monde en dépend, il ne dépend de rien) et 1 (très instable)."
  - term: "abstraction (A)"
    definition: "Proportion d'éléments abstraits dans le module, entre 0 (tout concret) et 1 (tout abstrait)."
  - term: "séquence principale"
    definition: "La droite A + I = 1 : l'équilibre idéal entre abstraction et instabilité."
  - term: "zone de douleur"
    definition: "Coin bas-gauche (A et I faibles) : du code concret dont beaucoup dépendent, rigide et pénible à changer."
  - term: "zone d'inutilité"
    definition: "Coin haut-droit (A et I élevés) : des abstractions dont personne ne dépend."
visuals: [arch-ch01-main-sequence]
labs: [arch-ch01-l02-lab-main-sequence]
xp: 40
---

## Pourquoi c'est important

Ton équipe veut modifier `money.ts`, le module qui représente les montants. Petit changement : passer les centimes de `number` à `bigint`. Une semaine plus tard, la pull request touche **84 fichiers** dans 11 dossiers. À l'inverse, le module `reports/` change chaque semaine sans que personne ne s'en aperçoive.

Ces deux modules ne sont pas « bons » ou « mauvais » : ils occupent des **positions** différentes dans le graphe des dépendances. Cette leçon donne les métriques pour voir ces positions avant de payer la facture : couplage entrant et sortant, instabilité, abstraction, et la plus holistique d'entre elles, la **distance à la séquence principale**.

## Afférent et efférent

Les appels et imports forment un **graphe**, ce qui permet une analyse mathématique. En 1979, Edward Yourdon et Larry Constantine (*Structured Design*) ont défini :

- le **couplage afférent (Ca)** : les connexions **entrantes** (qui dépend de moi ?) ;
- le **couplage efférent (Ce)** : les connexions **sortantes** (de qui je dépends ?).

Les noms se ressemblent à dessein (symétrie mathématique), au détriment de la clarté. Moyens mnémotechniques : *a* vient avant *e* comme l'entrée avant la sortie ; *e*fférent comme *e*xit.

Dans ce cours, on compte les dépendances **entre modules distincts** (un module qui s'importe lui-même ne compte pas, et une dépendance compte une fois même si elle est importée dix fois).

## Instabilité

Robert Martin a dérivé de ces deux nombres l'**instabilité** :

> **I = Ce / (Ce + Ca)**

- **I proche de 0** : beaucoup de modules dépendent de lui, il ne dépend de presque rien. Il est **stable**, au sens où le changer est coûteux (c'est `money.ts` : 11 dossiers en dépendent).
- **I proche de 1** : il dépend de beaucoup, personne ne dépend de lui. Il **casse facilement** quand une de ses dépendances change, mais on peut le modifier sans risque pour les autres (c'est `reports/`).

Exemple : `orders` importe `money`, `catalog` et `db` (Ce = 3), et seul `api` l'importe (Ca = 1). I = 3 / 4 = **0,75** : un module plutôt instable, ce qui est normal pour du code métier proche de l'entrée.

Une convention utile : un module isolé (Ca = Ce = 0) a une instabilité indéfinie ; on la fixe à 0.

## Abstraction

L'**abstraction** mesure la part d'éléments **abstraits** (interfaces, classes abstraites, types de contrat) parmi les éléments du module. Un programme de 5 000 lignes dans une seule fonction `main()` a une abstraction proche de 0 ; un module rempli de `AbstractSingletonProxyFactoryBean` en a trop, et personne ne comprend comment les pièces s'assemblent.

> **Précision (hors livre).** Le livre écrit A = Σabstraits / Σconcrets. La définition originale de Martin divise par le **nombre total** d'éléments : A = abstraits / (abstraits + concrets), ce qui garantit A entre 0 et 1. C'est cette version qu'utilisent les outils et le projet archkit.

En TypeScript, compte comme abstraits les `interface`, les `abstract class` et les types qui ne décrivent qu'un contrat ; comme concrets les classes et fonctions qui implémentent.

## La distance à la séquence principale

L'une des rares métriques **holistiques** de structure :

> **D = |A + I − 1|**

Trace un graphe avec A en ordonnée et I en abscisse. La **séquence principale** est la droite qui relie (0, 1) à (1, 0). Elle exprime un équilibre : un module **stable** (I bas) devrait être **abstrait** (A haut), pour qu'on puisse l'étendre sans le modifier ; un module **instable** (I haut) peut être **concret**, puisque personne n'en dépend.

- Près de la droite (D proche de 0) : équilibre sain.
- **Zone de douleur** (bas-gauche, A et I faibles) : du code **concret** dont **tout le monde dépend**. Chaque changement se propage partout. C'est `money.ts` : I ≈ 0, A = 0, D ≈ 1.
- **Zone d'inutilité** (haut-droite, A et I élevés) : des **abstractions dont personne ne dépend**. Des interfaces écrites « pour plus tard ».

Calculons `money.ts` : Ca = 11, Ce = 0, donc I = 0 ; il ne contient que des fonctions et une classe concrète, donc A = 0 ; D = |0 + 0 − 1| = **1**. Pire score possible. Les sorties : réduire ses dépendants (peu réaliste), ou introduire une abstraction stable (un type `Money` opaque et une interface d'opérations) derrière laquelle l'implémentation peut changer.

### Sous le capot : calculer I en quelques lignes

```typescript
const imports: Record<string, string[]> = {
  api: ['orders', 'money'],
  orders: ['money', 'catalog', 'db'],
  catalog: ['money', 'db'],
  money: [],
  db: [],
};
const ca: Record<string, number> = {};
for (const targets of Object.values(imports))
  for (const t of new Set(targets)) ca[t] = (ca[t] ?? 0) + 1;
for (const [m, targets] of Object.entries(imports)) {
  const ce = new Set(targets).size, a = ca[m] ?? 0;
  console.log(m, ce + a === 0 ? 0 : (ce / (ce + a)).toFixed(2));
}
// api 1.00 · orders 0.75 · catalog 0.67 · money 0.00 · db 0.00
```

Le projet archkit de ce module en fait un vrai analyseur : regroupement par dossier, A, D et classement par zone.

## Les limites des métriques

Nos outils sont **très grossiers** comparés à ceux des autres ingénieries. La complexité cyclomatique (module 03) mesure la complexité sans distinguer la complexité **essentielle** (le problème est complexe) de l'**accidentelle** (le code est plus compliqué que nécessaire). Presque toutes les métriques de code demandent une **interprétation**. Elles restent utiles pour établir des **références** et suivre une **tendance** : un D qui grimpe de version en version est un signal, même si sa valeur absolue se discute.

::visual{id="arch-ch01-main-sequence"}

## Pièges fréquents

- **Inverser Ca et Ce** : entrant = afférent, sortant = efférent.
- **Croire qu'« instable » veut dire « mauvais »** : un module instable est souvent du code métier qu'on change librement.
- **Ajouter des interfaces partout pour descendre D** : on glisse vers la zone d'inutilité.
- **Viser une valeur absolue** : ces métriques servent surtout à comparer et à suivre une tendance.

## À retenir

- **Ca** = qui dépend de moi ; **Ce** = de qui je dépends.
- **I = Ce / (Ce + Ca)** : 0 = stable (coûteux à changer), 1 = instable (fragile mais libre).
- **A** = part d'abstractions ; **D = |A + I − 1|** = distance à l'équilibre.
- **Zone de douleur** : concret et très utilisé. **Zone d'inutilité** : abstrait et inutilisé.
- Les métriques **se lisent**, elles ne décident pas.
