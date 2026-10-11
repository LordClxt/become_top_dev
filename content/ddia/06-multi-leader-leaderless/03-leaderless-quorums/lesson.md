---
id: ddia-ch06-l03
title: "Sans leader : quorums, read repair et anti-entropie"
source: { chapter: 5, pages: "177-181" }
duration_min: 35
concepts:
  - id: ddia-leaderless-replication
    label: "Réplication sans leader (façon Dynamo) : le client, ou un coordinateur, écrit et lit sur plusieurs réplicas en parallèle"
  - id: ddia-read-repair
    label: "Read repair : le lecteur réécrit la valeur récente sur les réplicas qui lui ont renvoyé une valeur périmée"
  - id: ddia-anti-entropy
    label: "Anti-entropie : un processus de fond compare les réplicas et copie ce qui manque, sans ordre particulier"
  - id: ddia-quorum-condition
    label: "Quorum : avec n réplicas, w accusés par écriture et r réponses par lecture, w + r > n garantit un réplica à jour parmi ceux lus"
  - id: ddia-quorum-tuning
    label: "Régler n, w, r : tolérance aux pannes (n − w en écriture, n − r en lecture) contre latence et coût"
glossary:
  - term: "Dynamo-style"
    definition: "Famille de bases sans leader inspirées du système Dynamo interne d'Amazon : Riak, Cassandra, Voldemort."
  - term: "coordinateur"
    definition: "Nœud qui reçoit la requête d'un client et l'envoie aux réplicas ; contrairement à un leader, il n'impose aucun ordre aux écritures."
  - term: "read repair"
    definition: "Réparation au fil des lectures : un réplica périmé détecté pendant une lecture reçoit la valeur récente."
  - term: "anti-entropie"
    definition: "Processus de fond qui cherche les différences entre réplicas et copie les données manquantes."
  - term: "lecture/écriture quorum"
    definition: "Lecture qui attend r réponses, écriture qui attend w accusés, avec w + r > n."
visuals: []
labs: [ddia-ch06-l03-lab-quorum-design]
xp: 40
---

## Pourquoi c'est important

Les deux familles vues jusqu'ici ont un point commun : un leader (ou quelques leaders) décide de l'ordre des écritures. Les bases **sans leader** abandonnent cette idée : **n'importe quel réplica** accepte les écritures. Cassandra, Riak et Voldemort fonctionnent ainsi, et leurs paramètres `n`, `w`, `r` se retrouvent dans des fichiers de configuration en production. Mal réglés, ils donnent des lectures périmées ou un cluster qui refuse les écritures à la première panne. Cette leçon donne le raisonnement pour les choisir.

## Le principe

Les premiers systèmes répliqués étaient souvent sans leader ; l'idée a été oubliée pendant la domination des bases relationnelles, puis remise au goût du jour par **Dynamo**, le système interne d'Amazon (à ne pas confondre avec le service DynamoDB). Riak, Cassandra et Voldemort s'en sont inspirés : on parle de bases **façon Dynamo**.

Selon les implémentations :

- le **client** envoie lui-même son écriture à plusieurs réplicas ;
- ou un **coordinateur** le fait pour lui. Différence essentielle avec un leader : le coordinateur **n'impose aucun ordre** aux écritures. On verra en leçon 5 les conséquences de ce choix.

Pas de leader, donc **pas de basculement** : si un réplica tombe, on continue sans lui.

## Écrire quand un nœud est en panne

Trois réplicas, A, B et C. C redémarre pour une mise à jour système. Un client écrit `prix = 42` : il envoie l'écriture aux **trois en parallèle**. A et B acceptent, C ne répond pas. Le client décide que **deux accusés sur trois suffisent** : l'écriture est un succès, on ignore le réplica manquant.

C revient. Il contient toujours l'ancien `prix = 40`. Un client qui lirait **uniquement C** obtiendrait une valeur périmée. C'est pourquoi, dans une base sans leader, **la lecture aussi part vers plusieurs réplicas** en parallèle. Le client reçoit 42 de A, 42 de B, 40 de C ; des **numéros de version** lui permettent de savoir laquelle est la plus récente.

## Rattraper les réplicas en retard

Comment C finit-il par recevoir l'écriture manquée ? Deux mécanismes, souvent combinés.

### Le read repair

Pendant la lecture précédente, le client voit que C a renvoyé une version périmée. Il **réécrit 42 sur C**. Simple et efficace pour les valeurs **souvent lues** : chacune est réparée à la première lecture.

### L'anti-entropie

Un **processus de fond** compare en permanence les données des réplicas et copie ce qui manque de l'un à l'autre. Différence avec le journal de réplication d'un leader : il ne copie **pas les écritures dans un ordre particulier**, et le délai avant la copie peut être important.

Les deux sont complémentaires. Sans anti-entropie (Voldemort, à l'époque du livre, n'en avait pas), une valeur **rarement lue** n'est jamais réparée et peut manquer sur certains réplicas : sa durabilité est réduite. Exemple : un service stocke 10 millions de factures, dont 95 % ne sont plus jamais relues après le premier mois. Sans anti-entropie, une facture écrite pendant la panne de C reste à deux copies au lieu de trois, pour toujours.

## Les quorums : w + r > n

Généralisons. Une valeur est stockée sur **n** réplicas.

- Une écriture est réussie quand **w** réplicas l'ont confirmée.
- Une lecture interroge **r** réplicas (ou attend r réponses).

Si **w + r > n**, l'ensemble des réplicas écrits et l'ensemble des réplicas lus **se chevauchent** : au moins un des r réplicas lus a reçu la dernière écriture réussie. On parle de **lectures et écritures quorum**.

Avec n = 3, w = 2, r = 2 : 2 + 2 = 4 > 3. Tu as écrit sur A et B ; tu lis deux réplicas quelconques, au moins un est A ou B. Avec w = 1 et r = 1, rien ne garantit le chevauchement.

En pratique, l'écriture et la lecture sont **toujours envoyées aux n réplicas** ; w et r disent seulement **combien de réponses attendre**. Le cluster peut avoir bien plus de n nœuds : chaque valeur n'est stockée que sur n d'entre eux (le module sur le partitionnement dira lesquels).

### Ce que le quorum tolère

| Réglage | Chevauchement | Pannes tolérées en écriture | Pannes tolérées en lecture |
|---|---|---|---|
| n = 3, w = 2, r = 2 | 2 + 2 > 3 ✓ | 1 | 1 |
| n = 5, w = 3, r = 3 | 3 + 3 > 5 ✓ | 2 | 2 |
| n = 3, w = 3, r = 1 | 3 + 1 > 3 ✓ | 0 | 2 |
| n = 3, w = 1, r = 1 | 1 + 1 ≤ 3 ✗ | 2 | 2 |

Règle générale : une écriture survit à **n − w** réplicas indisponibles, une lecture à **n − r**. En dessous de w ou de r réplicas joignables, l'opération renvoie une **erreur**. « Indisponible » couvre beaucoup de cas : nœud arrêté, disque plein, coupure réseau ; peu importe la raison, seul compte le nombre de réponses.

### Choisir

- Le choix classique : **n impair** (3 ou 5) et **w = r = (n + 1) / 2** arrondi au supérieur.
- Charge très majoritairement en lecture : **w = n, r = 1**. Les lectures sont rapides (une seule réponse à attendre), mais **un seul réplica en panne bloque toutes les écritures**.
- Plus w et r sont petits, plus la latence est faible (on attend moins de réponses, et la plus lente est souvent ignorée) ; plus ils sont grands, plus on a de chances de lire la valeur récente.

Petit calcul de latence : chaque réplica répond en 5 ms, sauf un sur trois qui est lent à 80 ms. Avec r = 2 sur n = 3, tu attends les **deux plus rapides** : 5 ms. Avec r = 3, tu attends le plus lent : 80 ms.

## Rappel

Au module précédent, une lecture sur un suiveur asynchrone pouvait être périmée, et l'on ajoutait des garanties comme « relire ses propres écritures ». Ici, le quorum joue un rôle comparable en garantissant le chevauchement… avec des limites que la leçon suivante détaille.

## Pièges fréquents

- **Lire un seul réplica** dans une base sans leader « parce que c'est plus rapide » : r = 1 avec w < n ne garantit rien.
- **Compter sur le read repair seul** : les données rarement lues ne sont jamais réparées.
- **Choisir w = n pour la durabilité** sans voir qu'une seule panne bloque toutes les écritures.
- **Confondre n et la taille du cluster** : n est le nombre de copies d'une valeur, pas le nombre de nœuds.

## À retenir

- Sans leader, n'importe quel réplica accepte les écritures ; client ou coordinateur écrit et lit **plusieurs réplicas en parallèle**.
- Les réplicas en retard se rattrapent par **read repair** (valeurs lues) et **anti-entropie** (tout le reste, sans ordre).
- **w + r > n** garantit qu'un réplica lu au moins a la dernière écriture réussie.
- Une écriture tolère **n − w** pannes, une lecture **n − r** ; réglage courant : n = 3 ou 5, w = r = majorité.
