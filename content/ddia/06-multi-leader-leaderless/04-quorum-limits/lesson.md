---
id: ddia-ch06-l04
title: "Limites des quorums et quorums lâches"
source: { chapter: 5, pages: "181-184" }
duration_min: 35
concepts:
  - id: ddia-quorum-edge-cases
    label: "Même avec w + r > n, des cas limites renvoient des valeurs périmées : le quorum n'est pas une garantie absolue"
  - id: ddia-staleness-monitoring
    label: "Mesurer la péremption des réplicas : difficile sans ordre des écritures, mais indispensable pour quantifier « à terme »"
  - id: ddia-sloppy-quorum
    label: "Quorum lâche : accepter w écritures sur des nœuds joignables, même hors des n nœuds d'origine de la clé"
  - id: ddia-hinted-handoff
    label: "Hinted handoff : le nœud de dépannage renvoie l'écriture au nœud d'origine quand le réseau revient"
  - id: ddia-leaderless-multi-dc
    label: "Sans leader sur plusieurs datacenters : quorum local, réplication asynchrone vers les autres sites"
glossary:
  - term: "cohérence à terme (eventual consistency)"
    definition: "Garantie volontairement floue : si les écritures cessent, tous les réplicas finissent par converger, sans dire quand."
  - term: "quorum lâche (sloppy quorum)"
    definition: "Quorum dont les w ou r réponses peuvent venir de nœuds qui ne font pas partie des n nœuds d'origine de la valeur."
  - term: "nœud d'origine (home node)"
    definition: "Un des n nœuds sur lesquels une valeur est normalement stockée."
  - term: "hinted handoff"
    definition: "Transfert, après la fin d'une coupure, des écritures qu'un nœud a acceptées temporairement pour le compte d'un autre."
visuals: []
labs: [ddia-ch06-l04-lab-sloppy-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente a donné une règle séduisante : w + r > n, donc on lit la dernière valeur. C'est **faux dans plusieurs cas réels**, et des équipes ont bâti des fonctionnalités (unicité d'un pseudo, solde d'un compte) sur cette fausse certitude. Cette leçon liste les trous de la garantie, montre comment mesurer la péremption, et présente le **quorum lâche**, une option activée par défaut dans certaines bases qui affaiblit encore la garantie au profit de la disponibilité.

## Le quorum n'a pas besoin d'être une majorité

On choisit souvent w et r à la **majorité** (plus de n/2) : cela assure w + r > n tout en tolérant jusqu'à la moitié des réplicas en panne (moins un). Mais la seule condition utile est le **chevauchement** : n = 6, w = 5, r = 2 convient aussi.

On peut aussi choisir **w + r ≤ n** délibérément : les lectures ont plus de chances d'être périmées, mais la latence baisse et la disponibilité monte. Avec n = 3, w = 1, r = 1, le système accepte lectures et écritures tant qu'**un seul** réplica répond.

## Six façons de lire une valeur périmée malgré w + r > n

1. **Quorum lâche** (voir plus bas) : les w réplicas écrits peuvent être en dehors des n habituels, et ne plus croiser les r lus.
2. **Deux écritures concurrentes** : on ne sait pas laquelle est arrivée en premier. La seule solution sûre est de les fusionner ; si l'on choisit un gagnant par horodatage (LWW), le **décalage d'horloge** peut faire perdre des écritures (leçon 5).
3. **Une écriture concurrente à une lecture** : l'écriture n'est arrivée que sur une partie des réplicas ; la lecture peut renvoyer l'ancienne valeur ou la nouvelle, c'est indéterminé.
4. **Une écriture réussie sur moins de w réplicas** (disque plein sur les autres) : le client reçoit une erreur, mais l'écriture **n'est pas annulée** là où elle a réussi. Les lectures suivantes peuvent renvoyer cette valeur « échouée »… ou pas.
5. **Un réplica qui portait la nouvelle valeur tombe, et on le restaure à partir d'un réplica qui portait l'ancienne** : le nombre de copies de la nouvelle valeur passe sous w, la condition de quorum est rompue.
6. **Des problèmes de timing** même quand tout se passe bien, que le module sur la linéarisabilité étudiera.

Scénario chiffré pour le cas 4 : n = 3, w = 3. L'écriture `stock = 0` réussit sur A, échoue sur B et C (disque plein). Le client reçoit une erreur et affiche « réessayez ». Pourtant, une lecture r = 1 qui tombe sur A renvoie `stock = 0` : une valeur que l'application croit n'avoir jamais écrite.

### Ce qu'il faut en conclure

Les bases façon Dynamo sont optimisées pour des cas d'usage qui **tolèrent la cohérence à terme**. w et r règlent la **probabilité** de lire une valeur périmée ; ce ne sont **pas des garanties absolues**. En particulier, tu n'as pas automatiquement les garanties du module précédent : relire ses propres écritures, lectures monotones, préfixe cohérent. Pour des garanties plus fortes, il faut des **transactions** ou du **consensus**.

## Mesurer la péremption

Avec un leader, mesurer le retard est simple : on soustrait la position d'un suiveur dans le journal de celle du leader. Sans leader, il n'y a **pas d'ordre fixe des écritures**, donc pas de position à comparer. Pire : si la base n'utilise que le read repair, sans anti-entropie, il n'y a **aucune limite** à l'âge d'une valeur sur un réplica peu lu.

Des travaux de recherche estiment la proportion attendue de lectures périmées en fonction de n, w, r et des latences du réseau. Retiens la pratique : **inclure la péremption dans les métriques de supervision**, au même titre que la latence. « À terme » est volontairement flou ; en exploitation, il faut le chiffrer. Par exemple : « 99,9 % des réplicas reçoivent une écriture en moins de 200 ms, et la plus vieille divergence détectée par l'anti-entropie date de 40 secondes ».

## Les quorums lâches

Un grand cluster compte bien plus de nœuds que n. Une coupure réseau isole un client de deux des trois nœuds d'origine d'une clé, mais il peut encore joindre d'autres nœuds du cluster. Deux options :

- **quorum strict** : renvoyer une erreur pour toute requête qui n'atteint pas w ou r nœuds **d'origine** ;
- **quorum lâche** : accepter quand même l'écriture et la confier à des nœuds **joignables**, même s'ils ne font pas partie des n nœuds d'origine de cette clé. On exige toujours w et r réponses, mais pas forcément des « bons » nœuds.

L'image du livre : tu es enfermé dehors, un voisin t'héberge sur son canapé. Quand la coupure se termine, le voisin te renvoie chez toi : les écritures acceptées pour le compte d'un autre nœud sont transmises à leur nœud d'origine. C'est le **hinted handoff** (transfert avec indice : l'écriture porte la mention du nœud à qui elle est destinée).

Le bilan :

- **Disponibilité en écriture accrue** : tant que w nœuds quelconques répondent, on écrit.
- **Plus aucune garantie de lecture** : même avec w + r > n, la dernière valeur peut se trouver sur des nœuds de dépannage que la lecture n'interroge pas, jusqu'à la fin du hinted handoff. Un quorum lâche n'est pas un quorum ; c'est une **garantie de durabilité** : la donnée est quelque part sur w nœuds.

L'option existe dans toutes les implémentations Dynamo courantes : **activée par défaut dans Riak**, désactivée par défaut dans Cassandra et Voldemort (à l'époque du livre).

## Plusieurs datacenters sans leader

La réplication sans leader convient aussi aux déploiements multi-datacenters : elle est conçue pour tolérer écritures concurrentes, coupures réseau et pics de latence.

- **Cassandra et Voldemort** : n compte les réplicas de **tous** les datacenters, et l'on configure combien de ces n sont dans chacun. Chaque écriture part vers tous les réplicas, mais le client n'attend en général qu'un **quorum dans son datacenter local**, ce qui le rend insensible aux lenteurs du lien inter-sites. Les écritures vers les autres sites sont souvent asynchrones.
- **Riak** garde toute la communication client-base dans un datacenter : n décrit les réplicas d'**un** site, et la réplication entre clusters de sites différents se fait en arrière-plan, à la manière du multi-leader.

Exemple : n = 6 avec 3 réplicas à Paris et 3 à Singapour, quorum local de 2. Une écriture parisienne attend 2 réponses parisiennes (≈ 2 ms) au lieu d'attendre un réplica singapourien à 160 ms d'aller-retour.

## Pièges fréquents

- **Implémenter une contrainte d'unicité** (pseudo, numéro de facture) avec des lectures quorum : les cas limites laissent passer des doublons.
- **Interpréter une erreur d'écriture comme « rien n'a été écrit »** : l'écriture est peut-être sur une partie des réplicas.
- **Activer le quorum lâche et croire garder w + r > n** : les lectures ne croisent plus forcément les écritures.
- **Ne pas superviser la péremption** : sans chiffre, « à terme » peut vouloir dire des semaines pour une donnée peu lue.

## À retenir

- Le quorum n'exige que le **chevauchement**, pas la majorité ; w + r ≤ n est un choix légitime pour la latence.
- Même avec w + r > n, des **cas limites** (concurrence, écritures partielles non annulées, restauration, quorum lâche) renvoient des valeurs périmées : c'est une **probabilité**, pas une garantie.
- **Mesure la péremption** en production.
- Le **quorum lâche** accepte les écritures sur des nœuds de dépannage, rendues plus tard par **hinted handoff** : plus de disponibilité, moins de garantie de lecture.
- Sur plusieurs datacenters : quorum **local**, réplication asynchrone entre sites.
