---
id: ddia-ch05-l01
title: "Leaders, followers et réplication synchrone ou asynchrone"
source: { chapter: 5, pages: "151-155" }
duration_min: 35
concepts:
  - id: ddia-replication-goals
    label: "Répliquer pour rapprocher les données des utilisateurs, survivre aux pannes et multiplier les lectures"
  - id: ddia-leader-follower
    label: "Leader et followers : toutes les écritures passent par le leader, les lectures peuvent aller à n'importe quel réplica"
  - id: ddia-replication-change-stream
    label: "Le leader envoie un log de changements que chaque follower applique dans le même ordre"
  - id: ddia-leader-sync-replication
    label: "Réplication synchrone : l'écriture n'est confirmée qu'après l'accusé du follower, qui peut tout bloquer"
  - id: ddia-leader-async-replication
    label: "Réplication asynchrone : le leader confirme sans attendre ; une écriture confirmée peut être perdue"
  - id: ddia-leader-semi-sync
    label: "Semi-synchrone : un seul follower synchrone, remplacé par un autre s'il ralentit"
glossary:
  - term: "réplica"
    definition: "Un nœud qui stocke une copie complète des données."
  - term: "leader (primaire, master)"
    definition: "Le réplica qui reçoit toutes les écritures des clients et les transmet aux autres."
  - term: "follower (réplica en lecture, secondaire, slave)"
    definition: "Un réplica qui applique, dans l'ordre, les changements envoyés par le leader. Il ne sert que des lectures."
  - term: "log de réplication (flux de changements)"
    definition: "La suite ordonnée des écritures que le leader transmet à ses followers."
  - term: "réplication semi-synchrone"
    definition: "Configuration où exactement un follower est synchrone et les autres asynchrones ; si le follower synchrone ralentit, un autre prend sa place."
  - term: "chain replication"
    definition: "Variante où les réplicas forment une chaîne : on écrit en tête, on lit en queue. Elle vise la durabilité sans le coût du tout-synchrone."
visuals: []
labs: [ddia-ch05-l01-lab-sync-tradeoffs]
xp: 40
---

## Pourquoi c'est important

Jusqu'ici, Tinybase vivait sur **une** machine. Le jour où ce disque meurt, où ce datacenter perd le courant, ou simplement où les lecteurs deviennent trop nombreux, tu as besoin de **copies**. La réplication paraît simple (« copie les données ailleurs »), mais toute la difficulté est dans les **changements** : comment faire pour que chaque copie reçoive chaque écriture, dans le bon ordre, et que dire au client quand une copie ne répond pas ? Ce chapitre ouvre la partie « données distribuées » du livre, et presque tout ce qui suit (partitions, transactions, consensus) s'appuie sur ce qu'on pose ici.

## Trois raisons de répliquer

Répliquer, c'est garder une copie des mêmes données sur plusieurs machines reliées par le réseau. On le fait pour trois raisons différentes, qu'il faut savoir distinguer parce qu'elles mènent à des réglages différents :

1. **La latence** : garder les données près des utilisateurs. Un lecteur à Tokyo qui interroge une base à Paris paie environ 250 ms d'aller-retour ; un réplica à Tokyo lui répond en quelques millisecondes.
2. **La disponibilité** : continuer à fonctionner quand une partie du système est en panne. C'est la tolérance aux fautes du chapitre 1 (fiabilité), appliquée aux données.
3. **Le débit de lecture** : multiplier les machines qui servent les lectures. Si un nœud tient 5 000 lectures par seconde et que tu en reçois 40 000, il te faut au moins 8 réplicas.

Hypothèse de ce chapitre : chaque machine peut contenir **toutes** les données. Quand ce n'est plus vrai, on découpe en partitions (chapitre suivant du livre, module 07).

Si les données ne changeaient jamais, répliquer serait trivial : on copie une fois et c'est fini. Tout le sujet est donc la **propagation des changements**. Le livre présente trois familles d'algorithmes : **un seul leader**, **plusieurs leaders** et **sans leader**. Ce module traite la première, de loin la plus répandue ; le module suivant traite les deux autres.

## Leader et followers

Chaque nœud qui stocke une copie est un **réplica**. Pour que toutes les copies finissent identiques, la solution la plus courante est la **réplication avec leader** (aussi appelée *active/passive* ou *master/slave*) :

1. Un réplica est désigné **leader**. Toute écriture d'un client lui est envoyée. Il l'applique d'abord à son propre stockage local.
2. Les autres réplicas sont des **followers**. À chaque écriture, le leader leur envoie le changement dans un **log de réplication** (ou flux de changements). Chaque follower l'applique **dans le même ordre** que le leader.
3. Un client qui veut **lire** peut interroger le leader ou n'importe quel follower. Mais seul le leader accepte les **écritures** : du point de vue du client, les followers sont en lecture seule.

L'ordre est la clé. Rappelle-toi le log du module 02 : un fichier en ajout seul, rejoué du début à la fin, reconstruit exactement le même état. Ici c'est pareil : deux followers qui appliquent la même suite de changements dans le même ordre arrivent au même résultat.

Ce mode est intégré à PostgreSQL (depuis la 9.0), MySQL, Oracle Data Guard, SQL Server (groupes de disponibilité AlwaysOn), MongoDB, RethinkDB ou Espresso de LinkedIn. On le retrouve hors des bases : Kafka et les files hautement disponibles de RabbitMQ l'utilisent, et même des périphériques de bloc répliqués comme DRBD.

## Synchrone ou asynchrone

Question décisive : quand le leader confirme-t-il l'écriture au client ?

Prends un utilisateur qui change sa photo de profil. Le client envoie la requête au leader ; le leader écrit, puis transmet le changement à deux followers.

- **Follower synchrone** : le leader **attend** l'accusé de réception du follower avant de répondre « OK » au client, et avant de rendre l'écriture visible aux autres.
- **Follower asynchrone** : le leader envoie le changement et répond « OK » **sans attendre**.

En temps normal, la réplication est rapide : la plupart des systèmes appliquent un changement sur les followers en moins d'une seconde. Mais rien ne le **garantit**. Un follower peut prendre plusieurs minutes de retard s'il se remet d'une panne, si la machine est saturée, ou si le réseau entre les deux nœuds a des soucis.

### Le prix de chaque choix

| | Synchrone | Asynchrone |
|---|---|---|
| Durabilité | L'écriture existe sur 2 nœuds quand le client reçoit OK | Le leader peut mourir avec des écritures confirmées mais non transmises |
| Latence d'écriture | Ajoute l'aller-retour vers le follower le plus lent attendu | Celle du leader seul |
| Disponibilité en écriture | Si le follower synchrone ne répond pas, **aucune** écriture ne passe | Le leader continue d'écrire même si tous les followers sont à la traîne |

Chiffrons. Leader à Paris, écriture locale en 3 ms, follower A dans le même datacenter (1 ms aller-retour), follower B à Montréal (85 ms aller-retour). Rendre B synchrone fait passer chaque écriture de 3 ms à environ 88 ms. Rendre **tous** les followers synchrones est pire encore : une seule panne de n'importe lequel bloque tout le système. Avec 5 followers indisponibles chacun 1 % du temps de façon indépendante, les écritures seraient bloquées environ 1 − 0,99⁵ ≈ **4,9 %** du temps.

### Semi-synchrone : le compromis courant

En pratique, « activer la réplication synchrone » signifie le plus souvent : **un** follower est synchrone, les autres sont asynchrones. Si le follower synchrone tombe ou ralentit, un follower asynchrone devient synchrone à sa place. On garantit ainsi que chaque écriture confirmée existe sur au moins **deux** nœuds (le leader et un follower), sans dépendre de la santé de tous. Ce réglage est appelé **semi-synchrone**.

### Tout asynchrone : fréquent, et risqué

Beaucoup de déploiements sont **entièrement asynchrones**, surtout quand il y a beaucoup de followers ou qu'ils sont géographiquement dispersés. Avantage : le leader traite les écritures quoi qu'il arrive aux followers. Inconvénient : l'écriture n'est **pas durable** au sens où le client l'entend. Si le leader meurt de façon irrécupérable, toutes les écritures qu'il avait confirmées mais pas encore transmises sont **perdues**. Affaiblir la durabilité semble un mauvais marché, mais c'est souvent ce qu'on choisit pour la latence et la disponibilité. Les leçons suivantes montrent ce que coûte ce choix au moment d'un failover, puis pour les lecteurs.

### Aller plus loin (au-delà du livre)

Le livre signale que perdre des données en asynchrone est un vrai problème et que la recherche continue. Exemple cité : la **chain replication**, utilisée par Microsoft Azure Storage. Les réplicas forment une chaîne : on écrit en tête, l'écriture descend de nœud en nœud, et on lit en queue. Une lecture en queue ne voit donc que des écritures présentes sur **tous** les nœuds. Aujourd'hui, les systèmes à consensus (Raft dans etcd ou CockroachDB, Paxos dans Spanner) prennent une autre voie : une écriture est confirmée dès qu'une **majorité** l'a reçue, ce qui tolère la panne d'une minorité sans perdre de données. On y reviendra au module 12.

On verra aussi plus loin dans le livre que le lien entre cohérence, réplication et consensus est profond : tout système à un leader doit résoudre « qui est le leader ? », et c'est un problème de consensus.

## Pièges fréquents

- **Croire que « réplication » veut dire « sauvegarde »** : un `DELETE` malheureux est répliqué fidèlement sur tous les followers en moins d'une seconde. La réplication protège des pannes de machine, pas des erreurs humaines.
- **Rendre tous les followers synchrones** : la disponibilité en écriture devient celle du **pire** follower.
- **Oublier que l'asynchrone est la valeur par défaut** de beaucoup de bases : un « OK » du leader ne garantit pas que l'écriture existe ailleurs.
- **Écrire sur un follower** : il est en lecture seule ; si ton pilote répartit toutes les requêtes au hasard, les écritures échouent ou, pire, créent des divergences sur des systèmes mal configurés.
- **Supposer que le retard est toujours d'une fraction de seconde** : c'est le cas typique, jamais une garantie.

## À retenir

- On réplique pour la latence (données proches), la disponibilité (survivre aux pannes) et le débit de lecture (plus de machines).
- Réplication avec leader : écritures sur le leader seul, qui envoie un log de changements appliqué dans le même ordre par chaque follower ; lectures partout.
- Synchrone = durable mais lent et fragile ; asynchrone = rapide et disponible, mais une écriture confirmée peut être perdue.
- Le compromis courant est semi-synchrone : un follower synchrone (remplaçable), les autres asynchrones.
