---
id: arch-ch08-l03
title: "Le microkernel en entreprise"
source: { chapter: 12, pages: "178-182" }
duration_min: 35
concepts:
  - id: arch-microkernel-examples
    label: "Produits (Eclipse, PMD, Jira, Jenkins, navigateurs) et applications métier (sinistres par juridiction, formulaires fiscaux)"
  - id: arch-rules-engine-mud
    label: "Un moteur de règles géant peut devenir une boule de boue ; des plug-ins par juridiction l'évitent"
  - id: arch-domain-isomorphism
    label: "Seul style à la fois technique et par domaine, grâce à l'isomorphisme domaine-architecture"
  - id: arch-microkernel-ratings
    label: "Notes : simplicité et coût forts ; scalabilité et tolérance aux pannes faibles ; un quantum ; testabilité, déployabilité, fiabilité, modularité, extensibilité et performance un peu au-dessus de la moyenne"
glossary:
  - term: "isomorphisme domaine-architecture"
    definition: "Correspondance naturelle entre la forme du problème métier et celle d'un style (une configuration par lieu ou par client ↔ des plug-ins)."
  - term: "moteur de règles"
    definition: "Logiciel qui évalue des règles métier déclaratives ; utile, mais qui peut devenir une boule de boue quand tout y est mêlé."
  - term: "juridiction"
    definition: "Territoire dont les règles s'appliquent (un État, une province) : chacune a ses règles de sinistres."
visuals: []
labs: [arch-ch08-l03-lab-claims-microkernel]
xp: 35
---

## Pourquoi c'est important

Le microkernel n'est pas réservé aux IDE. Une compagnie d'assurance traite des sinistres dans 50 juridictions, chacune avec ses règles : ici le pare-brise fendu par un caillou est remplacé gratuitement, là non. Tout est dans un moteur de règles central de 12 000 règles. Changer une règle pour une juridiction demande une armée d'analystes, de développeurs et de testeurs, de peur de casser les 49 autres. Cette leçon montre comment le microkernel range ce chaos, et ce que dit son bulletin de notes.

## Des produits partout

La plupart des outils de développement et de livraison sont des microkernels : **Eclipse**, **PMD**, **Jira**, **Jenkins**. Les **navigateurs** (Chrome, Firefox) aussi : visionneuses et extensions ajoutent des capacités absentes du navigateur de base, qui joue le rôle de cœur. Les exemples de produits sont innombrables.

## … et des applications métier

### Les sinistres d'assurance

Le traitement des sinistres est très compliqué : chaque **juridiction** a ses règles et réglementations. Cela crée un ensemble presque infini de conditions pour un processus pourtant standard.

La plupart des applications de sinistres s'appuient sur de grands **moteurs de règles**. Mais ces moteurs peuvent devenir une **boule de boue** : changer une règle en impacte d'autres, et un simple changement mobilise analystes, développeurs et testeurs pour vérifier que rien ne casse.

Avec le microkernel, les règles de **chaque juridiction** vivent dans un **plug-in autonome** (du code, ou une instance de moteur de règles propre au plug-in). On ajoute, retire ou modifie les règles d'une juridiction **sans toucher au reste** ; on ajoute ou retire une juridiction de la même façon. Le **cœur** est le processus standard de déclaration et de traitement d'un sinistre, qui change rarement.

### Les impôts

Aux États-Unis, le formulaire **1040** résume en deux pages tout ce qu'il faut pour calculer l'impôt d'une personne. Chaque ligne du 1040 est un seul nombre, qui demande souvent d'autres formulaires et feuilles de calcul (le revenu brut, par exemple). Chaque formulaire annexe est un **plug-in** ; le 1040 est le **cœur** (le pilote). Quand la loi fiscale change, le changement est isolé dans **un** plug-in : plus facile, moins risqué. Une nouvelle annexe ? Un nouveau plug-in. Une annexe supprimée ? On débranche le plug-in.

### Sous le capot : un cœur qui ne connaît aucune juridiction

```typescript
type Claim = { jurisdiction: string; kind: string; amount: number };
type Rule = (c: Claim) => { covered: boolean; reason: string };
const plugins: Record<string, Rule> = {
  CA: (c) => ({ covered: c.kind !== 'flood', reason: 'Californie : inondation exclue' }),
  TX: (c) => ({ covered: c.kind === 'windshield' || c.amount < 5000, reason: 'Texas : pare-brise couvert' }),
};
function process(c: Claim) {             // le cœur : le processus standard
  const rule = plugins[c.jurisdiction];
  if (!rule) return 'juridiction non prise en charge';
  const r = rule(c);
  return `${c.jurisdiction} ${r.covered ? 'couvert' : 'refusé'}`;
}
console.log(process({ jurisdiction: 'TX', kind: 'windshield', amount: 9000 }), '|',
            process({ jurisdiction: 'CA', kind: 'flood', amount: 100 }));
// TX couvert | CA refusé
```

Changer la règle du Texas ne peut pas casser la Californie : les deux ne se voient pas. C'est toute la promesse du style.

## Le bulletin de notes

Comme pour les couches, la **simplicité** et le **coût** sont les points forts ; la **scalabilité** et la **tolérance aux pannes** sont faibles, à cause du déploiement monolithique. Et comme pour les couches, il n'y a **toujours qu'un quantum** : toute requête passe par le cœur.

Là s'arrêtent les ressemblances.

- **À la fois technique et par domaine.** C'est le **seul** style qui puisse être les deux. La plupart des microkernels sont partitionnés techniquement, mais la dimension domaine naît d'un fort **isomorphisme domaine-architecture** : les problèmes qui demandent une **configuration différente par lieu ou par client** collent extrêmement bien à ce style, comme les produits centrés sur la **personnalisation** et l'**extensibilité** (Jira, Eclipse).
- **Testabilité, déployabilité, fiabilité** : un peu **au-dessus de la moyenne** (trois étoiles), parce que les fonctionnalités sont isolées dans des plug-ins. Bien fait, cela réduit le périmètre de test d'un changement et le risque de déploiement, surtout avec des plug-ins chargés à l'exécution.
- **Modularité et extensibilité** : un peu au-dessus de la moyenne. On ajoute, retire et change des fonctionnalités par des plug-ins autonomes (la nouvelle annexe fiscale).
- **Performance** : un peu au-dessus de la moyenne, parce que les microkernels restent en général petits, souffrent moins du puits que les couches, et peuvent être **allégés** en débranchant l'inutile. Exemple : **Wildfly** (ex-JBoss) va bien plus vite quand on débranche clustering, cache et messagerie.

(Une incohérence du livre à connaître : son résumé cite l'extensibilité parmi les faiblesses, alors que son analyse détaillée la classe juste au-dessus de la moyenne. C'est l'analyse détaillée qui tient : l'extensibilité est la raison d'être du style.)

## Pièges fréquents

- **Tout mettre dans un moteur de règles central** : la boule de boue des règles.
- **Croire qu'un microkernel monte en charge** parce que ses plug-ins sont séparés : un seul quantum.
- **Oublier la tolérance aux pannes** : un plug-in qui plante peut emporter le monolithe.
- **Ignorer l'isomorphisme** : si le problème n'a pas de variations par lieu, client ou formulaire, le style apporte peu.

## À retenir

- Produits : **Eclipse, PMD, Jira, Jenkins, navigateurs**. Métier : **sinistres par juridiction**, **impôts** (1040 = cœur, annexes = plug-ins).
- Les plug-ins par juridiction évitent la **boule de boue** d'un moteur de règles géant.
- **Seul style à la fois technique et par domaine**, grâce à l'**isomorphisme** domaine-architecture.
- Notes : **simplicité, coût** forts ; **scalabilité, tolérance aux pannes** faibles ; **un quantum** ; testabilité, déployabilité, fiabilité, modularité, extensibilité et performance **un peu au-dessus de la moyenne**.
