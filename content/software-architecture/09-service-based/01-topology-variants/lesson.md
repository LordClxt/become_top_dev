---
id: arch-ch09-l01
title: "Topologie et variantes"
source: { chapter: 13, pages: "183-187" }
duration_min: 35
concepts:
  - id: arch-sb-topology
    label: "Interface déployée à part, 4 à 12 services de domaine à gros grain (7 en moyenne), une base partagée"
  - id: arch-sb-access
    label: "Accès distant (REST, messagerie, RPC), service locator, instances multiples derrière un répartiteur"
  - id: arch-sb-shared-db
    label: "La base partagée permet SQL et jointures comme un monolithe ; c'est le changement de schéma qui coûte"
  - id: arch-sb-variants
    label: "Variantes : interfaces fédérées, bases fédérées (si les données ne servent qu'à un service), couche d'API"
glossary:
  - term: "architecture service-based"
    definition: "Style distribué hybride : une interface, des services de domaine à gros grain déployés séparément, une base souvent partagée."
  - term: "service de domaine"
    definition: "Une « portion d'application » à gros grain, indépendante et déployée séparément (Commande, Facturation…)."
  - term: "service locator"
    definition: "Pattern par lequel l'interface (ou la gateway) trouve l'adresse du service à appeler."
  - term: "interface fédérée"
    definition: "Interface découpée par domaine, jusqu'à une par service."
  - term: "couche d'API"
    definition: "Reverse proxy ou gateway entre l'interface et les services : exposition externe et préoccupations transverses."
visuals: [arch-ch09-federate]
labs: [arch-ch09-l01-lab-warmup-variants]
xp: 35
---

## Pourquoi c'est important

Ton monolithe en couches devient trop gros : chaque livraison emporte tout, une fuite mémoire dans les rapports fait tomber la prise de commande. On te propose des microservices : 40 services, un service mesh, des sagas partout, une équipe plateforme. Ton équipe compte huit développeurs. Entre le monolithe qui étouffe et les microservices qui ruinent, il existe un style que le livre qualifie de **l'un des plus pragmatiques** : l'architecture **service-based**.

## Un hybride pragmatique

L'architecture service-based est un **hybride** du style microservices. Elle est distribuée, mais **sans le niveau de complexité et de coût** des autres styles distribués (microservices, event-driven). D'où sa grande popularité pour les applications métier.

## La topologie de base

Une structure en **macro-couches distribuées** :

- une **interface utilisateur** déployée séparément ;
- des **services de domaine à gros grain**, distants, déployés séparément ;
- une **base de données monolithique**.

Les services sont des « **portions d'application** » : indépendantes, à gros grain, centrées sur un domaine. Ils se déploient comme n'importe quelle application monolithique (un WAR, un assemblage .NET, une image Node) et n'exigent **pas** de conteneurisation (même si rien ne l'interdit). Comme ils partagent en général une base, on en compte **de 4 à 12**, **7** en moyenne.

### Instances et accès

- La plupart du temps, **une seule instance** de chaque service. Pour la scalabilité, la tolérance aux pannes ou le débit, on peut en avoir plusieurs, avec alors un **répartiteur de charge** entre l'interface et le service, pour diriger vers une instance saine.
- L'interface accède aux services par un **protocole distant** : surtout **REST**, mais aussi messagerie, RPC, voire SOAP.
- Une couche d'API (proxy, gateway) peut s'intercaler, mais le plus souvent l'interface appelle **directement** les services, grâce à un **service locator** intégré à l'interface, à la gateway ou au proxy.

### La base partagée

Point essentiel : une **base centrale partagée**. Les services peuvent utiliser **SQL et les jointures** comme dans un monolithe en couches. Avec 4 à 12 services, les connexions à la base ne posent pas de problème. Les **changements de schéma**, en revanche, peuvent en poser : c'est l'objet de la leçon suivante.

## Les variantes

Le style est peut-être **le plus flexible** de tous, tant il a de variantes.

### Interfaces fédérées

L'interface unique peut être découpée en **domaines d'interface**, jusqu'à **une interface par service**. On gagne en tolérance aux pannes, en scalabilité, en sécurité (une interface publique ne voit pas les fonctions internes).

### Bases fédérées

La base monolithique peut être découpée en plusieurs bases, jusqu'à une base par service de domaine (comme en microservices). Condition impérative : les données de chaque base ne doivent **pas** être nécessaires à un autre service. On évite ainsi deux choses :

- la **communication entre services** de domaine, **à éviter absolument** dans ce style ;
- la **duplication** de données entre bases.

### La couche d'API

On peut ajouter entre l'interface et les services une **couche d'API** (reverse proxy ou gateway). Bonne pratique quand on **expose** des fonctions à des **systèmes externes**, ou pour sortir de l'interface des **préoccupations transverses** : métriques, sécurité, audit, découverte de services.

### Sous le capot : variantes et quanta

```typescript
// Combien de quanta selon ce qui est partagé ? (module 04 : UI ou base partagée = un quantum)
function quantaOf(services: string[], uiOf: Record<string, string>, dbOf: Record<string, string>) {
  const parent = new Map(services.map((s) => [s, s]));
  const find = (s: string): string => (parent.get(s) === s ? s : find(parent.get(s)!));
  for (const a of services) for (const b of services) {
    if (uiOf[a] === uiOf[b] || dbOf[a] === dbOf[b]) parent.set(find(a), find(b));
  }
  return new Set(services.map(find)).size;
}
const svc = ['quote', 'status', 'receive', 'assess'];
console.log(
  quantaOf(svc, { quote: 'ui', status: 'ui', receive: 'ui', assess: 'ui' }, { quote: 'db', status: 'db', receive: 'db', assess: 'db' }),
  quantaOf(svc, { quote: 'web', status: 'web', receive: 'ops', assess: 'ops' }, { quote: 'ext', status: 'ext', receive: 'int', assess: 'int' }),
);
// 1 2
```

Tant que l'interface **ou** la base est commune, tout est un seul quantum. Fédérer **les deux** par groupe de services fait apparaître des quanta distincts.

::visual{id="arch-ch09-federate"}

## Pièges fréquents

- **Des services qui s'appellent entre eux** : c'est le signe qu'ils sont mal découpés, ou qu'on glisse vers des microservices sans en avoir les outils.
- **Fédérer une base dont les données servent à d'autres services** : appels inter-services ou duplication garantis.
- **Trop de services** : au-delà d'une douzaine sur une base partagée, on perd la simplicité du style.
- **Croire qu'on a plusieurs quanta** parce qu'on a plusieurs services, alors que l'interface et la base sont communes.

## À retenir

- **Interface** + **4 à 12 services de domaine à gros grain** (≈ 7) + **base partagée** : un distribué simple et pas cher.
- Accès en **REST** (ou messagerie, RPC), **service locator**, une instance par service sauf besoin, **répartiteur** sinon.
- Base partagée : **SQL et jointures** comme un monolithe ; le risque est le **changement de schéma**.
- Variantes : **interfaces fédérées**, **bases fédérées** (seulement si les données ne servent qu'à un service), **couche d'API** pour l'externe et le transverse.
