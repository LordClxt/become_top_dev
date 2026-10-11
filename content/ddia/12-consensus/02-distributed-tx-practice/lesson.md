---
id: ddia-ch12-l02
title: "Transactions distribuées en pratique : XA et ses limites"
source: { chapter: 9, pages: "359-364" }
duration_min: 30
concepts:
  - id: ddia-dtx-internal-vs-heterogeneous
    label: "Transactions distribuées internes à une base (même logiciel partout) contre hétérogènes (technologies différentes)"
  - id: ddia-dtx-exactly-once-messages
    label: "Traitement exactement une fois : l'acquittement du message et l'écriture en base validés dans la même transaction atomique"
  - id: ddia-xa-standard
    label: "XA : API standard de 2PC entre technologies ; le coordinateur est une bibliothèque dans le processus applicatif"
  - id: ddia-dtx-in-doubt-locks
    label: "Une transaction en doute garde ses verrous : des pans entiers de l'application deviennent indisponibles"
  - id: ddia-dtx-orphaned-heuristic
    label: "Transactions orphelines et décisions heuristiques : l'intervention manuelle qui casse l'atomicité"
  - id: ddia-dtx-limitations
    label: "Limites : coordinateur point unique de défaillance, serveur d'application plus sans état, plus petit dénominateur commun, amplification des pannes"
glossary:
  - term: "transaction distribuée hétérogène"
    definition: "Transaction dont les participants sont des technologies différentes : deux bases de fournisseurs différents, une base et un broker…"
  - term: "XA (eXtended Architecture)"
    definition: "Standard de 1991 (X/Open) pour faire de la validation en deux phases entre technologies hétérogènes ; une API en C, exposée en Java par JTA."
  - term: "transaction orpheline"
    definition: "Transaction en doute dont le coordinateur ne pourra jamais donner l'issue (journal perdu ou corrompu)."
  - term: "décision heuristique"
    definition: "Issue de secours : un participant valide ou annule une transaction en doute sans le coordinateur, au risque de casser l'atomicité."
  - term: "exactement une fois (exactly-once)"
    definition: "Un message est traité de façon que son effet soit appliqué une seule fois, même s'il a fallu réessayer."
visuals: []
labs: [ddia-ch12-l02-lab-xa-design]
xp: 40
---

## Pourquoi c'est important

Sur le papier, les transactions distribuées offrent une garantie de rêve : plusieurs systèmes qui changent ensemble, ou pas du tout. En pratique, elles ont une réputation mitigée. Certains services cloud refusent tout simplement de les implémenter à cause de leurs problèmes opérationnels ; et l'on a mesuré que les transactions distribuées de MySQL pouvaient être **plus de dix fois plus lentes** qu'une transaction sur un seul nœud. Cette leçon explique d'où vient ce coût, et quels incidents de production t'attendent si tu les adoptes sans y penser.

## Deux familles très différentes

On mélange souvent deux choses sous le même nom :

- **les transactions distribuées internes** à une base : tous les nœuds exécutent le **même logiciel** (VoltDB, MySQL Cluster et son moteur NDB, beaucoup de bases partitionnées). Le fournisseur maîtrise tout, il peut optimiser le protocole à sa façon. Elles marchent souvent très bien ;
- **les transactions distribuées hétérogènes** : les participants sont des **technologies différentes**, par exemple une base PostgreSQL et un broker de messages, ou deux bases de fournisseurs différents. Il faut une garantie atomique entre des systèmes qui ne partagent rien. C'est beaucoup plus difficile.

D'où vient la lenteur dans les deux cas ? Surtout des **écritures forcées sur disque** (`fsync`) supplémentaires nécessaires à la reprise après crash (le vote oui et la décision doivent être durables), et des **allers-retours réseau** en plus.

## L'exemple qui fait rêver : traiter un message exactement une fois

Un consommateur lit un message « commande payée » dans une file et écrit une ligne en base. Sans précaution, si le consommateur plante entre l'écriture en base et l'acquittement du message, le broker redélivre, et la commande est traitée deux fois.

Avec une transaction distribuée hétérogène, on valide **dans la même transaction atomique** l'écriture en base **et** l'acquittement du message. Soit les deux, soit aucun. Si quelque chose échoue, les deux sont annulés : le broker redélivrera le message plus tard, et comme les effets de la tentative ratée ont été annulés, on peut réessayer sans danger. Le message est traité **exactement une fois**.

La condition : **tous** les systèmes touchés doivent parler le même protocole de commit atomique. Si le traitement envoie aussi un e-mail, et que le serveur de mail ne sait pas faire 2PC, l'e-mail partira deux fois en cas de nouvel essai. (Le chapitre « Traitement de flux » montrera une autre voie, sans transaction distribuée.)

## XA, le standard

**XA** (*eXtended Architecture*) est le standard de 2PC hétérogène, introduit en 1991 par X/Open. Il est largement supporté : PostgreSQL, MySQL, DB2, SQL Server, Oracle côté bases ; ActiveMQ, HornetQ, MSMQ, IBM MQ côté brokers.

XA n'est **pas un protocole réseau** : c'est une **API en C** pour dialoguer avec un coordinateur. En Java, on la retrouve dans JTA, utilisée par les pilotes JDBC et JMS. Concrètement :

- le **coordinateur est une bibliothèque** chargée dans le **processus de l'application** qui émet la transaction ;
- il suit les participants, leur demande de se préparer via leurs pilotes, recueille leurs réponses ;
- il écrit ses décisions dans un **journal sur le disque local** du serveur d'application.

Conséquence directe : si le processus de l'application plante ou si sa machine meurt, **le coordinateur part avec lui**. Les participants préparés restent en doute. Il faut redémarrer ce serveur, relire son journal, et la bibliothèque XA renvoie les décisions. Les bases ne peuvent pas contacter le coordinateur elles-mêmes : toute communication passe par les pilotes.

## Des verrous qui ne lâchent pas

Pourquoi s'inquiéter d'une transaction en doute ? À cause des **verrous**. Une base garde en général des verrous exclusifs sur chaque ligne modifiée par une transaction (pour éviter les écritures sales), et, en isolation sérialisable par verrouillage en deux phases (2PL), des verrous partagés sur les lignes **lues**.

La base **ne peut pas relâcher ces verrous** avant de connaître l'issue. Si le coordinateur met 20 minutes à redémarrer, les verrous tiennent 20 minutes. Si son journal est perdu, ils tiennent **indéfiniment**, jusqu'à ce qu'un administrateur intervienne. Pendant ce temps, aucune autre transaction ne peut modifier ces lignes ; selon la base, elles ne peuvent même pas les lire. Une ligne de stock d'un produit populaire bloquée, et c'est tout le tunnel de commande qui s'arrête.

## Transactions orphelines et décisions heuristiques

En théorie, le coordinateur revient et tout se résout. En pratique, il arrive qu'une transaction reste **orpheline** : le coordinateur ne pourra jamais donner l'issue, parce que son journal a été perdu ou corrompu (bogue logiciel, disque mort).

Ces transactions restent là pour toujours, verrous compris. **Redémarrer la base n'y change rien** : une implémentation correcte de 2PC doit conserver les transactions préparées et leurs verrous à travers un redémarrage, sinon elle romprait sa promesse. Il ne reste qu'une solution : un **administrateur** examine les participants et décide à la main de valider ou d'annuler, sous pression, souvent en pleine panne de production.

Beaucoup d'implémentations XA offrent une issue de secours : la **décision heuristique**, qui laisse un participant trancher seul une transaction en doute. « Heuristique » est ici un euphémisme pour « qui casse probablement l'atomicité » : c'est précisément ce que 2PC promettait d'empêcher. À réserver aux catastrophes.

## Les limites de fond

Même sans incident, les transactions distribuées hétérogènes imposent des contraintes :

- **le coordinateur est une base de données** (il stocke l'issue des transactions) et doit être traité avec le même soin. S'il n'est pas répliqué, c'est un **point unique de défaillance** pour tout le système. Or beaucoup d'implémentations ne sont pas hautement disponibles par défaut, ou n'ont qu'une réplication rudimentaire ;
- **le serveur d'application n'est plus sans état.** On aime les serveurs applicatifs sans état, qu'on ajoute et retire à volonté. Avec un coordinateur embarqué, son journal devient un état durable critique, aussi important que la base ;
- **XA est un plus petit dénominateur commun.** Il ne peut pas détecter les interblocages **entre** systèmes (il faudrait un protocole standard pour échanger les informations de verrous) et il ne fonctionne pas avec l'isolation sérialisable par snapshot (SSI), qui exigerait un protocole pour repérer les conflits entre systèmes. Les transactions internes à une base n'ont pas ces limites ;
- **2PC amplifie les pannes.** Il faut que **tous** les participants répondent pour valider : si un seul est en panne, la transaction échoue. On voulait des systèmes tolérants aux pannes ; on obtient l'inverse.

## Pièges fréquents

- **Traiter un serveur d'application XA comme un conteneur jetable** : en détruisant sa machine, tu détruis le journal du coordinateur et tu crées des transactions orphelines.
- **Redémarrer la base pour « débloquer »** : les transactions préparées et leurs verrous survivent, c'est voulu.
- **Prendre une décision heuristique à la légère** : elle peut valider ici ce qui a été annulé ailleurs.
- **Croire qu'XA rend un e-mail ou un appel HTTP atomique** : seuls les systèmes qui parlent XA participent.
- **Juger toutes les transactions distribuées sur la réputation d'XA** : celles internes à une base sont souvent bien plus efficaces.

## À retenir

- Internes (même logiciel) ou hétérogènes (XA) : les secondes sont les plus délicates.
- Le cas d'usage phare : acquitter un message et écrire en base atomiquement, pour un traitement exactement une fois.
- Le coordinateur XA vit dans le processus applicatif, avec son journal sur disque local : s'il meurt, les participants restent en doute.
- En doute = verrous tenus ; orphelines = verrous tenus pour toujours, jusqu'à une décision manuelle ou heuristique.
- Le coordinateur est un point unique de défaillance, XA ne détecte ni interblocages ni conflits SSI entre systèmes, et un participant en panne fait échouer toute la transaction.
