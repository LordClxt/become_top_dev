---
id: arch-ch05-l01
title: "Partitionner : technique ou par domaine"
source: { chapter: 8, pages: "119-127" }
duration_min: 40
concepts:
  - id: arch-component
    label: "Le composant est la manifestation physique d'un module : bibliothèque, sous-système ou service"
  - id: arch-architect-components
    label: "L'architecte définit, raffine et gouverne les composants, sans micro-gérer les classes"
  - id: arch-technical-vs-domain
    label: "Partitionnement de haut niveau : technique (couches) ou par domaine (workflows)"
  - id: arch-conway
    label: "Loi de Conway et manœuvre inverse de Conway"
  - id: arch-partition-tradeoffs
    label: "Trade-offs des deux partitionnements, et la tendance vers le domaine"
glossary:
  - term: "composant"
    definition: "Regroupement physique d'un module : package npm, jar, dll, gem… C'est le bloc de construction de l'architecte."
  - term: "partitionnement technique"
    definition: "Découpage de haut niveau par capacités techniques : présentation, règles métier, persistance."
  - term: "partitionnement par domaine"
    definition: "Découpage de haut niveau par domaines ou workflows métier : catalogue, commande, livraison."
  - term: "monolithe modulaire"
    definition: "Un seul déployable et une base, découpé par domaines plutôt que par couches (Simon Brown)."
  - term: "loi de Conway"
    definition: "Les organisations produisent des systèmes qui copient leur structure de communication."
  - term: "manœuvre inverse de Conway"
    definition: "Faire évoluer ensemble l'organisation des équipes et l'architecture visée (Jonny Leroy)."
visuals: [arch-ch05-smeared-workflow]
labs: [arch-ch05-l01-lab-warmup-count-the-ripples]
xp: 40
---

## Pourquoi c'est important

Le métier demande : « Ajoutez un code promo au passage en caisse. » Dans ton application, cela veut dire : un champ dans l'écran (équipe front), une règle dans la couche métier (équipe back), une colonne en base (les DBA), une ligne dans l'API (équipe intégration). Quatre équipes, quatre files de tickets, deux semaines pour un champ.

Personne n'a fait d'erreur de code. C'est le **partitionnement de haut niveau** qui découpe chaque évolution métier en quatre morceaux. C'est l'une des toutes premières décisions d'un architecte, et l'une des plus durables.

## Le composant, bloc de construction de l'architecte

Au module 01, un **module** était un regroupement **logique**. Un **composant** en est la manifestation **physique** : un `jar` en Java, une `dll` en .NET, une `gem` en Ruby, un **paquet npm** (ou un dossier de workspace) en TypeScript. On en distingue plusieurs portées :

- la **bibliothèque** : s'exécute dans le même espace mémoire que le code appelant, communique par appel de fonction, en général dépendance de compilation ;
- le **sous-système** ou la **couche** ;
- le **service** : son propre espace d'adressage, communication réseau (TCP, REST, files de messages), unité déployable autonome (microservices).

Rien n'oblige à utiliser des composants ; c'est simplement utile d'avoir un niveau de modularité au-dessus de celui du langage. Un microservice simple peut ne contenir qu'un peu de code, sans sous-composants.

### Le rôle de l'architecte

L'architecte **définit, raffine, gère et gouverne** les composants, avec les analystes, les experts métier, les développeurs, les testeurs, l'exploitation. Le composant est en général le **plus bas niveau** avec lequel il interagit directement. Les classes et fonctions à l'intérieur relèvent des tech leads et des développeurs. L'architecte peut s'y intéresser (surtout pour les patterns), mais il ne doit pas **micro-gérer** chaque décision : une organisation où personne d'autre ne prend de décision importante ne forme jamais la génération suivante d'architectes.

L'architecture est d'ailleurs **indépendante du process** : peu importe que les exigences viennent d'ateliers formels, d'une analyse en cascade ou de cartes Agile (à l'exception notable des pratiques d'ingénierie, déploiement et gouvernance automatisée).

## Le partitionnement de haut niveau

Avant d'identifier des composants, il faut décider **comment** découper le haut de l'architecture. Deux familles :

- **Technique** : par capacités techniques. Présentation, règles métier, services, persistance. C'est le **monolithe en couches** (module 07) ; le pattern MVC s'y superpose naturellement, ce qui en fait souvent l'architecture par défaut.
- **Par domaine** : par domaines ou workflows métier. Catalogue, Paiement, Livraison. C'est le **monolithe modulaire** popularisé par Simon Brown (un seul déployable, une base, mais découpé par domaines), et la philosophie des **microservices**, inspirée du *Domain-Driven Design*.

Dans les deux cas, chaque composant de haut niveau en contient d'autres : un composant de domaine `CatalogCheckout` peut très bien avoir sa propre couche de persistance. C'est le **haut** du découpage qui change tout.

### Le workflow étalé

Le partitionnement technique a une vraie vertu : la **séparation des préoccupations techniques**. Si la couche service n'est liée qu'à la persistance en dessous et aux règles métier au-dessus, un changement de persistance ne touche que ses voisines. Et on trouve vite « tout le code de persistance ».

Mais la plupart des évolutions réelles sont des **workflows** qui traversent les capacités techniques. Le workflow `CatalogCheckout` est **étalé** dans toutes les couches : un peu dans la présentation, un peu dans les règles, un peu dans la persistance. Le partitionnement par domaine, lui, regroupe tout `CatalogCheckout` dans un composant ; il reflète mieux **le type de changement le plus fréquent** sur un projet.

### Sous le capot : compter les composants touchés

```typescript
// Où vit le code de chaque workflow, selon le partitionnement ?
const technical = { promo: ['ui', 'rules', 'persistence', 'api'], delivery: ['ui', 'rules', 'persistence'] };
const domain = { promo: ['checkout'], delivery: ['delivery'] };
const touched = (p: Record<string, string[]>) => Object.values(p).map((c) => c.length);
console.log(touched(technical), touched(domain));
// [ 4, 3 ] [ 1, 1 ]
```

Chaque composant touché est une revue, une équipe, un risque de conflit. Le projet archkit de ce module calcule cet **impact de changement** sur un vrai graphe, et vérifie que les domaines ne se contournent pas.

## La loi de Conway

À la fin des années 1960, Melvin Conway observe :

> Les organisations qui conçoivent des systèmes sont contraintes de produire des designs qui copient leurs structures de communication.

Une entreprise organisée par compétences techniques (une équipe front, une équipe back, une équipe DBA) produira naturellement une architecture en couches : c'est logique d'un point de vue organisationnel, mais cela **sépare artificiellement** des préoccupations communes. Le code promo du début traverse quatre équipes **parce que** l'organisation est découpée comme l'architecture.

Jonny Leroy (ThoughtWorks) en tire la **manœuvre inverse de Conway** : faire évoluer **ensemble** la structure des équipes et l'architecture visée. Si tu veux des composants par domaine, constitue des équipes **pluridisciplinaires** par domaine.

## Silicon Sandwiches, deux fois

Pour la sandwicherie du module 02, deux partitionnements possibles :

- **Par domaine** : `Purchase`, `Promotion`, `MakeOrder`, `ManageInventory`, `Recipes`, `Delivery`, `Location`, chacun avec un sous-composant de personnalisation (commun et local).
- **Technique** : `Common` et `Local` en composants de haut niveau (toute la personnalisation isolée), plus `Purchase` et `Delivery` pour le workflow.

**Par domaine** : + modélisé sur le fonctionnement du métier plutôt que sur un détail d'implémentation ; + facilite la manœuvre inverse de Conway (équipes par domaine) ; + aligné sur le monolithe modulaire et les microservices ; + le flux de messages correspond au domaine ; + facile de migrer données et composants vers une architecture distribuée. − Le code de personnalisation apparaît à **plusieurs endroits**.

**Technique** : + sépare clairement le code de personnalisation ; + aligné sur l'architecture en couches. − **Couplage global** plus fort (un changement de `Common` ou `Local` touche probablement tous les autres composants) ; − concepts du domaine **dupliqués** entre commun et local ; − couplage plus fort **au niveau des données** (une base unique mêlant domaines et personnalisation), donc migration difficile vers le distribué.

Aucun n'est « le bon » : c'est la première loi. Mais les auteurs observent une **tendance nette** vers le partitionnement par domaine, en monolithe comme en distribué.

::visual{id="arch-ch05-smeared-workflow"}

## Pièges fréquents

- **Partitionner par habitude** (MVC partout) sans regarder le type de changements à venir.
- **Ignorer Conway** : découper l'architecture par domaines en gardant des équipes par couches, et s'étonner des frictions.
- **Micro-gérer les classes** : l'architecte s'arrête aux composants.
- **Confondre composant de domaine et absence de couches** : un composant de domaine peut avoir ses couches internes.

## À retenir

- Le **composant** est la forme physique d'un module : bibliothèque, sous-système, service.
- L'architecte **définit et gouverne les composants**, il ne micro-gère pas les classes.
- Partitionnement de haut niveau : **technique** (couches) ou **par domaine** (workflows). Le second suit mieux les changements réels.
- **Conway** : l'architecture copie l'organisation ; la **manœuvre inverse** aligne volontairement les deux.
- Domaine : modèle le métier, migre facilement, mais disperse la personnalisation. Technique : isole la personnalisation, mais couple tout, y compris les données.
