---
id: ddia-ch05-l01
title: Leader, followers et réplication synchrone ou non
source:
  chapter: 5
  pages: 151-155
duration_min: 35
concepts:
- id: ddia-replication-purpose
  label: On réplique pour rapprocher les données, rester disponible et lire davantage ; la difficulté est de propager les changements
- id: ddia-leader-follower
  label: Un leader reçoit les écritures et les envoie dans l'ordre à ses followers, qui servent les lectures
- id: ddia-sync-async
  label: 'Synchrone : le client attend la confirmation du follower ; asynchrone : le leader n''attend pas'
- id: ddia-semi-sync
  label: 'En pratique : un follower synchrone, les autres asynchrones (semi-synchrone)'
- id: ddia-async-durability
  label: Totalement asynchrone, une écriture confirmée peut être perdue si le leader meurt avant de l'avoir répliquée
glossary:
- term: réplica
  definition: Un nœud qui garde une copie de la base.
- term: leader (primary, master)
  definition: Le réplica désigné pour accepter les écritures.
- term: follower (secondary, read replica)
  definition: Un réplica qui applique le log du leader et ne sert que des lectures.
- term: log de réplication (change stream)
  definition: La suite ordonnée des changements que le leader envoie aux followers.
- term: semi-synchrone
  definition: Exactement un follower est synchrone ; si lui tombe, un autre prend le relais.
visuals: []
labs:
- ddia-ch05-l01-lab-sync-async-design
- ddia-ch05-l01-lab-leader-based-design
extra: false
xp: 35
---

## Pourquoi c'est important

Dès qu'une base sert vraiment du monde, une seule machine ne suffit plus : elle peut tomber, elle est loin de certains utilisateurs, et elle ne peut pas répondre à toutes les lectures. **Répliquer**, c'est garder une copie des mêmes données sur plusieurs machines reliées par un réseau. Trois raisons le justifient :

- **la latence** : placer des copies près des utilisateurs ;
- **la disponibilité** : continuer à fonctionner quand une partie du système est en panne ;
- **le débit en lecture** : répartir les lectures sur plusieurs machines.

Si les données ne changeaient jamais, répliquer serait trivial : on copie une fois. **Toute la difficulté vient des changements.** Ce chapitre étudie trois algorithmes (un leader, plusieurs leaders, aucun leader). Ce module couvre le premier, le plus répandu.

## Un leader, des followers

Chaque nœud qui stocke une copie est un **réplica**. Comment garantir que chaque écriture se retrouve sur tous les réplicas ? La solution la plus courante est la **réplication par leader** (aussi appelée *active/passive* ou *master-slave*) :

1. un réplica est désigné **leader**. Tout client qui veut écrire doit s'adresser à lui : il écrit d'abord dans son stockage local ;
2. les autres réplicas sont des **followers**. Chaque fois que le leader écrit, il envoie le changement à tous ses followers dans un **log de réplication**. Chaque follower l'applique **dans le même ordre** que sur le leader ;
3. pour lire, un client peut interroger le leader **ou n'importe quel follower**. Pour lui, les followers sont en lecture seule.

C'est une fonction native de PostgreSQL, MySQL, Oracle Data Guard, SQL Server, mais aussi de MongoDB, et même de brokers comme Kafka ou RabbitMQ. Le point à retenir : **un seul nœud décide de l'ordre des écritures**. C'est ce qui rend ce modèle simple à raisonner.


## Synchrone ou asynchrone ?

Quand le leader répond « c'est écrit » au client, a-t-il attendu les followers ? Deux réponses :

- **synchrone** : le leader attend que le follower confirme avoir reçu l'écriture avant de répondre au client (et avant de la rendre visible aux autres). Avantage : le follower a une copie **à jour**, donc si le leader meurt, la donnée existe encore. Inconvénient : si ce follower ne répond plus (panne, réseau), **l'écriture ne peut pas aboutir** : le leader doit bloquer toutes les écritures jusqu'à son retour ;
- **asynchrone** : le leader envoie le message et n'attend pas. Il continue de traiter des écritures même si tous ses followers ont du retard.

Entre l'envoi et l'application sur un follower asynchrone, il y a toujours un délai. En fonctionnement normal il est inférieur à la seconde, mais **rien ne le borne** : un follower qui se remet d'une panne, un système proche de sa capacité maximale, un problème réseau peuvent le porter à plusieurs minutes.

### Pourquoi on ne rend pas tout synchrone

Rendre **tous** les followers synchrones serait impraticable : la moindre panne d'un nœud bloquerait tout le système, et plus il y a de nœuds, plus il est probable que l'un soit en panne. En pratique, activer la réplication synchrone signifie qu'**un seul** follower est synchrone et les autres asynchrones. S'il devient lent ou indisponible, un follower asynchrone est promu synchrone. On garantit ainsi une copie à jour sur **au moins deux nœuds** : c'est la configuration **semi-synchrone**.

### Le prix du tout-asynchrone

Beaucoup de systèmes sont configurés en asynchrone complet. Si le leader tombe sans retour possible, **toute écriture pas encore répliquée est perdue**, même si elle a été confirmée au client : la durabilité n'est pas garantie. C'est un mauvais compromis en apparence, mais il est très utilisé, surtout avec de nombreux followers ou des followers répartis géographiquement, parce que le leader reste rapide et disponible.

> **Au-delà du livre.** Le choix est rarement binaire : PostgreSQL permet de dire « au moins un parmi trois followers doit confirmer » (`synchronous_standby_names`), MySQL a la semi-synchronisation. L'équipe d'exploitation règle ainsi un curseur entre latence et durabilité, base par base.

### La réplication en chaîne

Les chercheurs ont voulu éviter la perte de données sans sacrifier les performances. La **réplication en chaîne** (*chain replication*) est une variante synchrone où les nœuds forment une chaîne : l'écriture entre par la tête et la confirmation sort de la queue. Elle est utilisée par exemple dans Microsoft Azure Storage. Il existe aussi un lien profond entre cohérence de la réplication et **consensus** (faire s'accorder plusieurs nœuds sur une valeur), qu'on étudiera au module 12.

## Pièges fréquents

- **Croire qu'un follower est une sauvegarde.** Une suppression ou une corruption est répliquée aussi, fidèlement.
- **Tout mettre en synchrone « pour être sûr ».** Chaque follower synchrone ajoute un point de panne pour les écritures.
- **Oublier que « asynchrone » n'a pas de borne.** Tu dois pouvoir répondre à : « que voit l'utilisateur si le retard monte à dix minutes ? ».
- **Lire sur un follower sans le dire.** Deux requêtes identiques, l'une sur le leader, l'autre sur un follower, peuvent donner deux résultats différents.

## À retenir

- Un leader ordonne et propage les écritures ; les followers appliquent le log dans le même ordre et servent des lectures.
- Synchrone = copie à jour mais écriture bloquée si le follower tombe ; asynchrone = rapide et disponible mais durabilité affaiblie.
- La configuration courante est semi-synchrone : un follower synchrone, les autres asynchrones.
- Avec l'asynchrone complet, une écriture confirmée peut disparaître si le leader meurt.
