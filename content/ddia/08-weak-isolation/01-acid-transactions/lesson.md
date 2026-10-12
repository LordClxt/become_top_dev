---
id: ddia-ch08-l01
title: Qu'est-ce qu'une transaction ? ACID, objets multiples, reprises
source:
  chapter: 7
  pages: 221-232
duration_min: 40
concepts:
- id: ddia-transaction
  label: 'Une transaction groupe plusieurs lectures et écritures en une unité : tout réussit (commit) ou tout est annulé (abort), et on peut réessayer'
- id: ddia-acid-meaning
  label: 'ACID est surtout un terme commercial : atomicité, cohérence, isolation et durabilité n''ont pas le même sens d''une base à l''autre'
- id: ddia-atomicity
  label: 'Atomicité (ACID) : tout ou rien en cas de panne en cours de route, pas de la concurrence ; « abortabilité »'
- id: ddia-acid-consistency
  label: 'Cohérence (ACID) : les invariants de l''application restent vrais ; c''est une propriété de l''application, pas de la base'
- id: ddia-isolation-def
  label: 'Isolation : chaque transaction fait comme si elle était seule ; la forme idéale (sérialisable) est rarement utilisée'
- id: ddia-durability
  label: 'Durabilité : une transaction validée n''est pas oubliée ; aucune technique unique ne la garantit absolument'
- id: ddia-multi-object
  label: 'Transactions multi-objets : nécessaires pour clés étrangères, dénormalisation et index secondaires'
- id: ddia-retry
  label: 'Réessayer après un abort : seulement après erreur transitoire, avec limite et recul, en veillant aux effets de bord'
glossary:
- term: transaction
  definition: 'Groupe de lectures et d''écritures exécuté comme une seule opération : tout est validé (commit) ou tout est annulé (abort, rollback).'
- term: ACID
  definition: 'Atomicité, Cohérence, Isolation, Durabilité : sigle de 1983 qui décrit les garanties d''une transaction.'
- term: BASE
  definition: 'Basically Available, Soft state, Eventual consistency : un sigle plus vague encore, qui veut dire « pas ACID ».'
- term: dirty read (lecture sale)
  definition: Lire une donnée écrite par une transaction pas encore validée.
- term: invariant
  definition: Une affirmation sur les données qui doit toujours être vraie (débits et crédits équilibrés).
visuals: []
labs:
- ddia-ch08-l01-lab-acid-design
extra: false
xp: 40
---

## Pourquoi c'est important

Dans la réalité d'un système de données, beaucoup de choses peuvent mal tourner : le logiciel ou le matériel de la base peut tomber à tout moment (même au milieu d'une écriture), l'application peut planter à mi-chemin d'une série d'opérations, le réseau peut couper l'application de la base, plusieurs clients peuvent écrire en même temps et s'écraser mutuellement, un client peut lire des données qui n'ont pas de sens parce qu'elles ne sont qu'à moitié mises à jour, des conditions de course créent des bugs surprenants. Pour être fiable, un système doit gérer ces fautes. Mais implémenter la tolérance aux fautes, c'est beaucoup de travail et de tests.

Depuis des décennies, la **transaction** est le mécanisme privilégié pour simplifier tout cela. C'est une manière pour l'application de **grouper plusieurs lectures et écritures en une unité logique**. Conceptuellement, tout se passe comme une seule opération : soit la transaction entière réussit (**commit**), soit elle échoue (**abort**, *rollback*). En cas d'échec, l'application peut **réessayer sans risque**. La gestion d'erreur devient bien plus simple : plus de **panne partielle** à gérer (certaines opérations réussies et d'autres non).

Les transactions ne sont pas une loi de la nature : elles ont été créées dans un but, **simplifier le modèle de programmation** des applications. Toutes les applications n'en ont pas besoin, et parfois on gagne à les affaiblir ou à les abandonner (performance, disponibilité). Pour décider, il faut comprendre ce qu'elles garantissent exactement et ce qu'elles coûtent.

## Un concept glissant

La plupart des bases relationnelles et certaines bases non relationnelles suivent le style introduit en 1975 par IBM System R. À la fin des années 2000, les bases NoSQL ont voulu faire mieux (nouveaux modèles de données, réplication et partitionnement par défaut), et **les transactions en ont été la principale victime** : beaucoup ont abandonné les transactions, ou redéfini le mot pour décrire des garanties bien plus faibles. La croyance s'est répandue que les transactions étaient l'antithèse de la scalabilité. À l'inverse, des éditeurs les présentent comme indispensables aux « applications sérieuses ». **Les deux points de vue sont de l'hyperbole** : comme tout choix technique, les transactions ont des avantages et des limites.

## Le sens d'ACID

Les garanties d'une transaction se résument par le sigle **ACID**, de Härder et Reuter (1983) : Atomicité, Cohérence (*Consistency*), Isolation, Durabilité. En pratique, **l'implémentation d'ACID d'une base n'équivaut pas à celle d'une autre** : beaucoup d'ambiguïté, notamment sur l'isolation. Quand un système se dit « conforme ACID », on ne sait pas quelles garanties attendre. ACID est devenu surtout un **terme marketing**. (Les systèmes qui n'y répondent pas sont parfois dits BASE, encore plus vague : « pas ACID ».)

### Atomicité

En général, *atomique* désigne ce qui ne peut être décomposé. En programmation multi-thread, une opération atomique ne peut pas être vue à moitié faite par un autre thread. **Dans ACID, l'atomicité n'a rien à voir avec la concurrence** (c'est le rôle de l'isolation). Elle décrit ce qui se passe si un client veut faire plusieurs écritures et qu'**une faute survient après certaines d'entre elles** : plantage, réseau coupé, disque plein, contrainte d'intégrité violée. Si les écritures sont groupées dans une transaction qui ne peut pas être validée à cause d'une faute, la transaction est **annulée** et la base doit **défaire** toutes ses écritures. Sans atomicité, après une erreur au milieu, il est difficile de savoir quels changements ont pris effet, et réessayer risque de faire deux fois le même changement. Avec elle, une transaction annulée n'a **rien changé** : on peut réessayer. « Abortabilité » aurait été un meilleur nom.

### Cohérence

Le mot est surchargé : cohérence des réplicas (module 05), *consistent hashing* (module 07), « C » du théorème CAP (linéarisabilité, module 11), et enfin la cohérence d'ACID : une notion **propre à l'application** d'une base dans un « bon état ». Ce sont des **invariants** qui doivent toujours être vrais (en comptabilité, débits et crédits équilibrés). Si une transaction commence sur une base valide et que ses écritures préservent la validité, les invariants sont toujours satisfaits. Mais la base ne peut pas le garantir : si tu écris des données qui violent tes invariants, elle ne t'arrête pas (sauf contraintes simples : clés étrangères, unicité). **L'atomicité, l'isolation et la durabilité sont des propriétés de la base, la cohérence (au sens ACID) est une propriété de l'application.** Le C n'a pas vraiment sa place dans ACID (il aurait été « ajouté pour que le sigle marche »).

### Isolation

Plusieurs clients accèdent à la base en même temps. Pas de problème s'ils touchent des parties différentes, mais sur les mêmes enregistrements apparaissent des **conditions de course**. Exemple : deux clients incrémentent un compteur en lisant sa valeur, ajoutant 1 et réécrivant. Le compteur devait passer de 42 à 44 mais ne passe qu'à 43. L'**isolation** signifie que les transactions concurrentes sont isolées : elles ne se marchent pas sur les pieds. Les manuels la formalisent comme la **sérialisabilité** : chaque transaction peut faire comme si elle était seule sur la base ; le résultat est le même que si elles s'étaient exécutées l'une après l'autre. Mais en pratique, elle est rarement utilisée à cause de son coût en performance. Oracle 11g ne l'implémente même pas : son niveau « serializable » est en fait de l'**isolation par instantané**, plus faible.

### Durabilité

Promesse qu'une fois une transaction validée, les données écrites ne seront pas oubliées, même en cas de panne matérielle ou de plantage. Sur un nœud : écriture sur un support non volatil (disque, SSD), avec un journal d'écriture anticipée (module 02) pour la reprise. En base répliquée : copie sur un certain nombre de nœuds ; la base doit attendre la fin de ces écritures ou répliquages avant de déclarer la validation. La **durabilité parfaite n'existe pas** : si tous les disques et sauvegardes sont détruits en même temps, la base ne peut rien. Historiquement, durabilité voulait dire écrire sur bande, puis sur disque, puis répliquer : aucune technique n'est parfaite (disque mort mais données inaccessibles, panne corrélée, perte asynchrone, SSD qui violent `fsync`, corruption silencieuse...). Il n'y a que des **techniques de réduction du risque**, à combiner : disque, réplication, sauvegardes.

## Opérations sur un ou plusieurs objets

L'atomicité et l'isolation supposent de modifier **plusieurs objets** (lignes, documents) à la fois. Exemple d'une messagerie : pour afficher le nombre de messages non lus, on garde un compteur séparé (dénormalisation). À chaque nouveau message, il faut aussi incrémenter le compteur. Sans isolation, l'utilisateur 2 voit un message non lu dans sa boîte alors que le compteur affiche zéro, car l'incrément n'a pas eu lieu (une **lecture sale**). Sans atomicité, si la mise à jour du compteur échoue, boîte et compteur divergent.

Les bases relationnelles repèrent les opérations d'une même transaction par la **connexion TCP** : tout ce qui se trouve entre `BEGIN TRANSACTION` et `COMMIT` appartient à la même transaction. Beaucoup de bases non relationnelles n'ont rien de tel : un `multi-put` peut réussir pour certaines clés et échouer pour d'autres, laissant la base à moitié mise à jour.

### Écritures sur un seul objet

Atomicité et isolation s'appliquent aussi à un seul objet : écrire un document JSON de 20 Ko, est-ce que la base stocke un fragment de 10 Ko si le réseau coupe ? Un mélange d'ancien et de nouveau si le courant saute ? Un lecteur voit-il une valeur à moitié écrite ? Les moteurs de stockage visent presque tous l'atomicité et l'isolation **au niveau d'un objet sur un nœud** (journal pour la reprise, verrou sur chaque objet). Certaines bases ajoutent des opérations atomiques comme l'**incrément** ou le **compare-and-set**. On les a appelées « transactions légères » pour le marketing, mais ce n'est pas le sens usuel : une transaction groupe plusieurs opérations sur plusieurs objets.

### Pourquoi des transactions multi-objets ?

Beaucoup de bases distribuées les ont abandonnées (difficiles entre partitions, gênantes pour la disponibilité), mais rien n'empêche fondamentalement les transactions distribuées (module 12). Peut-on s'en passer avec un modèle clé-valeur et des opérations sur un objet ? Parfois. Mais souvent il faut coordonner plusieurs objets : **clés étrangères** (les références doivent rester valides), **dénormalisation** dans les bases de documents (plusieurs documents à mettre à jour d'un coup), **index secondaires** (sans isolation, un enregistrement pourrait apparaître dans un index et pas dans un autre). On peut s'en passer, mais la gestion d'erreur devient bien plus compliquée sans atomicité.

## Gérer les erreurs et les aborts

La transaction peut être annulée et **réessayée sans risque** : c'est la philosophie d'ACID. Mais les bases sans leader fonctionnent plutôt « au mieux » : elles ne défont pas ce qui est déjà fait, c'est à l'application de récupérer. Beaucoup de frameworks ORM (ActiveRecord de Rails, Django) **ne réessaient pas** une transaction annulée : l'exception remonte et la saisie de l'utilisateur est perdue, dommage. Réessayer n'est pas parfait :

- si la transaction a réussi mais que le réseau a échoué en renvoyant la confirmation, **réessayer l'exécute deux fois**, sauf mécanisme de déduplication applicatif ;
- si l'erreur vient d'une **surcharge**, réessayer l'aggrave : limiter le nombre d'essais, utiliser un **recul exponentiel**, traiter les surcharges autrement ;
- il ne vaut la peine de réessayer qu'après des erreurs **transitoires** (interblocage, violation d'isolation, coupure réseau temporaire, failover), pas après une erreur permanente (violation de contrainte) ;
- les **effets de bord hors de la base** (envoyer un e-mail) peuvent se produire même si la transaction est annulée ; la validation en deux phases (module 12) peut aider ;
- si le client plante pendant la reprise, les données qu'il écrivait sont perdues.


## Pièges fréquents

- **Croire qu'« ACID » garantit la même chose partout** : demander quel niveau d'isolation exactement.
- **Mélanger atomicité ACID et atomicité des threads** : la première est l'abortabilité, la seconde l'indivisibilité vis-à-vis de la concurrence.
- **Compter sur la base pour la cohérence** : les invariants sont ceux de ton application.
- **Réessayer sans limite après une surcharge**, ou sans clé d'idempotence.

## À retenir

- Une transaction groupe des opérations : tout ou rien, réessayable.
- A (abortabilité), I (isolation), D (durabilité) sont à la charge de la base ; C (invariants) est à la charge de l'application.
- La sérialisabilité est l'idéal d'isolation mais est rarement utilisée ; on utilise des niveaux plus faibles.
- On ne réessaie qu'après une erreur transitoire, avec recul et déduplication.
