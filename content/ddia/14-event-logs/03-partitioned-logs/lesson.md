---
id: ddia-ch14-l03
title: "Les logs partitionnés : offsets, rétention et rejeu"
source: { chapter: 11, pages: "446-451" }
duration_min: 40
concepts:
  - id: ddia-log-based-broker
    label: "Un broker à base de log ajoute les messages à un log sur disque ; lire ne supprime rien, et l'on peut relire"
  - id: ddia-log-partition-order
    label: "Le log est partitionné ; chaque message reçoit un offset croissant dans sa partition, l'ordre n'est garanti qu'à l'intérieur d'une partition"
  - id: ddia-partition-assignment
    label: "La répartition se fait par partition entière : au plus autant de consommateurs utiles que de partitions, et un message lent bloque sa partition"
  - id: ddia-consumer-offset-commit
    label: "Le broker retient seulement l'offset de chaque groupe par partition ; après une panne, on reprend au dernier offset validé, quitte à retraiter"
  - id: ddia-log-retention-ring-buffer
    label: "Le log est découpé en segments supprimés avec l'âge : c'est un grand tampon circulaire, dont un consommateur trop lent peut sortir"
  - id: ddia-consumer-lag-isolation
    label: "Le retard d'un consommateur se surveille ; un consommateur lent ou arrêté ne gêne ni le broker ni les autres"
  - id: ddia-log-replay
    label: "Lire un log ne modifie rien : on peut repartir d'un ancien offset pour retraiter, comme on relance un job batch"
glossary:
  - term: "broker à base de log (log-based message broker)"
    definition: "Broker qui stocke les messages dans un log en ajout seul sur disque, que les consommateurs lisent séquentiellement (Kafka, Kinesis Streams, DistributedLog)."
  - term: "partition"
    definition: "Un des logs indépendants qui composent un sujet ; chaque partition peut vivre sur une machine différente."
  - term: "offset"
    definition: "Numéro de séquence croissant attribué par le broker à chaque message dans sa partition."
  - term: "offset validé (committed offset)"
    definition: "Position enregistrée d'un groupe de consommateurs dans une partition : tous les messages avant elle sont considérés comme traités."
  - term: "retard du consommateur (consumer lag)"
    definition: "Distance, en messages ou en temps, entre la fin du log et la position du consommateur."
  - term: "tampon circulaire (ring buffer)"
    definition: "Tampon de taille fixe qui écrase les données les plus anciennes quand il est plein."
  - term: "blocage en tête de file (head-of-line blocking)"
    definition: "Un message lent retient tous ceux qui le suivent dans la même partition."
visuals: []
labs: [ddia-ch14-l03-lab-offsets-design]
xp: 40
---

## Pourquoi c'est important

Un broker classique est **transitoire** : une fois le message acquitté, il est effacé. Tu ne peux pas relancer un consommateur pour qu'il retraite hier, et un nouveau consommateur ne voit que ce qui arrive après son inscription. Comparé au traitement par lots, c'est un recul : là, l'entrée est en lecture seule, on relance un job sans risque et on compare les sorties. Pourquoi ne pas avoir les deux, la faible latence d'un broker **et** la permanence d'un fichier ? C'est l'idée des **brokers à base de log**, dont Apache Kafka est l'exemple le plus connu. Si tu travailles un jour avec des événements à grande échelle, c'est ce modèle que tu rencontreras.

## Un log comme broker

On connaît le log depuis le module « Stockage et index » : une suite d'enregistrements en **ajout seul** sur disque. Le même objet fait un broker :

- le producteur **ajoute** chaque message à la fin du log ;
- le consommateur **lit séquentiellement** ; arrivé au bout, il attend d'être notifié d'un nouveau message (comme `tail -f`).

Pour dépasser le débit d'un disque, le log est **partitionné** (module « Partitionnement ») : chaque partition est un log indépendant, sur sa propre machine, et un **sujet** est un ensemble de partitions qui portent le même type de messages. Dans chaque partition, le broker attribue à chaque message un numéro de séquence croissant, l'**offset**. Une partition est donc **totalement ordonnée** ; entre partitions, il n'y a **aucun ordre** garanti.

Kafka, Amazon Kinesis Streams et DistributedLog (Twitter) fonctionnent ainsi ; Google Cloud Pub/Sub a une architecture voisine mais expose une API à la JMS. Grâce au partitionnement, ces systèmes écoulent des millions de messages par seconde ; grâce à la réplication des partitions, ils tolèrent les pannes.

Conséquence pratique : si l'ordre compte pour les événements d'un même utilisateur, on choisit la partition **par clé** (l'identifiant de l'utilisateur, hashé). Tous ses événements tombent dans la même partition, donc dans l'ordre. Ceux de deux utilisateurs différents n'ont pas d'ordre l'un par rapport à l'autre, et c'est très bien ainsi.

## Logs contre messagerie classique

Le **fan-out** est gratuit : lire un message ne le supprime pas, donc plusieurs consommateurs lisent le même log indépendamment.

La **répartition de charge** se fait à la granularité de la **partition** : chaque membre d'un groupe se voit attribuer des partitions entières et lit **tous** les messages de celles-ci, dans l'ordre, sur un seul thread. Deux limites en découlent :

- le nombre de consommateurs utiles d'un groupe est **au plus le nombre de partitions** : avec 12 partitions, un treizième consommateur reste inactif ;
- un message **lent** retient tous les suivants de sa partition (*head-of-line blocking*).

D'où une règle de choix. Messages **coûteux** à traiter, à paralléliser message par message, ordre sans importance : broker classique JMS/AMQP. **Débit élevé**, messages rapides à traiter, **ordre important** : log partitionné.

## Les offsets des consommateurs

Lire séquentiellement simplifie énormément le suivi : tout message dont l'offset est inférieur à la position courante d'un consommateur a été traité, tous ceux au-delà non. Le broker n'a donc **pas** à suivre des accusés message par message ; il lui suffit d'enregistrer **périodiquement** l'offset de chaque groupe dans chaque partition. Moins de travail de comptabilité, et des possibilités de lots et de pipeline qui expliquent une partie du débit.

C'est exactement la position dans le log de réplication d'un suiveur (module « Réplication avec leader ») : le broker joue le leader, le consommateur le suiveur.

Si un consommateur tombe, ses partitions sont confiées à un autre membre du groupe, qui reprend au **dernier offset validé**. Si le défunt avait traité des messages après ce point sans avoir eu le temps de valider, ils sont **traités une seconde fois**. Exemple : un consommateur valide tous les 1 000 messages ; la dernière validation dit 4 000 ; il traite jusqu'à 4 499 puis plante. Son remplaçant repart de 4 000 et refait 500 messages. On en reparlera dans le module « Traitement de flux » (sémantique « exactement une fois »).

## L'espace disque : un tampon circulaire

On ne peut pas ajouter au log indéfiniment. Il est découpé en **segments**, et les plus anciens sont supprimés ou déplacés vers une archive. Un consommateur si lent qu'il pointe vers un segment effacé **perd** des messages. Le log est en fait un **tampon de taille bornée** qui jette les plus vieux messages quand il est plein : un tampon **circulaire**.

Mais ce tampon est immense. L'ordre de grandeur donné par le livre : un disque de 6 To écrit séquentiellement à 150 Mo/s se remplit en 6 × 10¹² / 150 × 10⁶ = 40 000 s, environ **11 heures** au débit maximal. En pratique, on n'écrit pas en continu à pleine vitesse, donc on garde **des jours, voire des semaines** de messages. Et le débit d'un log reste **constant** quelle que soit la rétention, puisque tout message est de toute façon écrit sur disque, alors qu'un broker en mémoire ralentit quand ses files débordent sur disque.

## Quand un consommateur ne suit pas

Des trois options de la leçon 1 (perdre, tamponner, freiner), le log choisit le **tampon**, de grande taille fixe. Un consommateur qui prend tant de retard que sa position sort de la rétention perd des messages ; on **surveille** donc son retard (*consumer lag*) et l'on alerte bien avant. Avec plusieurs jours de tampon, un humain a le temps de réparer.

Surtout, le retard n'affecte **que ce consommateur**. Les autres continuent normalement. C'est précieux en exploitation : tu peux brancher un consommateur expérimental sur un log de production pour développer, tester ou déboguer, sans risque pour le service. Un consommateur arrêté ne coûte rien, sauf son offset enregistré. Dans un broker classique, au contraire, la file d'un consommateur disparu continue d'accumuler des messages qui ralentissent le broker, jusqu'à ce qu'on la supprime.

## Rejouer d'anciens messages

Dans un broker classique, traiter et acquitter est **destructif**. Dans un log, consommer est une **lecture seule** : seul l'offset avance, et il est sous le contrôle du consommateur. On peut donc lancer une copie d'un consommateur avec les offsets **d'hier** et écrire sa sortie ailleurs pour **retraiter la dernière journée**, autant de fois qu'on veut, avec un code différent.

C'est le même principe que le traitement par lots : les données dérivées sont séparées de l'entrée par un processus répétable. On peut expérimenter, et l'on peut **réparer** : un bug a produit de mauvaises données pendant 3 heures ? On corrige le code, on repart de l'offset d'avant le bug, on reconstruit la sortie.

## Pièges fréquents

- **Supposer un ordre global** : l'ordre n'existe qu'à l'intérieur d'une partition. Choisis la clé de partition pour que les événements qui doivent rester ordonnés tombent ensemble.
- **Ajouter des consommateurs au-delà du nombre de partitions** : ils restent inactifs. Le parallélisme se planifie en partitions, à la création du sujet.
- **Valider l'offset avant d'avoir traité** : en cas de panne, les messages entre l'offset validé et le vrai point de traitement sont perdus pour ce groupe. On valide après.
- **Ne pas surveiller le retard** : un consommateur qui sort de la rétention perd des messages en silence.
- **Mettre un traitement de 30 s par message dans un log** : il bloque toute sa partition. Une file classique conviendrait mieux.

## À retenir

- Un broker à base de log ajoute à un log partitionné ; lire n'efface rien.
- Ordre total par partition, aucun ordre entre partitions ; une clé de partition garde ensemble ce qui doit rester ordonné.
- Un groupe se partage les partitions entières ; au plus autant de consommateurs utiles que de partitions.
- Le broker ne retient qu'un offset par groupe et par partition ; reprendre après une panne peut retraiter des messages.
- La rétention fait du log un tampon circulaire de plusieurs jours ; on surveille le retard des consommateurs.
- On rejoue un log depuis un ancien offset pour expérimenter ou réparer.
