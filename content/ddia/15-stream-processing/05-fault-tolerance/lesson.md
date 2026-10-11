---
id: ddia-ch15-l05
title: "Tolérance aux pannes : l'exactly-once effectif"
source: { chapter: 11, pages: "476-488" }
duration_min: 40
concepts:
  - id: ddia-sp-exactly-once
    label: "Exactly-once (effectively-once) : le résultat est le même que si aucune panne n'avait eu lieu, même si des enregistrements sont traités deux fois"
  - id: ddia-sp-microbatching
    label: "Micro-batching : découper le flux en lots d'environ une seconde ; fenêtre implicite en temps de traitement, compromis surcoût/latence"
  - id: ddia-sp-checkpointing
    label: "Checkpoints : instantanés périodiques de l'état, déclenchés par des barrières dans le flux, écrits sur un stockage durable"
  - id: ddia-sp-atomic-commit
    label: "Transactions atomiques internes : sorties, changements d'état et avancement de l'offset validés ensemble ou pas du tout"
  - id: ddia-sp-idempotent-writes
    label: "Idempotence : stocker l'offset du message avec l'écriture pour détecter un rejeu ; suppose un rejeu dans le même ordre et un traitement déterministe"
  - id: ddia-sp-state-recovery
    label: "Reconstruire l'état après panne : instantanés durables, changelog compacté de l'état, ou rejeu de l'entrée"
glossary:
  - term: "exactly-once / effectively-once"
    definition: "Garantie que l'effet visible est celui d'un traitement unique de chaque enregistrement, même si certains ont été retraités après une panne."
  - term: "micro-batching"
    definition: "Découpage d'un flux en petits lots (environ une seconde) traités chacun comme un mini-job batch (Spark Streaming)."
  - term: "barrière (barrier)"
    definition: "Marqueur injecté dans le flux qui déclenche, chez chaque opérateur qu'il traverse, l'écriture d'un checkpoint cohérent (Flink)."
  - term: "opération idempotente"
    definition: "Opération qui a le même effet qu'on l'exécute une fois ou plusieurs fois."
  - term: "fencing"
    definition: "Mécanisme qui empêche un nœud qu'on croit mort, mais qui ne l'est pas, de continuer à écrire (ch. 10)."
visuals: []
labs: [ddia-ch15-l05-lab-recovery-design]
xp: 40
---

## Pourquoi c'est important

Ton job compte les paiements par marchand. Il plante après avoir traité 1 000 messages, mais avant d'avoir enregistré qu'il les avait traités. Au redémarrage, il les relit. Si chaque message fait `total += montant`, ces 1 000 paiements sont comptés **deux fois**, et un marchand est payé en double. Un job de flux tourne des mois : les pannes sont **certaines**. Toute la question est de faire en sorte qu'elles ne se **voient pas** dans le résultat.

## Ce que le batch avait de facile

Au ch. 13, la tolérance aux pannes d'un job batch est simple : si une tâche échoue, on la **relance** sur le même fichier d'entrée immuable, et l'on jette la sortie partielle de la tentative ratée. La sortie finale est la même que si rien n'avait échoué : chaque enregistrement **semble** traité une seule fois, même si certains l'ont été plusieurs fois. C'est la sémantique **exactly-once**, qu'on gagnerait à appeler **effectively-once**.

En flux, impossible d'attendre la fin de la tâche pour rendre sa sortie visible : la tâche ne finit jamais. Il faut d'autres mécanismes.

## Micro-batching et checkpoints

**Micro-batching** : on découpe le flux en **petits lots**, d'environ une seconde, et l'on traite chaque lot comme un mini-job batch. C'est l'approche de **Spark Streaming**. La taille du lot est un compromis :

- des lots **plus petits** augmentent le surcoût d'ordonnancement et de coordination ;
- des lots **plus gros** retardent les résultats.

Le micro-batching impose une **fenêtre tumbling implicite** égale à la taille du lot, et fenêtrée en **temps de traitement**, pas en temps de l'événement (leçon 2). Un job qui a besoin de fenêtres plus longues doit **reporter explicitement son état** d'un micro-lot au suivant.

**Checkpoints** : **Apache Flink** génère périodiquement des **instantanés** de l'état de chaque opérateur et les écrit sur un **stockage durable** (HDFS, stockage objet). Si un opérateur plante, il **redémarre depuis son dernier checkpoint** et rejette toute sortie produite depuis. Les checkpoints sont déclenchés par des **barrières** injectées dans le flux : comme les frontières des micro-lots, mais **sans imposer de taille de fenêtre**.

Exemple chiffré : un checkpoint toutes les **30 secondes**, un flux de **20 000 messages/s**. Une panne juste avant un checkpoint oblige à rejouer jusqu'à 30 × 20 000 = **600 000 messages**. Raccourcir l'intervalle réduit ce rejeu, mais multiplie les écritures d'état.

### La limite : les effets de bord

Dans le **périmètre du framework**, micro-batching et checkpoints donnent l'exactly-once. Mais dès qu'une sortie **quitte** le framework (écriture dans une base, message vers un broker externe, **e-mail** envoyé), le framework ne peut plus la **rejeter**. Redémarrer une tâche ratée refait l'effet de bord : le client reçoit son e-mail deux fois. Les checkpoints seuls ne suffisent donc pas.

## Les transactions atomiques, revisitées

Pour qu'une panne ne laisse pas de trace, il faut que **tous** les effets d'un traitement aient lieu **si et seulement si** le traitement réussit :

- les messages envoyés aux opérateurs en aval ou à un système externe ;
- les écritures en base ;
- les changements de l'état de l'opérateur ;
- l'**acquittement** du message d'entrée, c'est-à-dire l'avancement de l'**offset** du consommateur dans un broker de type log.

Ces effets doivent arriver **atomiquement** ou pas du tout, sans se désynchroniser. On reconnaît les transactions distribuées et le commit à deux phases (ch. 12). Google Cloud Dataflow et VoltDB l'implémentent, et Kafka en a ajouté la prise en charge depuis (transactions de producteur, `read_committed`). La différence avec XA : ces implémentations gardent la transaction **interne**, en gérant à la fois les changements d'état et la messagerie **à l'intérieur** du framework, entre systèmes hétérogènes qu'il ne fait pas parler un protocole commun. Le surcoût du protocole est **amorti** en traitant plusieurs messages d'entrée dans une même transaction.

## L'idempotence

Autre approche : le but est de pouvoir **jeter la sortie partielle** d'une tâche ratée et la **rejouer sans danger**. Il suffit pour cela que l'opération soit **idempotente** : l'exécuter deux fois a le même effet que l'exécuter une fois.

- Écrire `cle = valeur` dans un magasin clé-valeur est idempotent : réécrire la même valeur ne change rien.
- `total += 30` ne l'est pas : le rejouer ajoute 30 de plus.

Une opération non idempotente peut souvent le **devenir** avec un peu de **métadonnées**. En consommant Kafka, chaque message porte un **offset** persistant et monotone. Quand tu écris une valeur dans une base externe, écris **avec elle** l'offset du message qui l'a produite. Au rejeu, tu compares : si l'offset stocké est déjà supérieur ou égal, la mise à jour a été appliquée, tu l'ignores. Trident, au-dessus de Storm, gère son état de cette façon.

Exemple : la ligne du marchand 42 contient `total = 1 230, offset = 8 812`. Après une reprise, le message 8 811 (+30) est relu : 8 811 ≤ 8 812, on l'ignore. Le message 8 813 (+50) arrive : on écrit `total = 1 280, offset = 8 813`, **dans la même écriture**.

Cette idempotence repose sur des **hypothèses** :

- un rejeu doit relire **les mêmes messages dans le même ordre** : c'est ce que garantit un broker de type log, pas une file AMQP qui redistribue ;
- le traitement doit être **déterministe** ;
- **aucun autre nœud** ne doit modifier la même valeur en parallèle.

Lors d'une bascule d'un nœud vers un autre, il peut falloir du **fencing** (ch. 10) pour empêcher un nœud qu'on croyait mort, mais qui ne l'est pas, de continuer d'écrire. L'idempotence est une façon efficace d'obtenir l'exactly-once **avec un faible surcoût**.

## Reconstruire l'état après une panne

Un opérateur avec état (agrégats fenêtrés, compteurs, moyennes, histogrammes, tables et index des jointures) doit **retrouver** cet état après une panne. Plusieurs options :

1. **Garder l'état dans une base distante** et la répliquer. Mais interroger une base distante pour chaque message est **lent** (leçon 4).
2. **Garder l'état en local** et le **répliquer périodiquement** :
   - **Flink** prend des instantanés de l'état des opérateurs sur un stockage durable comme HDFS ;
   - **Samza** et **Kafka Streams** envoient chaque changement d'état sur un **sujet Kafka dédié, compacté** : exactement la CDC du chapitre précédent, appliquée à l'état de l'opérateur ;
   - **VoltDB** traite chaque message d'entrée **en double** sur plusieurs nœuds.
3. **Reconstruire depuis l'entrée** : pour une fenêtre courte, rejouer les quelques minutes d'événements qui la composent suffit. Si l'état est une copie locale d'une base tenue par CDC, on la reconstruit depuis le changelog compacté.

Le bon choix dépend de l'infrastructure : dans certains systèmes, le réseau a une latence **plus faible** que l'accès disque, et sa bande passante est comparable à celle du disque. Il n'y a pas de compromis universel ; les mérites de l'état local ou distant changent avec les technologies.

## Bilan du chapitre

Ce chapitre a complété le précédent : transporter des événements (logs, CDC, event sourcing) puis les **traiter**. Trois usages principaux (CEP, analytique, vues matérialisées), plus la recherche sur flux. Pour bien raisonner sur le temps : le **temps de l'événement**, des retardataires gérés explicitement, des horloges corrigées. Quatre types de fenêtres, trois sortes de jointures et leur piège temporel. Enfin, l'exactly-once effectif s'obtient par micro-batching ou checkpoints **et** par transactions atomiques ou écritures idempotentes, car aucun framework ne peut reprendre un e-mail déjà parti.

## Pièges fréquents

- **Croire que les checkpoints couvrent les effets de bord** : un e-mail ou un appel externe est refait au rejeu.
- **Incrémenter sans métadonnée** : `total += x` rejoué double le compte ; stocke l'offset avec la valeur.
- **Stocker l'offset dans une écriture séparée** : une panne entre les deux écritures recrée le problème.
- **Rendre idempotent avec une file qui redistribue dans le désordre** : la comparaison d'offset suppose un rejeu ordonné.
- **Oublier le fencing** lors d'une bascule : deux nœuds écrivent la même valeur.

## À retenir

- Exactly-once = le résultat est celui d'un traitement unique, même avec des retraitements.
- Micro-batching (Spark) et checkpoints par barrières (Flink) protègent l'état interne, pas les effets externes.
- Transactions atomiques internes : sorties, état et offset validés ensemble.
- Idempotence : écrire l'offset avec la valeur ; suppose un rejeu ordonné, déterministe, sans écrivain concurrent.
- État reconstruit par instantanés, changelog compacté de l'état, ou rejeu de l'entrée.
