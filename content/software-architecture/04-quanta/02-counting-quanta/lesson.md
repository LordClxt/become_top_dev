---
id: arch-ch04-l02
title: "Compter les quanta"
source: { chapter: 7, pages: "112-115" }
duration_min: 35
concepts:
  - id: arch-quantum-counting
    label: "Compter les quanta : relier ce qui est lié par un appel synchrone, une base partagée ou une UI partagée"
  - id: arch-shared-db-ui
    label: "Une base ou une interface partagée fond plusieurs services en un seul quantum"
  - id: arch-quantum-split
    label: "Séparer des quanta : fédérer UI et données, remplacer des appels synchrones par de l'asynchrone"
  - id: arch-quantum-decision
    label: "Le nombre de quanta oriente tôt vers un monolithe ou une architecture distribuée"
glossary:
  - term: "base partagée"
    definition: "Une base lue ou écrite par plusieurs services : elle les lie dans un même quantum."
  - term: "UI fédérée"
    definition: "Une interface découpée par domaine (jusqu'à une par service), au lieu d'une seule interface pour tout."
  - term: "réplication asynchrone"
    definition: "Copie des données d'un quantum vers un autre en arrière-plan, sans appel synchrone au moment de la lecture."
  - term: "composante connexe"
    definition: "En théorie des graphes, un groupe de nœuds tous reliés entre eux par un chemin ; ici, un quantum."
visuals: [arch-ch04-quantum-painter]
labs: [arch-ch04-l02-lab-find-the-quanta]
xp: 35
---

## Pourquoi c'est important

Deux équipes présentent leur architecture « microservices ». La première a 12 services, une seule base PostgreSQL et une application web qui appelle tout le monde en REST. La seconde a 5 services, chacun sa base, qui se parlent par événements, et des écrans par domaine. Laquelle a vraiment des parties **indépendantes**, avec des caractéristiques différentes ? Le nombre de services ne répond pas. Le nombre de **quanta**, si.

## La règle pratique

Un quantum est ce qui doit **vivre et tenir ensemble**. Pour les compter, relie deux éléments s'ils sont dans l'un de ces cas :

1. **Appel synchrone** entre eux, dans un sens ou dans l'autre (l'un attend l'autre).
2. **Base de données partagée** (ils lisent ou écrivent les mêmes données).
3. **Interface utilisateur partagée** qui les appelle de façon synchrone (c'est un cas du point 1, mais il est si fréquent qu'il mérite son nom).

Les groupes obtenus (les **composantes connexes** du graphe) sont les quanta. Un lien **asynchrone** (une file, un événement) ne relie **pas** : de chaque côté, les caractéristiques opérationnelles peuvent différer.

Le livre le dit à propos du style service-based : même avec 4 à 12 services déployés séparément, **s'ils partagent la même base ou la même interface**, le système entier n'est **qu'un seul quantum**.

### Sous le capot : un union-find

```typescript
type Link = [string, string, 'sync' | 'async' | 'db'];
function quanta(nodes: string[], links: Link[]): string[][] {
  const parent = new Map(nodes.map((n) => [n, n]));
  const find = (n: string): string => (parent.get(n) === n ? n : find(parent.get(n)!));
  for (const [a, b, kind] of links) if (kind !== 'async') parent.set(find(a), find(b));
  const groups = new Map<string, string[]>();
  for (const n of nodes) groups.set(find(n), [...(groups.get(find(n)) ?? []), n]);
  return [...groups.values()];
}
console.log(quanta(
  ['ui', 'orders', 'payment', 'ordersDb', 'paymentDb'],
  [['ui', 'orders', 'sync'], ['orders', 'ordersDb', 'db'], ['orders', 'payment', 'async'], ['payment', 'paymentDb', 'db']],
).length);
// 2
```

L'interface, Commandes et sa base forment un quantum ; Paiement et sa base un autre, parce que Commandes lui parle par une file. Remplace `'async'` par `'sync'` : il ne reste qu'**un** quantum. Le projet archkit en fait un vrai calculateur.

## Les cas types

- **Monolithe avec une base** : 1 quantum, toujours.
- **Services séparés, base partagée** : 1 quantum. Les services se déploient séparément, mais un changement de schéma ou une saturation de la base les touche tous.
- **Une interface unique + quatre services, chacun sa base** (une question d'auto-évaluation du livre) : si l'interface est un seul déployable qui appelle les quatre services en synchrone, elle les lie : **1 quantum**. Pour en avoir 4, il faut **fédérer** l'interface (un écran par domaine, ou des micro-frontends) ou découpler les appels.
- **Microservices qui communiquent par événements, avec leurs propres données et leurs propres écrans** : autant de quanta que de services. C'est le style qui en a **le plus**.

## Séparer des quanta

Quand une partie du système a des caractéristiques très différentes du reste, on cherche à la **sortir** dans son propre quantum. Les leviers :

- **Fédérer les données** : une base par groupe de services, plutôt qu'une base pour tous.
- **Fédérer l'interface** : une interface par domaine ou par type d'utilisateur.
- **Passer en asynchrone** les liens entre parties qui n'ont pas le même rythme (comme Enchères → Paiement).
- **Répliquer en asynchrone** les données dont un quantum a besoin mais qu'il ne possède pas.

### Le cas de l'administration et du catalogue

Une autre question du livre : un système a une partie **administration** (catalogue produits, entrepôts : des données de référence qui changent peu) et une partie **client** (prise de commande, à forte charge). Combien de quanta ?

Les besoins diffèrent beaucoup (la partie client doit être scalable et élastique, l'administration non) : on vise **deux** quanta. Peuvent-ils partager une base ? Pas en synchrone : ils redeviendraient un seul quantum. La base des données de référence **appartient** au quantum administration (c'est lui qui les modifie) ; la partie client en reçoit une **copie** répliquée de façon asynchrone (ou un cache), et lit sa copie. Si l'administration tombe, les clients continuent de commander.

## Pourquoi c'est une décision précoce

Le nombre de quanta se détermine **avant** de choisir un style :

- **Un seul jeu de caractéristiques** pour tout le système : un **monolithe** suffit (et il est plus simple et moins cher).
- **Plusieurs jeux de caractéristiques** très différents : il faudra probablement une architecture **distribuée**, où chaque quantum porte les siennes.

Le module 05 reviendra sur ce choix, et les modules 06 à 10 détailleront les styles.

::visual{id="arch-ch04-quantum-painter"}

## Pièges fréquents

- **Compter des services au lieu de quanta.**
- **Oublier l'interface** : un front unique qui appelle tout en synchrone est un lien fort.
- **« Découpler » en partageant la base** : les services restent un seul quantum.
- **Croire qu'asynchrone veut dire indépendant pour tout** : la connascence statique (contrats, schémas d'événements) demeure.

## À retenir

- Relie ce qui est lié par un **appel synchrone**, une **base partagée** ou une **UI partagée** : les groupes sont les quanta.
- Une base ou une interface partagée = **un seul quantum**, quel que soit le nombre de services.
- Pour séparer : **fédérer** données et interfaces, passer en **asynchrone**, **répliquer**.
- Un seul jeu de caractéristiques → **monolithe** ; plusieurs → **distribué**.
