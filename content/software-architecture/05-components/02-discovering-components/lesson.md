---
id: arch-ch05-l02
title: "Découvrir les composants"
source: { chapter: 8, pages: "128-132" }
duration_min: 40
concepts:
  - id: arch-identification-flow
    label: "Cycle itératif : composants initiaux, affecter les exigences, rôles et responsabilités, caractéristiques, restructurer"
  - id: arch-granularity
    label: "Granularité : trop fin = trop de communication ; trop gros = couplage interne, déployabilité et testabilité en berne"
  - id: arch-entity-trap
    label: "Piège des entités : un Manager par entité n'est pas une architecture, c'est un mapping ORM"
  - id: arch-discovery-techniques
    label: "Techniques de découverte : acteurs/actions, event storming, approche par workflows"
glossary:
  - term: "piège des entités (entity trap)"
    definition: "Anti-pattern : créer un composant « Manager » par entité de la base, en confondant relations de données et workflows."
  - term: "acteurs/actions"
    definition: "Technique (issue du Rational Unified Process) : identifier qui utilise le système et ce que chacun fait, puis en déduire des composants."
  - term: "event storming"
    definition: "Technique issue du DDD : identifier les événements du système et bâtir les composants autour de leurs gestionnaires."
  - term: "approche par workflows"
    definition: "Identifier les rôles, leurs workflows, et construire les composants autour des activités, sans supposer de messagerie."
  - term: "CRUD"
    definition: "Create, Read, Update, Delete : les quatre opérations de base sur des données."
visuals: [arch-ch05-identification-cycle]
labs: [arch-ch05-l02-lab-entity-trap, arch-ch05-l02-lab-six-teams]
xp: 40
---

## Pourquoi c'est important

Premier jour d'un nouveau projet de site d'enchères. Un architecte ouvre le modèle de données : `Bidder`, `Auction`, `Item`, `Bid`, `Payment`, `Video`. Il crée `BidderManager`, `AuctionManager`, `ItemManager`, `BidManager`, `PaymentManager`, `VideoManager`. Six composants, un par table. Ça a l'air propre.

Ce n'est **pas** une architecture : c'est le schéma de la base recopié en code. Personne ne sait où mettre « placer une enchère pendant les dix dernières secondes », qui touche cinq de ces Managers. Cette leçon donne une méthode pour trouver de **vrais** composants, et les pièges à éviter.

## Le rôle du développeur

Les développeurs prennent les composants conçus **avec** l'architecte et les subdivisent en classes, fonctions ou sous-composants. La conception des classes est une responsabilité partagée, dont la plus grosse part revient aux développeurs. Et surtout : le découpage initial n'est **jamais le dernier mot**. C'est un **premier brouillon** ; l'implémentation révélera des détails et des corrections.

## Un cycle, pas une étape

L'identification des composants marche mieux comme un **processus itératif**, qui produit des candidats puis les raffine :

1. **Identifier des composants initiaux.** Avant toute ligne de code, l'architecte choisit un partitionnement de haut niveau, puis invente des composants de départ. Cela peut sembler arbitraire, mais on ne peut guère partir de plus concret. La probabilité que ce premier jeu soit bon est **faible** : d'où l'itération.
2. **Affecter les exigences** (ou les user stories) aux composants pour voir si elles s'y logent bien. On crée, fusionne ou scinde des composants. L'objectif n'est pas l'exactitude, mais un **substrat à gros grain** sur lequel raffiner.
3. **Analyser les rôles et responsabilités** pour aligner la granularité des composants sur celle du domaine.
4. **Analyser les caractéristiques d'architecture** : deux parties qui gèrent des saisies d'utilisateurs peuvent avoir des besoins très différents (des centaines d'utilisateurs simultanés d'un côté, quelques-uns de l'autre). Une vue purement fonctionnelle donnerait **un** composant ; les caractéristiques imposent de **subdiviser**.
5. **Restructurer** : la conception révèle toujours des difficultés imprévues ; on itère avec les développeurs, qui comprennent mieux, au fil du code, où doivent vivre les comportements.

Puis on recommence. Certains domaines ajoutent des étapes (audit de sécurité, par exemple).

## La granularité

Trouver la bonne granularité est l'une des tâches les plus difficiles de l'architecte :

- **Trop fin** : il faut trop de communication entre composants pour obtenir un résultat.
- **Trop gros** : fort couplage interne, d'où des difficultés de **déployabilité** et de **testabilité**, et tous les maux de modularité du module 01.

## Le piège des entités

L'anti-pattern du début a un nom : le **piège des entités** (*entity trap*). L'architecte prend chaque entité des exigences et en fait un composant `Manager`. Le livre est sévère : ce n'est **pas une architecture**, c'est un **mapping objet-relationnel** d'un framework vers une base.

Si une application n'a vraiment besoin que de **CRUD** (créer, lire, modifier, supprimer), pas besoin d'architecture : des frameworks génèrent l'interface directement depuis la base. **Naked Objects** (devenu Apache Isis en Java) construit une interface à partir des tables et de leurs relations ; le **scaffolding** de Ruby on Rails fait la même chose. Utilise-les.

Le piège naît quand on prend les **relations de la base** pour les **workflows** de l'application, une correspondance qui n'existe presque jamais dans la réalité. Il trahit un manque de réflexion sur les workflows réels. Et ses composants sont en général **trop gros** : un `AuctionManager` qui fait tout ce qui touche à une enchère ne guide en rien l'organisation du code.

## Trois techniques de découverte

Aucune n'est supérieure ; chacune a ses trade-offs.

- **Acteurs/actions** (issue du *Rational Unified Process*) : identifier les **acteurs** qui utilisent l'application et les **actions** de chacun. Elle s'est popularisée avec les process à forte conception initiale, mais elle fonctionne bien partout, monolithe ou distribué, dès que les exigences font apparaître des rôles distincts. C'est la technique **généraliste**.
- **Event storming** (issue du DDD, populaire avec les microservices) : on suppose que les composants communiqueront par **messages ou événements**. L'équipe cherche les événements qui se produisent dans le système, à partir des exigences et des rôles, et bâtit les composants autour de leurs gestionnaires. Idéal pour une architecture distribuée par messages, car on définit au passage les messages.
- **Approche par workflows** : comme l'event storming, mais **sans** la contrainte de messagerie. On identifie les rôles, leurs workflows, et on construit les composants autour des activités.

Le choix suit souvent le process : une équipe en cascade préférera acteurs/actions, très général ; une équipe DDD en microservices trouvera dans l'event storming un alignement parfait.

### Sous le capot : du piège des entités aux workflows

```typescript
// Piège des entités : un Manager par table, chacun « fait tout » sur son entité.
const entityTrap = ['BidderManager', 'AuctionManager', 'ItemManager', 'BidManager', 'PaymentManager'];

// Acteurs/actions : on part de qui fait quoi.
const actions = {
  bidder: ['voir la vidéo', 'voir le fil des offres', 'enchérir'],
  auctioneer: ['saisir les offres en salle', 'recevoir les offres en ligne', 'adjuger'],
  system: ['démarrer la vente', 'faire payer', 'suivre l’activité'],
};
// …chaque action trouve un composant qui la porte (leçon suivante).
console.log(entityTrap.length, Object.values(actions).flat().length);
// 5 9
```

Cinq Managers qui ne disent rien du comportement, contre neuf actions qui décrivent ce que le système doit **faire** : c'est à partir d'elles que l'on découpe.

::visual{id="arch-ch05-identification-cycle"}

## Pièges fréquents

- **Le piège des entités** : un composant par table.
- **Figer le premier découpage** : il est presque certainement faux, il doit être révisé.
- **Découper uniquement par fonction** sans regarder les caractéristiques : un même composant ne peut pas servir à la fois des milliers d'utilisateurs élastiques et un poste critique.
- **Chercher la technique « supérieure »** : choisis celle qui colle à ton process et à ta communication (messages ou non).

## À retenir

- Le découpage initial est un **brouillon** : itère (exigences, rôles, caractéristiques, restructuration).
- **Granularité** : trop fin = bavardage ; trop gros = couplage, déployabilité et testabilité en berne.
- Le **piège des entités** confond données et workflows ; pour du pur CRUD, prends un framework.
- **Acteurs/actions** (généraliste), **event storming** (messages, DDD), **workflows** (sans messages).
