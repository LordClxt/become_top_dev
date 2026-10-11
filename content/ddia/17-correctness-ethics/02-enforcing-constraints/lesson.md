---
id: ddia-ch17-l02
title: "Imposer des contraintes avec un log"
source: { chapter: 12, pages: "519-524" }
duration_min: 35
concepts:
  - id: ddia-correct-uniqueness-consensus
    label: "Une contrainte d'unicité stricte exige un consensus : un leader unique, ou un point de décision par valeur"
  - id: ddia-correct-uniqueness-log
    label: "Unicité par log : partitionner les demandes par la valeur, les traiter dans l'ordre ; le premier arrivé dans le log gagne"
  - id: ddia-correct-conflict-routing
    label: "Une contrainte se vérifie localement si toutes les écritures qui peuvent entrer en conflit vont dans la même partition"
  - id: ddia-correct-multi-partition
    label: "Virement multi-partitions : requête identifiée dans un log, puis instructions de débit et crédit dérivées et dédupliquées"
  - id: ddia-correct-funds-check
    label: "Vérifier une condition (fonds suffisants) en amont, par un processeur partitionné par le compte payeur"
glossary:
  - term: "contrainte d'unicité"
    definition: "Règle qui interdit à deux enregistrements de partager une valeur : nom d'utilisateur, place de concert, adresse e-mail."
  - term: "diffusion à ordre total (total order broadcast)"
    definition: "Livraison des mêmes messages, dans le même ordre, à tous les destinataires ; équivalente au consensus."
  - term: "partition (d'un log)"
    definition: "Sous-log ordonné ; l'ordre n'est garanti qu'à l'intérieur d'une partition."
  - term: "instruction de débit / de crédit"
    definition: "Message dérivé d'une requête de virement, adressé à la partition d'un seul compte, et portant l'identifiant de la requête."
visuals: []
labs: [ddia-ch17-l02-lab-transfer-log-design]
xp: 40
---

## Pourquoi c'est important

Deux personnes ne doivent pas obtenir le même nom d'utilisateur. Un siège d'avion ne se vend qu'une fois. Un solde ne descend pas sous zéro. Ces **contraintes** sont l'endroit où la distribution fait le plus mal : dès que deux nœuds peuvent accepter des écritures en parallèle, ils peuvent accepter deux écritures incompatibles. La recette classique (transaction distribuée, commit atomique) est lente et fragile. Cette leçon montre une autre voie, entièrement construite avec ce que tu connais déjà : **un log partitionné et des processeurs de flux**.

## L'unicité exige un consensus

Si plusieurs requêtes concurrentes demandent la même valeur, il faut **choisir** laquelle l'emporte et rejeter les autres. Ce choix est une décision unique et partagée : c'est un **consensus** (chapitre sur le consensus). En pratique, on le rend simple en canalisant toutes les décisions vers **un seul nœud**, un leader. Pour passer à l'échelle, on **partitionne par la valeur** contrainte : toutes les demandes pour le nom `ada` vont à la partition qui « possède » `ada`, et ce n'est qu'un leader par partition.

Ce qui ne marche **pas** : la réplication asynchrone multi-leader. Deux leaders peuvent accepter `ada` chacun de leur côté et ne découvrir le conflit qu'après coup (chapitre sur le multi-leader). Pour une unicité **stricte**, il faut une coordination synchrone ; la leçon suivante montre qu'on peut parfois s'en passer.

## L'unicité par un log

Un log garantit que **tous les consommateurs voient les messages dans le même ordre**. Formellement, c'est la diffusion à ordre total, équivalente au consensus. On peut donc imposer l'unicité ainsi :

1. chaque demande de nom est un **message ajouté au log**, dans la partition choisie par le **hachage du nom** ;
2. un **processeur de flux lit séquentiellement** une partition et garde dans une base locale la liste des noms déjà pris ;
3. pour chaque demande, si le nom est libre, il l'enregistre et émet un **message de succès** sur un flux de sortie ; sinon il émet un **refus** ;
4. le client qui a demandé le nom **surveille le flux de sortie** pour connaître l'issue.

Le premier arrivé **dans le log** gagne, pas le premier arrivé au serveur web : l'ordre du log est la seule horloge qui compte. C'est le même algorithme que la construction d'un stockage linéarisable au-dessus d'une diffusion à ordre total, vue au chapitre sur la linéarisabilité.

Exemple chiffré : 64 partitions, et chaque processeur décide une demande en 0,2 ms. Une partition suit 5 000 demandes par seconde, la flotte 320 000. Pour doubler le débit, on double les partitions : chaque partition reste un traitement **séquentiel**, sans verrou et sans coordination entre partitions.

### Ce qui conditionne la méthode

Cela marche pour **toute contrainte** dont les écritures en conflit peuvent être **routées vers la même partition** et traitées dans l'ordre. Et la définition du conflit dépend de l'application :

- un nom insensible à la casse : `Ada` et `ada` sont en conflit, donc il faut **normaliser avant de hacher**, sinon ils tombent dans deux partitions et la contrainte est contournée ;
- une place de concert : on partitionne par l'identifiant de la place ;
- une contrainte qui relie des valeurs sans clé commune (« au plus 3 réservations par personne **et** par salle ») ne se range pas dans une seule partition : il faut un autre découpage ou une autre approche.

## Les requêtes multi-partitions sans commit atomique

Un virement touche trois choses partitionnées différemment : l'**identifiant de requête**, le **compte payeur**, le **compte bénéficiaire**. Les trois peuvent vivre sur des partitions différentes. La méthode classique serait un commit atomique entre ces partitions, qui force un ordre total sur toutes les transactions touchant ces partitions et fait chuter le débit.

La version par logs se fait en étapes :

1. le client donne au virement un **identifiant unique** ; la requête est **ajoutée au log**, dans la partition déterminée par cet identifiant ;
2. un processeur lit le log des requêtes. Pour chacune, il émet **deux messages** : une **instruction de débit** vers la partition du compte payeur A, et une **instruction de crédit** vers la partition du compte bénéficiaire B. Les deux portent l'**identifiant d'origine** ;
3. d'autres processeurs consomment ces flux d'instructions, **dédupliquent par identifiant** de requête et appliquent les changements aux soldes.

Pourquoi c'est correct ? Parce que l'étape 1 est une **écriture unique** sur un seul objet : elle est atomique par nature. Si le processeur de l'étape 2 plante, il reprend au dernier point de contrôle et **relit** des requêtes déjà traitées ; comme il est **déterministe**, il émet les mêmes instructions, et l'étape 3 les reconnaît grâce à l'identifiant. Rien ne peut être à moitié fait : une requête dans le log finira par produire exactement un débit et un crédit.

### Et le solde insuffisant ?

Pour refuser un virement sans provision, on ajoute un processeur **en amont**, partitionné par **compte payeur**, qui tient les soldes et valide chaque demande. Comme toutes les demandes d'un même payeur passent par sa partition, dans l'ordre, la vérification est séquentielle. Seules les demandes validées sont écrites dans le log des requêtes de l'étape 1.

On a ainsi découpé une transaction multi-partitions en plusieurs étapes à partition unique, et utilisé l'**identifiant de bout en bout** de la leçon précédente pour rendre chaque étape idempotente. Résultat : la même correction, sans commit atomique, avec un débit qui croît avec le nombre de partitions.

### Aller plus loin : où on retrouve ce motif

Les sagas des architectures microservices découpent aussi une transaction en étapes locales, mais s'appuient souvent sur des **compensations** plutôt que sur un log déterministe. Les plateformes de flux modernes (Kafka avec ses transactions, Flink avec ses points de contrôle) fournissent les briques « lecture, traitement, écriture » de façon atomique dans leur périmètre, ce qui simplifie l'étape 2. L'identifiant de bout en bout reste nécessaire dès qu'un système extérieur entre dans la boucle.

## Pièges fréquents

- **Hacher la valeur brute au lieu de sa forme normalisée** : `Ada` et `ada` arrivent dans deux partitions et sont acceptés tous les deux.
- **Croire que « premier arrivé » veut dire premier à toucher le serveur** : seul l'ordre du log tranche.
- **Faire écrire les soldes directement par le processeur qui découpe les requêtes** : on perd le partitionnement par compte et le traitement séquentiel par compte.
- **Oublier l'identifiant dans les instructions dérivées** : après une reprise, les instructions rejouées ne sont plus reconnues.
- **Répondre au client avant que l'issue soit dans le flux de sortie** : il croit avoir un nom que la partition a peut-être refusé.

## À retenir

- Une unicité stricte est une décision partagée : un consensus, rendu simple par un leader par valeur ou par partition.
- Avec un log partitionné par la valeur (normalisée) et un processeur séquentiel, le premier arrivé dans le log gagne.
- La méthode s'applique à toute contrainte dont les écritures en conflit tombent dans la même partition.
- Un virement multi-partitions devient : requête identifiée dans un log, puis débit et crédit dérivés de façon déterministe et dédupliqués par l'identifiant.
- Une vérification de fonds se fait en amont, par un processeur partitionné par le compte payeur.
