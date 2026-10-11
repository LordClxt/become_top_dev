---
id: ddia-ch08-l01
title: "Transactions, ACID et abandons"
source: { chapter: 7, pages: "221-233" }
duration_min: 35
concepts:
  - id: ddia-transaction-abstraction
    label: "Une transaction regroupe lectures et écritures en une unité : tout est validé (commit) ou tout est abandonné (abort)"
  - id: ddia-acid-atomicity
    label: "Atomicité = possibilité d'abandon : une panne au milieu annule tout, on peut réessayer sans risque de demi-écriture"
  - id: ddia-acid-consistency
    label: "Cohérence = invariants de l'application ; la base ne fait que les préserver si les transactions sont correctes"
  - id: ddia-acid-isolation
    label: "Isolation = les transactions concurrentes ne se marchent pas dessus ; l'idéal théorique est la sérialisabilité"
  - id: ddia-acid-durability
    label: "Durabilité = une transaction validée n'est pas perdue : disque et WAL sur un nœud, copies sur plusieurs nœuds"
  - id: ddia-multi-object-txn
    label: "Mono-objet (atomicité et isolation d'une seule clé) contre multi-objets (clés étrangères, dénormalisation, index secondaires)"
  - id: ddia-txn-retry-pitfalls
    label: "Réessayer une transaction abandonnée : doublons si le commit a réussi, surcharge, erreurs permanentes, effets de bord externes"
glossary:
  - term: "transaction"
    definition: "Groupe de lectures et d'écritures traité comme une seule opération logique : soit tout réussit (commit), soit rien n'a d'effet (abort, rollback)."
  - term: "ACID"
    definition: "Atomicité, Cohérence, Isolation, Durabilité : les garanties promises par les transactions, dont la définition varie d'une base à l'autre."
  - term: "BASE"
    definition: "Basically Available, Soft state, Eventual consistency : étiquette des systèmes qui ne sont pas ACID, encore plus floue."
  - term: "sérialisabilité"
    definition: "Garantie que le résultat de transactions concurrentes est le même que si elles s'étaient exécutées l'une après l'autre."
  - term: "backoff exponentiel"
    definition: "Attendre de plus en plus longtemps entre deux nouveaux essais (par exemple 50, 100, 200 ms) pour ne pas aggraver une surcharge."
visuals: []
labs: [ddia-ch08-l01-lab-acid-design]
xp: 40
---

## Pourquoi c'est important

Tout ce qui peut mal tourner tourne mal un jour : la base ou le matériel lâche au milieu d'une écriture, l'application plante après trois requêtes sur cinq, le réseau coupe, deux clients écrivent la même ligne au même instant. Gérer chacun de ces cas à la main, dans chaque écran de l'application, est un travail énorme et une source de bogues sans fin. Depuis quarante ans, la réponse standard est la **transaction**. Ce chapitre te montre ce qu'elle garantit vraiment, et surtout ce qu'elle **ne** garantit **pas** quand la base tourne à un niveau d'isolation « faible », ce qui est le réglage par défaut presque partout.

## Une abstraction pour simplifier l'erreur

Une transaction regroupe plusieurs lectures et écritures en **une seule unité logique**. Soit elle est **validée** (*commit*) et tous ses effets deviennent permanents, soit elle est **abandonnée** (*abort*, *rollback*) et aucun de ses effets ne subsiste. L'application n'a plus à se demander « où en étais-je quand ça a planté ? » : un échec veut dire « rien ne s'est passé », et l'on peut **réessayer**.

Ce n'est pas une loi de la nature : c'est un **choix de conception** fait pour simplifier la vie des développeurs. Certaines applications n'en ont pas besoin, et renoncer aux transactions permet parfois plus de performance ou de disponibilité. Pendant la vague NoSQL des années 2000, beaucoup de bases ont abandonné ou affaibli les transactions, et l'on a entendu les deux excès : « pas de transactions, pas de passage à l'échelle » et « sans transactions, pas de données sérieuses ». La vérité est entre les deux : il faut savoir ce qu'elles apportent pour décider en connaissance de cause.

## ACID, lettre par lettre

Les garanties d'une transaction se résument par l'acronyme **ACID** (Härder et Reuter, 1983). En pratique, l'acronyme sert surtout au marketing : l'implémentation d'une base « ACID » ne ressemble pas à celle d'une autre, surtout pour le I. Les systèmes qui ne sont pas ACID se disent parfois **BASE** (*Basically Available, Soft state, Eventual consistency*), ce qui veut dire encore moins de choses.

### A : atomicité, ou plutôt « abandonnabilité »

En programmation concurrente, « atomique » veut dire « personne ne voit d'état intermédiaire ». Ce n'est **pas** le sens ACID (c'est l'isolation). Ici, atomique veut dire : si la transaction échoue **au milieu** (panne de processus, réseau coupé, disque plein, contrainte violée), toutes ses écritures déjà faites sont **annulées**.

Exemple : un virement de 200 € débite le compte A puis crédite le compte B. Sans atomicité, un crash entre les deux fait **disparaître** 200 €. Avec, le débit est annulé et le virement peut être relancé sans risque de le faire deux fois. Kleppmann suggère que *abortability* aurait été un meilleur mot.

### C : cohérence, la lettre qui n'appartient pas à la base

La cohérence ACID désigne des **invariants** de l'application : « dans une comptabilité, la somme des débits égale celle des crédits ». Si une transaction part d'un état valide et que ses écritures préservent les invariants, l'état d'arrivée est valide. Mais c'est l'**application** qui définit ce qu'est un état valide et qui écrit des transactions correctes. La base vérifie quelques contraintes (clés étrangères, unicité, `CHECK`), pas « le solde ne doit jamais être négatif » si personne ne le lui a dit. Le C ne figure dans ACID que pour faire joli : les lettres A, I et D sont des propriétés de la base, le C est une propriété de l'application.

> Attention, le mot « cohérence » est surchargé : cohérence des réplicas (chapitres sur la réplication), hachage cohérent (partitionnement), cohérence linéarisable (à venir), et cohérence ACID. Quatre sens différents.

### I : isolation

Plusieurs clients accèdent aux mêmes données au même moment. Exemple classique : deux clients lisent un compteur qui vaut 42, ajoutent 1 et écrivent 43. Il aurait dû passer à 44 : une incrémentation est **perdue**. L'isolation veut dire que les transactions concurrentes ne se marchent pas dessus. Les manuels la définissent comme la **sérialisabilité** : le résultat est le même que si les transactions s'étaient exécutées **une par une**.

En pratique, la sérialisabilité coûte cher, et elle est rarement le réglage par défaut. Oracle 11g propose un niveau nommé « serializable » qui est en réalité un *snapshot isolation*, plus faible. Ce chapitre et le suivant sont consacrés à cet écart.

### D : durabilité

Une fois validée, une transaction n'est **pas perdue**, même si la machine tombe ou que la base plante. Sur un nœud : écriture sur un support non volatil, en général avec un **journal d'écriture anticipée** (WAL, vu avec les B-trees). Dans une base répliquée : copie sur un certain nombre de nœuds avant d'annoncer le commit.

La durabilité parfaite n'existe pas : un disque qui meurt avec ses sauvegardes, des SSD qui corrompent des données ou les perdent à la coupure de courant, un bogue de `fsync`, une réplication asynchrone qui perd les dernières écritures quand le leader tombe, une panne électrique qui frappe tout un datacenter. On combine plusieurs techniques (disque, réplicas, sauvegardes) et on garde un ordre de grandeur en tête : réduire le risque, jamais l'annuler.

## Mono-objet et multi-objets

### Écrire un seul objet

Même pour **une seule clé**, il faut de l'atomicité et de l'isolation. Imagine l'écriture d'un document JSON de 20 Ko : que se passe-t-il si le réseau coupe après 10 Ko ? Si le courant saute au milieu de l'écrasement de l'ancienne valeur ? Si un lecteur lit pendant l'écriture ? Quasiment tous les moteurs de stockage garantissent donc l'atomicité d'un objet (grâce au WAL) et son isolation (un verrou par objet).

Certaines bases ajoutent des opérations plus riches : un **incrément** atomique, qui évite le cycle lire-modifier-écrire, ou un **compare-and-set** (« n'écris que si la valeur n'a pas changé »). Elles sont très utiles (on les retrouve dans la leçon sur les mises à jour perdues), mais ce ne sont **pas** des transactions au sens habituel, qui regroupe **plusieurs** objets. Quand une base vend des « transactions légères » sur une seule clé, c'est de cela qu'il s'agit.

### Pourquoi plusieurs objets

Beaucoup de bases distribuées ont abandonné les transactions multi-objets, difficiles à implémenter à travers des partitions. Pourtant, on en a souvent besoin :

- **clés étrangères** : insérer un enregistrement qui en référence un autre (une commande et ses lignes) doit laisser les références valides ;
- **dénormalisation** dans une base de documents : un document `utilisateur` qui garde un compteur de messages non lus doit rester d'accord avec les messages eux-mêmes (on y revient au TP) ;
- **index secondaires** : chaque écriture modifie aussi les index ; sans transaction, une ligne peut apparaître dans un index et pas dans l'autre.

On peut s'en passer, mais l'application doit alors gérer elle-même les états à moitié faits, ce qui est bien plus difficile.

## Abandonner et réessayer

L'intérêt premier d'une transaction est qu'on peut l'**abandonner** et la **réessayer** sans risque. Les bases ACID suivent cette philosophie : en cas de doute, on abandonne plutôt que de laisser un état incohérent. (Les bases sans leader de la réplication font l'inverse : elles font « au mieux » et laissent l'application réparer.)

Réessayer n'est pourtant pas gratuit. Plusieurs pièges :

- **le commit a réussi, mais l'accusé est perdu** (le réseau coupe en retour) : le client croit à un échec, réessaie, et le virement passe **deux fois**. Il faut une déduplication applicative (une clé d'idempotence, comme pour les RPC du chapitre sur l'encodage) ;
- **la base est surchargée** : réessayer immédiatement aggrave le problème. On limite le nombre d'essais et on espace avec un **backoff exponentiel** (50 ms, puis 100, puis 200…) ;
- **l'erreur est permanente** (une contrainte violée) : réessayer ne sert à rien. On ne réessaie qu'après une erreur transitoire (interblocage, violation d'isolation, coupure réseau, bascule de leader) ;
- **la transaction a des effets de bord hors de la base** : un e-mail envoyé n'est pas annulé par un abort. Il faudrait un commit atomique entre systèmes (*two-phase commit*, au chapitre sur le consensus) ;
- **le client meurt pendant les essais** : ce qu'il voulait écrire est perdu.

Et beaucoup d'ORM (Rails ActiveRecord, Django) ne réessaient **pas** une transaction abandonnée : l'erreur remonte en exception jusqu'à l'utilisateur. Dommage, c'est précisément l'intérêt d'un abort.

## Pièges fréquents

- **Croire que « ACID » sur la plaquette veut dire « sérialisable »** : regarde le niveau d'isolation par défaut, il est presque toujours plus faible.
- **Compter sur la base pour la cohérence métier** : elle ne connaît que les contraintes que tu déclares.
- **Réessayer en boucle sans backoff ni limite** : tu transformes une surcharge passagère en panne.
- **Envoyer un e-mail ou appeler une API externe dans une transaction réessayée** : l'effet de bord se répète à chaque essai.
- **Confondre atomicité ACID et atomicité en programmation concurrente** : la seconde, c'est l'isolation.

## À retenir

- Une transaction transforme « des pannes au milieu » et « des accès concurrents » en deux issues simples : commit ou abort.
- A = abandon possible sans demi-écriture ; C = invariants de l'application ; I = isolation (idéal : sérialisable) ; D = ne pas perdre ce qui est validé.
- Une seule clé a besoin d'atomicité et d'isolation ; les transactions multi-objets servent aux clés étrangères, à la dénormalisation et aux index secondaires.
- Réessayer exige idempotence, backoff, tri entre erreurs transitoires et permanentes, et prudence avec les effets de bord.
