---
id: ddia-ch11-l05
title: "Numéros de séquence, horloges de Lamport et diffusion à ordre total"
source: { chapter: 9, pages: "343-351" }
duration_min: 45
concepts:
  - id: ddia-sequence-number-ordering
    label: "Des numéros de séquence compacts donnent un ordre total cohérent avec la causalité ; un leader unique les obtient gratuitement via son journal"
  - id: ddia-noncausal-seq-generators
    label: "Sans leader, compteurs par nœud, horloges murales ou blocs pré-alloués donnent des numéros uniques mais pas cohérents avec la causalité"
  - id: ddia-lamport-timestamps
    label: "Horodatage de Lamport (compteur, id de nœud) : on transmet le maximum vu, on avance au-delà ; ordre total cohérent avec la causalité"
  - id: ddia-timestamp-ordering-insufficient
    label: "Un ordre total après coup ne suffit pas pour l'unicité : il faut savoir quand cet ordre est figé, ce qui demande la diffusion à ordre total"
  - id: ddia-total-order-broadcast-def
    label: "Diffusion à ordre total : livraison fiable (aucun message perdu) et totalement ordonnée (même ordre sur tous les nœuds), sans retour en arrière"
  - id: ddia-tob-linearizable-storage
    label: "Un log à ordre total permet un compare-and-set linéarisable (le premier message pour un nom gagne), et inversement"
glossary:
  - term: "numéro de séquence"
    definition: "Entier croissant attribué à chaque opération ; compact, il permet de comparer deux opérations d'un coup."
  - term: "horodatage de Lamport"
    definition: "Paire (compteur, identifiant de nœud) proposée par Leslie Lamport en 1978 ; ordre total : compteur d'abord, identifiant en cas d'égalité."
  - term: "diffusion à ordre total (total order broadcast, atomic broadcast)"
    definition: "Protocole d'échange de messages qui garantit que tous les nœuds reçoivent les mêmes messages, dans le même ordre."
  - term: "réplication par machine à états (state machine replication)"
    definition: "Chaque réplique applique les mêmes écritures déterministes dans le même ordre, et arrive donc au même état."
  - term: "séquenceur"
    definition: "Nœud unique qui attribue les numéros de séquence ; simple, mais il devient un goulot et un point de panne unique."
visuals: []
labs: [ddia-ch11-l05-lab-lamport-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente montrait que suivre toutes les dépendances causales coûte cher. Cette leçon donne l'outil compact qui le remplace : un **numéro**. Elle montre ensuite, sur un exemple très concret (un pseudo unique), pourquoi un numéro ne suffit pas toujours, et quel protocole manque : la **diffusion à ordre total**. Ce protocole est la pièce centrale qui relie ce module au suivant : il est équivalent au consensus, et c'est lui que tu implémentes en petit dans le projet Tinybase.

## Des numéros de séquence

Au lieu de suivre explicitement « qui a lu quoi », on peut attribuer à chaque opération un **numéro de séquence** (ou un horodatage logique, pas l'heure murale, peu fiable comme on l'a vu au module 10). Un entier tient sur quelques octets et permet de comparer deux opérations en une instruction. On veut que cet ordre soit **total** (deux opérations toujours comparables) et **cohérent avec la causalité** : si A s'est produit avant B, A a un plus petit numéro. Les opérations concurrentes reçoivent un ordre arbitraire, ce qui est acceptable.

Avec un **leader unique**, c'est gratuit : le journal de réplication du leader définit déjà un ordre total cohérent avec la causalité. Le leader incrémente un compteur pour chaque opération ; un follower qui applique le journal dans l'ordre est toujours dans un état causalement cohérent, même s'il est en retard.

## Sans leader : des numéros uniques, mais pas causaux

Dans un système multi-leader ou sans leader, ou dans une base partitionnée, il n'y a plus de compteur central. On voit souvent trois méthodes :

1. **un compteur par nœud**, avec un bit pour distinguer les nœuds : deux nœuds, l'un produit les numéros impairs, l'autre les pairs ;
2. **l'horloge murale** de chaque nœud, avec assez de résolution (c'est ce que fait « la dernière écriture gagne ») ;
3. **des blocs pré-alloués** : le nœud A reçoit les numéros 1 à 1 000, le nœud B 1 001 à 2 000.

Les trois sont rapides et donnent des numéros **uniques**. Mais aucune n'est **cohérente avec la causalité** :

- si le nœud pair traite 100 opérations par seconde et l'impair 10, le compteur impair est très en retard : une opération paire numérotée 180 peut avoir causé une opération impaire numérotée 21, plus petite que sa cause ;
- les horloges murales dérivent : un effet peut recevoir un horodatage plus petit que sa cause (module 10) ;
- avec des blocs, une opération du bloc 1 001-2 000 peut précéder causalement une opération du bloc 1-1 000.

## Les horloges de Lamport

Leslie Lamport a proposé en 1978 une méthode simple qui, elle, est cohérente avec la causalité. Chaque nœud a un identifiant unique et un **compteur** d'opérations. Un **horodatage de Lamport** est la paire `(compteur, id du nœud)`. L'ordre total est :

- le plus grand compteur est le plus récent ;
- à compteur égal, le plus grand identifiant de nœud est le plus récent.

La clé de la cohérence causale : **chaque nœud et chaque client transmet le plus grand compteur qu'il a vu**, avec chaque requête. Quand un nœud reçoit un compteur plus grand que le sien, il **saute** à cette valeur. La règle classique, celle de ton projet :

```go
// Événement local ou envoi : on avance.
c.counter++
// Réception d'un message horodaté ts : on dépasse le maximum vu.
c.counter = max(c.counter, ts.Counter) + 1
```

Exemple chiffré. Le nœud 1 a traité 2 opérations, le nœud 2 en a traité 5. Un client écrit sur le nœud 2 : il obtient `(6, 2)`, et retient 6. Il écrit ensuite sur le nœud 1, en transmettant 6 : le nœud 1 saute de 2 à 7 et répond `(7, 1)`. L'effet `(7, 1)` est bien plus grand que sa cause `(6, 2)`. Sans ce saut, le nœud 1 aurait répondu `(3, 1)`, plus petit que la cause.

Ne confonds pas avec les **vecteurs de versions** (module 06) : un vecteur distingue deux opérations **concurrentes** d'opérations causalement liées ; un horodatage de Lamport impose toujours un ordre total, et ne permet donc **pas** de dire si deux opérations étaient concurrentes. En échange, il est bien plus compact : deux nombres, quelle que soit la taille du cluster.

## Pourquoi un ordre total ne suffit pas

Reprenons la contrainte d'unicité de la leçon 2 : deux utilisateurs essaient de créer le compte `ada` en même temps. Idée : la requête au plus petit horodatage de Lamport gagne. **Après coup**, une fois toutes les requêtes connues, ça marche : on compare les horodatages.

Mais un nœud qui reçoit une demande doit répondre **tout de suite**, oui ou non. Il ne sait pas si un autre nœud, en ce moment même, est en train de traiter une demande pour `ada` avec un horodatage plus petit. Pour en être sûr, il devrait consulter **tous** les autres nœuds, et si l'un d'eux est injoignable, il est bloqué. Ce n'est pas tolérant aux pannes.

Le problème : l'ordre total n'émerge qu'une fois **toutes** les opérations collectées. Pour l'unicité, il faut aussi savoir **quand cet ordre est figé** : quand on est sûr qu'aucune opération ne viendra s'insérer avant la tienne. C'est exactement ce que fournit la diffusion à ordre total.

## La diffusion à ordre total

La **diffusion à ordre total** (*total order broadcast*, ou *atomic broadcast*) est un protocole d'échange de messages entre nœuds qui garantit deux propriétés, même si des nœuds ou le réseau tombent en panne :

- **livraison fiable** : aucun message n'est perdu ; s'il est livré à un nœud, il est livré à tous ;
- **livraison totalement ordonnée** : tous les nœuds reçoivent les messages **dans le même ordre**.

Et l'ordre est **figé au moment de la livraison** : un nœud n'a pas le droit d'insérer un message plus tôt dans la séquence s'il a déjà livré des messages suivants. C'est ce qui la rend plus forte que les horodatages.

Usages :

- **réplication par machine à états** : si chaque message est une écriture déterministe, toutes les répliques appliquent les mêmes écritures dans le même ordre et restent identiques. ZooKeeper et etcd fonctionnent ainsi ;
- **transactions** en procédure stockée exécutées dans le même ordre sur chaque partition (module 09) ;
- **un log** : livrer un message, c'est l'ajouter à un journal ; tous les nœuds lisent le même journal dans le même ordre ;
- **jetons de clôture** : le numéro de séquence d'une requête de verrou dans le log sert de jeton croissant (module 10).

## Ordre total et linéarisabilité

On peut bâtir un **stockage linéarisable** sur un log à ordre total. Pour réserver le pseudo `ada` par compare-and-set :

1. ajouter au log un message « je réclame `ada` » ;
2. lire le log, attendre que **son propre message** revienne ;
3. regarder les messages qui le précèdent : si le premier message qui réclame `ada` est le sien, il a gagné, il valide ; sinon, il annule.

Comme tous les nœuds voient le même ordre, ils désignent le **même gagnant**. Les écritures deviennent linéarisables. Les lectures, elles, ne le sont pas d'office (un nœud peut lire un log en retard). Pour une lecture linéarisable : ajouter un message de lecture au log et lire quand il revient (c'est ce que fait `sync()` dans ZooKeeper), ou demander la dernière position du log et attendre d'y être arrivé (etcd, quorum reads), ou lire sur un réplica synchrone.

Inversement, à partir d'un registre linéarisable avec **incrémentation-et-lecture atomique**, on obtient une diffusion à ordre total : chaque message reçoit le numéro suivant du compteur, et chaque destinataire livre dans l'ordre des numéros, **en attendant** les trous (si le message 4 est arrivé et pas le 3, on attend le 3). Contrairement aux horodatages de Lamport, ces numéros n'ont **pas de trous** : c'est ce qui permet de savoir qu'il faut attendre. Le projet Tinybase de ce module implémente exactement ce schéma avec un **séquenceur**.

Problème : rendre ce compteur linéarisable **et** tolérant aux pannes, c'est-à-dire survivre à la panne du séquenceur. On retombe sur le **consensus**. Le résultat est profond : diffusion à ordre total, compare-and-set linéarisable, incrémentation atomique et consensus sont **équivalents**. Le module suivant en tire toutes les conséquences.

## Pièges fréquents

- **Générer des identifiants « uniques » et les croire ordonnés** : compteurs pairs/impairs, horloges et blocs sont uniques, pas causaux.
- **Oublier de transmettre le maximum vu** : sans ce saut, l'horloge de Lamport perd la cohérence causale.
- **Utiliser des horodatages de Lamport pour décider seul d'une unicité** : il faudrait connaître toutes les opérations concurrentes, donc joindre tout le monde.
- **Livrer un message dès son arrivée dans une diffusion à ordre total** : sans attendre les trous, deux nœuds livrent dans des ordres différents.

## À retenir

- Un leader unique donne un ordre total causal gratuit via son journal ; sans leader, les générateurs usuels donnent des numéros uniques mais non causaux.
- Lamport : `(compteur, id)`, on transmet le maximum vu, on saute au-delà ; ordre total cohérent avec la causalité, mais ne détecte pas la concurrence.
- Pour l'unicité, il faut savoir quand l'ordre est figé : diffusion à ordre total (livraison fiable + même ordre partout).
- Log à ordre total ⇒ écritures linéarisables (le premier message pour un nom gagne) ; compteur linéarisable ⇒ diffusion à ordre total. Tous deux sont équivalents au consensus.
