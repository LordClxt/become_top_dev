---
id: ddia-ch14-l02
title: "Plusieurs consommateurs, accusés de réception et redistribution"
source: { chapter: 11, pages: "444-446" }
duration_min: 30
concepts:
  - id: ddia-consumer-load-balancing
    label: "Répartition de charge : chaque message va à un seul consommateur d'un groupe, pour paralléliser un traitement coûteux"
  - id: ddia-consumer-fan-out
    label: "Fan-out : chaque message va à tous les abonnés, comme plusieurs jobs qui lisent le même fichier d'entrée"
  - id: ddia-consumer-groups
    label: "Les deux se combinent : plusieurs groupes reçoivent chacun tout le flux, et se répartissent les messages à l'intérieur du groupe"
  - id: ddia-ack-redelivery
    label: "Le consommateur accuse réception quand il a fini ; sans accusé, le broker redistribue le message à un autre consommateur"
  - id: ddia-redelivery-reordering
    label: "Redistribution et répartition de charge réordonnent les messages ; c'est grave dès qu'ils ont des dépendances causales"
glossary:
  - term: "répartition de charge (load balancing)"
    definition: "Chaque message est livré à un seul des consommateurs ; ils se partagent le travail."
  - term: "fan-out"
    definition: "Chaque message est livré à tous les consommateurs abonnés, qui le traitent indépendamment."
  - term: "groupe de consommateurs"
    definition: "Ensemble de consommateurs qui se répartissent un même abonnement ; chaque groupe reçoit le flux complet."
  - term: "accusé de réception (acknowledgment, ack)"
    definition: "Message explicite du consommateur au broker : « j'ai fini de traiter ce message, tu peux l'effacer »."
  - term: "redistribution (redelivery)"
    definition: "Le broker renvoie un message non acquitté à un autre consommateur quand le premier a fermé sa connexion ou dépassé le délai."
  - term: "file de lettres mortes (dead letter queue)"
    definition: "File à part où l'on range un message qui échoue trop souvent, pour qu'il ne bloque pas les autres (au-delà du livre)."
visuals: []
labs: [ddia-ch14-l02-lab-groups-design]
xp: 40
---

## Pourquoi c'est important

Dès que plus d'un processus lit un même sujet, il faut décider : chacun reçoit-il **tout**, ou se **partagent**-ils le travail ? Et dès qu'un consommateur peut planter au milieu d'un message, il faut savoir si ce message est perdu, traité deux fois ou traité dans le désordre. Ces trois issues ont des conséquences métier très concrètes : un e-mail envoyé deux fois, un solde calculé avec un débit avant le crédit qui le précède. Cette leçon donne les mécanismes d'un broker classique (JMS, AMQP) et leurs effets de bord.

## Deux façons de servir plusieurs consommateurs

### La répartition de charge

Chaque message est livré à **un seul** consommateur. Les consommateurs se partagent le travail, et le broker peut confier chaque message à n'importe lequel. Utile quand traiter un message coûte cher : transcoder une vidéo de 2 minutes prend 40 secondes, alors avec 10 workers tu traites 10 vidéos en parallèle. En AMQP, plusieurs clients consomment la même file ; en JMS, on parle d'abonnement partagé.

### Le fan-out

Chaque message est livré à **tous** les consommateurs. Plusieurs équipes s'abonnent au même flux sans se gêner : la facturation, l'envoi d'e-mails et l'analytique reçoivent chacune chaque commande. C'est l'équivalent en flux de plusieurs jobs batch qui lisent le même fichier d'entrée (module « Traitement par lots »). En JMS, ce sont les abonnements à un sujet ; en AMQP, les liaisons (*bindings*) d'un *exchange*.

### Les combiner : les groupes de consommateurs

Les deux modes se combinent. Deux **groupes** s'abonnent au même sujet : chaque groupe reçoit **tous** les messages (fan-out entre groupes), mais à l'intérieur d'un groupe, chaque message ne va qu'à **un** membre (répartition dans le groupe). Exemple chiffré : un sujet `commandes` reçoit 600 commandes par seconde. Le groupe « facturation » a 3 workers ; chacun en voit environ 200 par seconde. Le groupe « e-mail » a 1 worker, qui les voit toutes les 600. Ajouter un quatrième worker de facturation ne change rien pour l'e-mail.

## Accusés de réception et redistribution

Un consommateur peut planter à tout moment : le broker lui a livré un message, et il ne l'a jamais traité, ou seulement à moitié. Pour ne pas perdre de messages, les brokers utilisent des **accusés de réception** : le client indique **explicitement** au broker qu'il a fini de traiter un message, et c'est seulement là que le broker l'efface de la file.

Si la connexion du client se ferme ou expire sans accusé, le broker suppose que le message n'a pas été traité et le **redistribue** à un autre consommateur. Attention au cas limite : le message a peut-être été **entièrement traité**, et c'est l'accusé qui s'est perdu en route (le réseau, encore). Le message sera alors traité **deux fois**. Pour l'éviter, il faudrait un protocole de commit atomique entre le broker et l'effet du traitement (on le verra avec le commit en deux phases dans le module « Consensus »). Le plus souvent, on rend plutôt le traitement idempotent : appliquer deux fois l'e-mail « commande 1337 confirmée » doit n'en envoyer qu'un, grâce à une clé de déduplication.

### Le réordonnancement

Combinée à la répartition de charge, la redistribution change **l'ordre** des messages. Prends cinq messages m1 à m5, publiés dans cet ordre, et deux consommateurs :

1. le consommateur 1 reçoit m1, le consommateur 2 reçoit m2 ; les deux acquittent ;
2. le consommateur 2 reçoit m3 et le consommateur 1 reçoit m4 ;
3. le consommateur 2 plante pendant m3 ; pendant ce temps, le consommateur 1 a fini m4 ;
4. le broker redistribue m3 au consommateur 1, qui le traite après m4, puis passe à m5.

Le consommateur 1 a traité m1, m4, m3, m5 : pas l'ordre d'envoi. C'est vrai même si JMS et AMQP **exigent** que le broker essaie de préserver l'ordre : l'ordre de livraison initial était bon, c'est la panne qui le casse.

Est-ce grave ? Si les messages sont **indépendants** (deux vidéos à transcoder), non. S'ils ont des **dépendances causales**, oui : « compte créé » traité après « dépôt de 50 € sur ce compte », et le dépôt échoue. On a vu dans le module « Réplication avec leader » la même anomalie entre réplicas (lectures préfixe-cohérentes). Pour garder l'ordre, une solution : une **file séparée par consommateur**, c'est-à-dire renoncer à la répartition de charge pour ces messages. La leçon suivante montre comment un log partitionné obtient l'ordre **par clé** sans renoncer au parallélisme.

## Aller plus loin : les messages empoisonnés

*(Au-delà du livre.)* Un message qui fait planter son consommateur à chaque fois (un JSON malformé, un cas non prévu) est redistribué sans fin et peut bloquer tout un groupe. Les brokers proposent un nombre maximum de redistributions, au-delà duquel le message part dans une **file de lettres mortes** (*dead letter queue*), qu'un humain examine. RabbitMQ le fait via un *dead-letter exchange*, Amazon SQS via une *redrive policy*. Mettre un message de côté change l'ordre lui aussi : c'est un choix conscient.

## Pièges fréquents

- **Confondre les deux modes** : mettre l'e-mail et la facturation dans le **même** groupe, c'est leur faire partager les commandes. La moitié des clients n'aurait pas d'e-mail, l'autre pas de facture.
- **Acquitter avant d'avoir fini** : si le consommateur acquitte à la réception puis plante, le message est perdu. On acquitte **après** l'effet.
- **Croire à « exactement une fois » parce qu'il y a des accusés** : un accusé perdu provoque un second traitement. Prévois l'idempotence.
- **Supposer l'ordre préservé** avec plusieurs consommateurs : une seule panne suffit à le casser.

## À retenir

- Répartition : un message, un consommateur, pour paralléliser. Fan-out : un message, tous les abonnés, pour découpler les équipes.
- Groupes de consommateurs : fan-out entre groupes, répartition dans chaque groupe.
- Le broker n'efface un message qu'après l'accusé ; sans accusé, il le redistribue, ce qui peut faire traiter deux fois.
- Redistribution + répartition = réordonnancement. Sans gravité pour des messages indépendants, dangereux pour des messages causalement liés.
