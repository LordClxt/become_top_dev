---
id: ddia-ch06-l04
title: 'Sans leader : écrire, lire et réparer avec des quorums'
source:
  chapter: 5
  pages: 177-181
duration_min: 40
concepts:
- id: ddia-leaderless
  label: 'Sans leader (Dynamo) : le client écrit sur plusieurs réplicas, aucun n''impose d''ordre, le failover n''existe pas'
- id: ddia-read-repair
  label: 'Réparation à la lecture : le client voit une version périmée parmi les réponses et la réécrit'
- id: ddia-anti-entropy
  label: 'Anti-entropie : processus de fond qui compare les réplicas et copie ce qui manque, sans ordre'
- id: ddia-quorum
  label: 'Quorum : n réplicas, w confirmations en écriture, r réponses en lecture ; w + r > n garantit le recoupement'
- id: ddia-quorum-tolerance
  label: n=3, w=2, r=2 tolère une panne ; n=5, w=3, r=3 en tolère deux ; w=n, r=1 optimise la lecture
glossary:
- term: Dynamo-style
  definition: 'Famille de bases sans leader inspirées du système Dynamo d''Amazon : Riak, Cassandra, Voldemort.'
- term: quorum
  definition: Nombre minimal de votes pour valider une opération ; ici w (écriture) et r (lecture) parmi n réplicas.
- term: quorum strict
  definition: Quorum où w + r > n et où les écritures vont bien aux n nœuds désignés (par opposition au quorum relâché).
- term: read repair
  definition: Le client qui lit sur plusieurs nœuds réécrit la valeur récente sur ceux qui ont une valeur périmée.
visuals: []
labs:
- ddia-ch06-l04-lab-quorum-design
- ddia-ch06-l04-lab-leaderless-design
extra: false
xp: 40
---

## Pourquoi c'est important

Dans le mono-leader et le multi-leader, un client envoie une écriture à un nœud et le système la copie ensuite aux autres. Un leader détermine l'ordre. Certaines bases ont une approche différente : **elles abandonnent la notion de leader** et laissent n'importe quel réplica accepter directement les écritures. C'était l'une des plus anciennes formes de réplication, un peu oubliée à l'ère des bases relationnelles, puis revenue à la mode quand Amazon l'a utilisée pour son système **Dynamo** (à ne pas confondre avec le service DynamoDB, qui a une architecture complètement différente, basée sur un leader). Riak, Cassandra et Voldemort s'en inspirent : on parle de bases **Dynamo-style**.

Selon les implémentations, le client envoie directement ses écritures à plusieurs réplicas, ou un **nœud coordinateur** le fait pour lui. Mais ce coordinateur **n'impose aucun ordre** aux écritures, et cette différence a des conséquences profondes.

## Écrire quand un nœud est en panne

Trois réplicas, dont un indisponible (redémarrage pour une mise à jour). Avec un leader, il faudrait peut-être un failover. Sans leader, **le failover n'existe pas**. Le client envoie l'écriture aux trois réplicas **en parallèle** ; les deux disponibles l'acceptent, le troisième la rate. Si deux confirmations sur trois suffisent, l'écriture est **réussie** : le client ignore simplement qu'un réplica l'a ratée.

Quand le nœud revient, il a des données périmées. Pour que ce ne soit pas un problème, **les lectures sont aussi envoyées à plusieurs nœuds en parallèle**. Le client reçoit des réponses différentes (la valeur récente d'un nœud, périmée d'un autre) et des **numéros de version** déterminent la plus récente.

## Réparation à la lecture et anti-entropie

Comment un nœud qui revient rattrape-t-il ce qu'il a manqué ? Deux mécanismes :

- **Réparation à la lecture** (*read repair*) : en lisant sur plusieurs nœuds en parallèle, le client détecte les réponses périmées. S'il obtient la version 7 de deux nœuds et la version 6 du troisième, il **réécrit la version 7 sur le troisième**. Efficace pour les valeurs souvent lues ;
- **Processus d'anti-entropie** : un processus de fond cherche en permanence des différences entre réplicas et copie ce qui manque. Contrairement au log de réplication d'un leader, il **ne copie pas dans un ordre particulier** et peut mettre longtemps.

Tous les systèmes n'implémentent pas les deux : Voldemort n'a pas d'anti-entropie. Sans elle, une valeur rarement lue peut manquer sur certains réplicas et avoir une durabilité réduite, car la réparation à la lecture n'agit que si la valeur est lue.

## Les quorums

Dans l'exemple, on a considéré l'écriture réussie avec 2 confirmations sur 3. Jusqu'où pousser ? Si chaque écriture réussie est présente sur au moins 2 réplicas sur 3, **au plus un réplica est périmé**. Donc si on lit sur au moins 2 réplicas, au moins un des deux est à jour. Généralisation : avec **n** réplicas, une écriture doit être confirmée par **w** nœuds et on interroge au moins **r** nœuds par lecture. Tant que **w + r > n**, une lecture reçoit une valeur à jour, car **au moins un des r nœuds lus a participé à la dernière écriture** : l'ensemble écrit et l'ensemble lu se recoupent. On parle de lectures et écritures de **quorum**, et on peut voir r et w comme les votes minimaux requis.

Dans les bases Dynamo-style, n, w et r sont configurables. Choix courant : n impair (3 ou 5), w = r = (n+1)/2 arrondi au-dessus. Une charge avec peu d'écritures et beaucoup de lectures peut préférer w = n et r = 1 : lectures rapides, mais **un seul nœud en panne fait échouer toutes les écritures**.

La condition w + r > n permet de tolérer des nœuds indisponibles :

- si w < n, on peut encore écrire quand un nœud est indisponible ;
- si r < n, on peut encore lire ;
- n = 3, w = 2, r = 2 : **une** panne tolérée ;
- n = 5, w = 3, r = 3 : **deux** pannes tolérées ;
- les lectures et écritures sont **toujours envoyées aux n réplicas** en parallèle ; w et r fixent seulement **combien de réponses on attend**.

Si moins de w ou r nœuds répondent, l'opération renvoie une erreur. Peu importe la cause (nœud en panne, disque plein, coupure réseau entre le client et le nœud) : on regarde seulement si une réponse favorable est revenue.


## Pièges fréquents

- **Croire que w + r > n suffit à garantir la fraîcheur** (leçon suivante).
- **Choisir w = n pour être sûr** : une seule panne bloque les écritures.
- **Compter sur la réparation à la lecture seule** : les clés rarement lues restent périmées.
- **Penser que n est le nombre total de nœuds du cluster** : une valeur n'est stockée que sur n nœuds, et le cluster peut en avoir davantage (partitionnement, module 07).

## À retenir

- Sans leader : pas de failover ; le client écrit et lit sur plusieurs réplicas en parallèle.
- Un nœud en retard se rattrape par réparation à la lecture et par anti-entropie.
- Quorum : w + r > n ; (3,2,2) tolère 1 panne, (5,3,3) en tolère 2 ; w = n et r = 1 favorise les lectures.
