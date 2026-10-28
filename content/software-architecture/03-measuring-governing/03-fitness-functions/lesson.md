---
id: arch-ch03-l03
title: "Gouverner par les fitness functions"
source: { chapter: 6, pages: "102-110" }
duration_min: 45
concepts:
  - id: arch-governance
    label: "La gouvernance (kubernan : piloter) protège l'important face à l'urgent"
  - id: arch-fitness-mechanisms
    label: "Fitness function = tout mécanisme d'évaluation objective : métriques, tests, moniteurs, chaos engineering"
  - id: arch-cycle-detection
    label: "Les cycles de dépendances détruisent la modularité : une fitness function les attrape avant la revue de code"
  - id: arch-layer-rules
    label: "Règles de couches et de distance vérifiées automatiquement (ArchUnit, NetArchTest)"
  - id: arch-chaos-engineering
    label: "Chaos engineering et Simian Army : la question n'est pas si ça casse, mais quand"
  - id: arch-fitness-collaboration
    label: "Expliquer une fitness function aux développeurs avant de l'imposer ; une checklist automatisée"
glossary:
  - term: "gouvernance"
    definition: "Du grec kubernan, piloter : la responsabilité de l'architecte d'influencer tout ce qui touche à l'architecture."
  - term: "cycle de dépendances"
    definition: "Des composants qui se référencent mutuellement, directement ou par un chemin : on ne peut plus en réutiliser un sans les autres."
  - term: "Big Ball of Mud"
    definition: "Anti-pattern : un système sans structure discernable, où tout dépend de tout."
  - term: "chaos engineering"
    definition: "Discipline qui provoque volontairement des pannes en production pour vérifier que le système les encaisse."
  - term: "Simian Army"
    definition: "Famille d'outils de Netflix (Chaos Monkey, Latency Monkey, Chaos Kong, Conformity, Security, Janitor Monkey)."
  - term: "cliquet (ratchet)"
    definition: "Une fitness function qui tolère la dette existante mais refuse toute aggravation, et se resserre quand on s'améliore."
visuals: [arch-ch03-fitness-mechanisms]
labs: [arch-ch03-l03-lab-pick-the-mechanism, arch-ch03-l03-lab-green-ci-cycle]
xp: 45
---

## Pourquoi c'est important

La modularité est **importante mais jamais urgente**. Le lundi, une fonctionnalité doit sortir ; l'IDE propose « importer automatiquement `OrderService` ? », le développeur clique par réflexe. Le mardi, `orders` importe `billing` qui importe `orders`. Personne ne l'a voulu, personne ne l'a vu, et la revue de code de vendredi arrive trop tard : dix autres imports ont suivi.

Comment faire respecter ce qui compte sans regarder par-dessus l'épaule de chaque développeur ? En le **codant** dans la plateforme elle-même : c'est la **gouvernance par fitness functions**.

## Gouverner, c'est piloter

**Gouvernance** vient du grec *kubernan*, piloter. Elle couvre tout aspect du développement sur lequel l'architecte veut exercer une influence ; la qualité logicielle, par exemple, en fait partie, car la négliger produit des désastres.

La bonne nouvelle : l'automatisation l'a rendue bien plus légère. L'Extreme Programming a créé l'intégration continue, qui a gagné l'exploitation (DevOps), puis la gouvernance d'architecture. Le livre *Building Evolutionary Architectures* décrit cette famille de techniques : les **fitness functions**.

## Fitness function : tout mécanisme

Le mot vient de l'**informatique évolutionnaire**. Un algorithme génétique produit une réponse, mute, recommence ; pour le guider, une **fonction d'aptitude** mesure à quel point chaque résultat approche du but. Pour le voyageur de commerce : la longueur du trajet, ou son coût, ou le temps passé loin de chez soi. L'architecture évolutionnaire reprend l'idée :

> **Fitness function d'architecture** : *tout mécanisme* qui fournit une évaluation objective de l'intégrité d'une caractéristique d'architecture (ou d'une combinaison de caractéristiques).

Ce n'est pas un framework à télécharger, mais un **regard nouveau** sur des outils existants. « Tout mécanisme » est à prendre au pied de la lettre : **métriques**, **tests unitaires**, **moniteurs** en production, **chaos engineering**… Les mécanismes sont aussi variés que les caractéristiques.

## Exemple 1 : les cycles

Des composants qui se référencent mutuellement (directement ou par un chemin) forment un **cycle**. On ne peut plus réutiliser l'un sans emporter les autres ; et si chacun est couplé à d'autres encore, le système glisse vers le **Big Ball of Mud**.

La fitness function : un test, dans le build continu, qui analyse les dépendances entre packages et **échoue s'il existe un cycle**. Le livre utilise JDepend en Java ; le principe :

```typescript
// Détecte un cycle dans un graphe de dépendances (parcours en profondeur, trois couleurs).
function hasCycle(graph: Record<string, string[]>): boolean {
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (n: string): boolean => {
    if (state.get(n) === 'visiting') return true;   // on revient sur le chemin en cours : cycle
    if (state.get(n) === 'done') return false;
    state.set(n, 'visiting');
    const found = (graph[n] ?? []).some(visit);
    state.set(n, 'done');
    return found;
  };
  return Object.keys(graph).some(visit);
}
console.log(hasCycle({ orders: ['money'], billing: ['orders'], money: [] }),
            hasCycle({ orders: ['billing'], billing: ['orders'] }));
// false true
```

C'est l'exemple parfait d'une fitness function qui garde **l'important plutôt que l'urgent** : capital pour l'architecte, sans impact sur le codage au quotidien. Le projet archkit de ce module en fait un détecteur qui **nomme** les cycles (composantes fortement connexes).

## Exemple 2 : distance et couches

- **Distance à la séquence principale** (module 01) : un test qui échoue si un package dépasse une **tolérance** (0,5 dans l'exemple du livre, à ajuster selon le projet).
- **Couches** : en Java, **ArchUnit** exprime l'architecture en couches comme un test (« le contrôleur n'est accédé par aucune couche, le service seulement par le contrôleur, la persistance seulement par le service »). En .NET, **NetArchTest** fait de même. En TypeScript, **dependency-cruiser** ou… l'outil que tu as écrit au module 00.

Pourquoi en a-t-on besoin ? Certains développeurs ne comprennent pas l'intérêt des couches ; d'autres préfèrent « demander pardon plutôt que la permission » pour une raison locale, comme la performance. Laisser chacun éroder les raisons de l'architecture abîme sa santé à long terme.

> **Explique le but d'une fitness function aux développeurs avant de la leur imposer.** L'intention n'est pas qu'un groupe d'architectes, dans sa tour d'ivoire, écrive des règles ésotériques incompréhensibles.

## Exemple 3 : le chaos en production

Quand Netflix a migré vers le cloud d'Amazon, ses architectes ont perdu le contrôle de l'exploitation. Que se passe-t-il si un défaut apparaît en production ? Ils ont inventé le **chaos engineering** :

- **Chaos Monkey** provoque des pannes aléatoires en production pour vérifier que le système tient.
- **Latency Monkey** simule une forte latence (un vrai problème sur certaines instances).
- **Chaos Kong** simule la perte d'un **centre de données entier**, ce qui a aidé Netflix à traverser de vraies pannes de ce type.
- **Conformity Monkey** vérifie en production des règles de gouvernance (par exemple : chaque service répond correctement à tous les verbes REST).
- **Security Monkey** cherche les défauts de sécurité connus (ports ouverts, erreurs de configuration).
- **Janitor Monkey** repère les services **orphelins** que plus personne n'appelle et les supprime, parce qu'ils coûtent de l'argent.

Le changement de perspective : **la question n'est pas *si* quelque chose va casser, mais *quand***. Anticiper ces pannes rend le système bien plus robuste.

## Une checklist automatisée

Atul Gawande, dans *The Checklist Manifesto*, montre que pilotes et chirurgiens utilisent des checklists, non parce qu'ils ignorent leur métier, mais parce qu'en répétant un travail très détaillé, des détails finissent par glisser. C'est la bonne façon de voir les fitness functions : pas un mécanisme de gouvernance lourd, mais une **checklist automatisée** des principes importants. Les développeurs savent qu'il ne faut pas livrer de code non sécurisé ; mais cette priorité est en concurrence avec des centaines d'autres. La fitness function l'inscrit dans le **substrat** de l'architecture.

### Sous le capot : adopter une fitness function sur un code existant

En pratique, la première exécution d'une fitness function sur un vieux code base trouve **des dizaines** de violations. Exiger zéro tout de suite bloque toute l'équipe ; ne rien exiger ne sert à rien. Le compromis professionnel (hors livre) est le **cliquet** (*ratchet*) : on enregistre les violations actuelles comme **référence**, la CI refuse toute **nouvelle** violation, et chaque violation corrigée est retirée de la référence, qui ne peut que diminuer. Tu l'implémenteras dans le projet de ce module.

::visual{id="arch-ch03-fitness-mechanisms"}

## Pièges fréquents

- **Compter sur la revue de code** pour les cycles : elle arrive trop tard.
- **Une fitness function au périmètre incomplet** : elle n'analyse que certains dossiers, et un nouveau module passe à travers (c'est l'enquête de cette leçon).
- **Imposer sans expliquer** : les développeurs la contourneront ou la désactiveront.
- **Exiger zéro violation d'un coup** sur un code existant, au lieu d'un cliquet.
- **Croire que « ça ne cassera pas »** : le chaos engineering part du principe inverse.

## À retenir

- **Gouverner** = piloter ; les fitness functions protègent l'**important** face à l'**urgent**.
- **Tout mécanisme** objectif : métriques, tests, moniteurs, chaos.
- Exemples types : **pas de cycles**, **distance sous tolérance**, **règles de couches**, **Simian Army**.
- **Explique** avant d'imposer ; vois-les comme une **checklist automatisée**.
- Sur un code existant, adopte-les avec un **cliquet**.
