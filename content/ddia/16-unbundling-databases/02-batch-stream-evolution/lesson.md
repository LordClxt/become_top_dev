---
id: ddia-ch16-l02
title: "Lots et flux : retraiter pour faire évoluer"
source: { chapter: 12, pages: "494-499" }
duration_min: 35
concepts:
  - id: ddia-derived-state-functional
    label: "Maintenir un état dérivé comme une fonction déterministe d'entrées immuables, de façon asynchrone"
  - id: ddia-reprocessing-evolution
    label: "Retraiter l'historique pour restructurer les données quand l'application change"
  - id: ddia-gradual-view-migration
    label: "Migration progressive : ancienne et nouvelle vue dérivées côte à côte, bascule graduelle et réversible"
  - id: ddia-lambda-architecture
    label: "Architecture lambda : couche lots exacte et couche flux approximative en parallèle, et ses défauts"
  - id: ddia-unified-batch-stream
    label: "Unifier lots et flux : rejouer l'historique dans le même moteur, exactly-once, fenêtres sur le temps de l'événement"
glossary:
  - term: "retraitement (reprocessing)"
    definition: "Relire tout ou partie de l'historique des entrées pour recalculer une vue dérivée, par exemple avec une nouvelle logique."
  - term: "migration progressive"
    definition: "Construire la nouvelle vue à côté de l'ancienne à partir des mêmes données, puis déplacer les lecteurs petit à petit."
  - term: "architecture lambda"
    definition: "Proposition de Nathan Marz : les événements immuables alimentent à la fois un traitement par lots (exact, lent) et un traitement de flux (rapide, approximatif)."
  - term: "temps de l'événement (event time)"
    definition: "Le moment où l'événement s'est produit, par opposition au moment où il est traité ; indispensable pour que le retraitement donne le même résultat."
visuals: []
labs: [ddia-ch16-l02-lab-evolution-design]
xp: 40
---

## Pourquoi c'est important

Une application qui vit dix ans change de modèle de données plusieurs fois. Avec une base classique, chaque changement de schéma est une opération risquée : un `ALTER TABLE` sur 800 millions de lignes, une migration qu'on ne sait pas annuler. Quand les données d'usage sont **dérivées** d'un historique d'événements immuable, l'évolution change de nature : on **recalcule** une nouvelle vue à côté de l'ancienne, on compare, puis on bascule. Cette leçon montre comment, et pourquoi le livre préfère un moteur unique pour les lots et les flux.

## Maintenir un état dérivé

Le traitement par lots (chapitre sur les lots) a une saveur **fonctionnelle** : des entrées immuables, des fonctions déterministes sans effet de bord, une sortie qui remplace l'ancienne. Si la tâche échoue, on la relance et on obtient exactement le même résultat. Les processeurs de flux reprennent cette idée : un opérateur gère son état, mais il le dérive des événements, et il peut le reconstruire en les relisant.

Cette discipline a deux avantages :

- **tolérance aux pannes** : une sortie déterministe se recalcule à volonté ;
- **raisonnement simple** : on peut dire « cette vue est la fonction *f* appliquée au log jusqu'à l'offset *n* ».

En théorie, une vue dérivée pourrait être maintenue de façon **synchrone**, comme une base relationnelle met à jour ses index dans la même transaction que la table. Mais le livre souligne que l'**asynchronisme** est ce qui rend le log robuste : une panne dans un consommateur reste locale, alors qu'avec une transaction distribuée, elle se propage. Même un index secondaire de base partitionnée (partitionné par terme, chapitre sur le partitionnement) est souvent maintenu de façon asynchrone pour cette raison.

## Retraiter pour faire évoluer l'application

Les deux traitements se complètent :

- le **flux** reflète les changements de l'entrée avec une faible latence ;
- le **lot** permet de **retraiter** de grandes quantités d'historique pour produire une vue entièrement nouvelle.

Le retraitement est un mécanisme d'**évolution du schéma** bien plus puissant que ceux du chapitre sur l'encodage, qui se limitaient à ajouter un champ optionnel. Ici, tu peux **restructurer** complètement : passer d'une vue « nombre de commandes par ville » à une vue « chiffre d'affaires par pays et par semaine », en relisant tous les événements de commande depuis l'origine.

### La migration progressive

Plutôt que de convertir la vue en place, on dérive la **nouvelle vue à côté de l'ancienne**, à partir du même historique, et on fait tourner les deux en parallèle pendant la transition :

1. lancer la nouvelle dérivation sur l'historique (rattrapage) ;
2. la maintenir ensuite à partir du flux, en parallèle de l'ancienne ;
3. diriger une petite part des lecteurs vers la nouvelle vue (1 %, 10 %, 50 %…) et comparer ;
4. quand tout le monde lit la nouvelle vue, arrêter de maintenir l'ancienne.

Chaque étape est **réversible** : tant que l'ancienne vue existe, un problème se règle en renvoyant les lecteurs vers elle. On peut donc avancer vite, avec peu de risque. Le livre compare cela aux chemins de fer du XIXᵉ siècle : face à plusieurs écartements de rails incompatibles, on a posé une **troisième rail** pour que les trains des deux écartements circulent pendant la transition, puis on a retiré l'ancienne.

## L'architecture lambda

Proposée par Nathan Marz, l'architecture **lambda** part d'une bonne idée : enregistrer les entrées comme des **événements immuables** ajoutés à un ensemble qui ne fait que grandir, et dériver les vues de lecture (comme l'event sourcing). Puis elle fait tourner deux systèmes **en parallèle** :

- une **couche flux** (par exemple Storm) produit vite une vue **approximative** ;
- une **couche lots** (par exemple Hadoop MapReduce) recalcule plus tard la vue **exacte** et remplace l'approximation.

Le raisonnement : le lot est simple et fiable, le flux est réputé fragile ; on accepte donc des erreurs temporaires dans la couche rapide. Le livre en relève les défauts :

- **la même logique écrite deux fois**, dans deux frameworks différents ; des bibliothèques comme Summingbird tentent une abstraction commune, mais le débogage, le réglage et l'exploitation restent doubles ;
- **fusionner** les deux sorties pour répondre aux requêtes est facile pour une somme, beaucoup moins pour des jointures, des sessions ou des agrégats complexes ;
- **retraiter tout l'historique** à chaque fois coûte cher sur de gros volumes ; on passe alors à des lots incrémentaux (par heure), qui réintroduisent les problèmes de **traînards** et de fenêtres à cheval sur deux lots, exactement ce que la couche lots devait éviter.

## Unifier lots et flux

L'évolution récente permet de garder les bonnes idées de lambda sans ses défauts : **un seul système** qui sait à la fois rejouer l'historique et traiter le flux. Trois capacités sont nécessaires :

1. **rejouer les événements historiques dans le même moteur** que le flux : un broker à base de log permet de relire les messages, et certains processeurs de flux lisent directement des fichiers d'un système de fichiers distribué ;
2. **sémantique exactly-once** pour les processeurs de flux : la sortie est la même que s'il n'y avait pas eu de panne, même quand des messages sont rejoués (chapitre sur le traitement de flux : micro-lots, points de contrôle, écritures idempotentes) ;
3. des **fenêtres sur le temps de l'événement**, pas sur le temps de traitement : relire une semaine d'événements en dix minutes ne doit pas tout mettre dans la même fenêtre de dix minutes. Apache Beam fournit ce type d'API, exécutable sur Flink ou Google Cloud Dataflow.

### Aller plus loin
Cette unification est souvent appelée architecture **kappa** (Jay Kreps) : un seul pipeline de flux ; pour changer la logique, on démarre une seconde instance qui relit le log depuis le début dans une nouvelle table de sortie, puis on bascule les lecteurs et on supprime l'ancienne. C'est exactement la migration progressive vue plus haut.

## Pièges fréquents

- **Migrer une vue en place** : impossible de comparer, difficile d'annuler. Dérive la nouvelle à côté.
- **Supprimer l'ancienne vue au moment de la bascule** : tu perds la réversibilité au moment où elle compte le plus.
- **Fenêtrer sur le temps de traitement** : un retraitement donnerait un résultat différent du flux original.
- **Penser que lambda est gratuite** : c'est deux codes, deux exploitations et une fusion délicate.

## À retenir

- Une vue dérivée = une fonction déterministe d'un historique immuable : on peut la recalculer à volonté.
- Le retraitement permet de restructurer les données, pas seulement d'ajouter un champ.
- Migration progressive : ancienne et nouvelle vue en parallèle, bascule graduelle, chaque étape réversible.
- Lambda double la logique ; mieux vaut un moteur unique qui rejoue l'historique, garantit exactly-once et fenêtre sur le temps de l'événement.
