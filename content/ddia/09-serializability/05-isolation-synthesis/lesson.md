---
id: ddia-ch09-l05
title: 'Synthèse : anomalies, niveaux d''isolation et choix'
source:
  chapter: 7
  pages: 266-268
duration_min: 25
concepts:
- id: ddia-anomaly-catalog
  label: 'Catalogue d''anomalies : lecture sale, écriture sale, read skew, mise à jour perdue, write skew, fantôme'
- id: ddia-isolation-matrix
  label: Chaque niveau en prévient certaines ; seule la sérialisabilité les prévient toutes
- id: ddia-choose-technique
  label: 'Choisir : exécution en série (rapide et peu de débit d''écriture), 2PL (historique, instable), SSI (optimiste, sans blocage)'
- id: ddia-transactions-value
  label: Les transactions réduisent une grande classe d'erreurs à une simple annulation ; utiles quel que soit le modèle de données
glossary:
- term: anomalie d'isolation
  definition: Un comportement incorrect que seul un niveau d'isolation suffisant empêche.
visuals: []
labs:
- ddia-ch09-l05-lab-isolation-matrix-design
extra: false
xp: 25
---

## Pourquoi c'est important

Les transactions sont une **couche d'abstraction** qui permet à une application de faire comme si certains problèmes de concurrence et certaines fautes matérielles ou logicielles n'existaient pas. Une grande classe d'erreurs se réduit à une simple annulation de transaction, et l'application n'a plus qu'à réessayer. Cette leçon rassemble le chapitre sur un tableau d'ensemble, pour que tu puisses choisir un niveau d'isolation en connaissance de cause.

Toutes les applications ne sont pas sensibles à tous ces problèmes : une application aux accès très simples, qui lit et écrit un seul enregistrement, peut probablement se passer de transactions. Mais pour des accès plus complexes, elles **réduisent énormément le nombre de cas d'erreur** à envisager. Sans transactions, divers scénarios d'erreur (processus qui plantent, coupures réseau, pannes de courant, disque plein, concurrence inattendue) laissent les données incohérentes de multiples façons : des données dénormalisées se désynchronisent facilement des sources. Sans transactions, il est très difficile de raisonner sur les effets d'accès complexes qui interagissent.

## Le catalogue des anomalies

- **Lecture sale** (*dirty read*) : un client lit les écritures d'un autre avant leur validation. *Read committed* et les niveaux plus forts l'empêchent.
- **Écriture sale** (*dirty write*) : un client écrase une donnée qu'un autre a écrite mais pas encore validée. Presque toutes les implémentations de transactions l'empêchent.
- **Read skew** (lecture non répétable) : un client voit des parties de la base à des instants différents. Le plus souvent empêché par l'isolation par instantané, qui permet de lire un instantané cohérent, généralement implémenté par MVCC.
- **Mise à jour perdue** (*lost update*) : deux clients font un cycle lire-modifier-écrire ; l'un écrase l'autre sans incorporer ses changements. Certaines implémentations de l'instantané l'empêchent automatiquement, d'autres exigent un verrou manuel (`SELECT FOR UPDATE`).
- **Write skew** : une transaction lit quelque chose, prend une décision fondée sur la valeur vue et écrit la décision. Mais au moment de l'écriture, la prémisse n'est plus vraie. **Seule l'isolation sérialisable l'empêche.**
- **Lectures fantômes** : une transaction lit des objets qui correspondent à une condition de recherche ; un autre client fait une écriture qui affecte le résultat. L'instantané empêche les fantômes simples, mais ceux qui servent à un write skew demandent un traitement spécial, comme les verrous d'intervalle d'index.

Les niveaux faibles protègent contre certaines de ces anomalies et laissent le développeur gérer les autres à la main (verrouillage explicite). **Seule l'isolation sérialisable les empêche toutes.**


## Trois approches de la sérialisabilité

- **Exécuter littéralement les transactions en série** : si chaque transaction est très rapide et que le débit est assez bas pour un cœur, c'est une option simple et efficace.
- **Verrouillage en deux phases** : pendant des décennies, la méthode standard, mais beaucoup d'applications l'évitent à cause de ses caractéristiques de performance.
- **Sérialisabilité par instantané (SSI)** : un algorithme assez récent qui évite l'essentiel des défauts des précédents. Approche optimiste : les transactions avancent sans bloquer ; à la validation, on vérifie et on annule si l'exécution n'était pas sérialisable.

Les exemples du chapitre utilisaient un modèle relationnel, mais les transactions sont une fonction précieuse **quel que soit le modèle de données**. Les idées ont été vues surtout pour une base sur une seule machine : les transactions dans les bases distribuées ouvrent un nouvel ensemble de défis (modules 10 à 12).

## Pièges fréquents

- **Choisir le niveau par habitude** (le défaut de la base) sans avoir listé les anomalies qui vous menacent.
- **Supposer qu'un seul niveau convient à toute l'application** : on peut avoir un niveau par transaction.
- **Négliger la reprise** : toutes ces techniques annulent des transactions ; l'application doit réessayer.
- **Pense « ACID » = « sérialisable ».**

## À retenir

- Six anomalies à connaître ; seule la sérialisabilité les empêche toutes.
- Trois techniques de sérialisabilité : série (courte et en mémoire), 2PL (verrous, instable), SSI (optimiste, annule à la validation).
- Les transactions simplifient la gestion d'erreur : tout se réduit à annuler et réessayer.
