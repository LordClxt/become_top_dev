---
id: ddia-ch14-l05
title: "Event sourcing, état et immuabilité"
source: { chapter: 11, pages: "457-464" }
duration_min: 40
concepts:
  - id: ddia-event-sourcing
    label: "Event sourcing : l'application enregistre des événements métier immuables dans un log en ajout seul, et en dérive son état"
  - id: ddia-commands-vs-events
    label: "Une commande peut encore être refusée ; une fois validée, elle devient un événement, un fait que plus personne ne rejette"
  - id: ddia-state-integral-of-events
    label: "L'état est l'intégrale du flux d'événements, le flux est la dérivée de l'état : la vérité est le log, la base en est un cache"
  - id: ddia-immutable-events-benefits
    label: "Un log immuable se vérifie, se répare après un bug et garde plus d'information que l'état courant, comme un livre de comptes"
  - id: ddia-cqrs-multiple-views
    label: "Séparer la forme écrite de la forme lue (CQRS) permet de dériver plusieurs vues d'un même log et d'en ajouter sans migration"
  - id: ddia-event-log-concurrency
    label: "Vues asynchrones : lire ses propres écritures est délicat ; mais un événement autonome et un consommateur par partition simplifient la concurrence"
  - id: ddia-immutability-limits
    label: "Limites de l'immuabilité : historique trop volumineux sous forte rotation, et données qu'il faut vraiment effacer (vie privée, obligations légales)"
glossary:
  - term: "event sourcing"
    definition: "Approche issue du domain-driven design : tous les changements de l'état de l'application sont stockés comme un log d'événements métier immuables."
  - term: "event store"
    definition: "Le log en ajout seul d'une application en event sourcing ; mises à jour et suppressions y sont découragées ou interdites."
  - term: "commande"
    definition: "Requête d'un utilisateur, pas encore validée, qui peut échouer (nom déjà pris, siège déjà réservé)."
  - term: "CQRS (command query responsibility segregation)"
    definition: "Séparer la forme sous laquelle les données sont écrites de celles, optimisées pour la lecture, sous lesquelles elles sont lues."
  - term: "transaction compensatoire"
    definition: "Écriture qui corrige une erreur passée en ajoutant une nouvelle entrée, sans effacer l'ancienne."
  - term: "excision / shunning"
    definition: "Mécanismes de Datomic et de Fossil pour effacer réellement une donnée d'un historique immuable."
visuals: []
labs: [ddia-ch14-l05-lab-eventsourcing-design]
xp: 40
---

## Pourquoi c'est important

La CDC (leçon 4) part d'une base **mutable** et en extrait un flux. L'**event sourcing** prend le problème à l'envers : on écrit d'abord le flux, et l'état n'en est qu'une conséquence. Cette inversion change la façon de concevoir une application : on la débogue en rejouant son histoire, on lui ajoute des fonctions sans migration, et l'on simplifie certaines transactions. Elle a aussi des coûts réels (lire ses propres écritures, effacer des données personnelles) qu'il faut connaître avant de l'adopter.

## L'event sourcing

L'idée vient de la communauté du *domain-driven design*. Comme la CDC, elle stocke tous les changements de l'état sous forme de log d'événements. La différence est le **niveau d'abstraction** :

- en **CDC**, l'application utilise la base de façon mutable (elle met à jour, elle supprime) ; le log des changements est extrait **à bas niveau**, du log de réplication, et l'application n'a pas besoin de savoir que la CDC existe ;
- en **event sourcing**, la logique de l'application est **construite** sur des événements immuables, écrits dans un **event store** en ajout seul, où mises à jour et suppressions sont découragées ou interdites. Et ces événements décrivent ce qui s'est passé **au niveau métier**, pas des changements d'état.

Exemple. « L'étudiant 17 a annulé son inscription au cours de chimie » exprime clairement l'**intention** d'une action. Ses effets de bord, « une ligne supprimée de la table `enrollments`, une raison d'annulation ajoutée à la table `feedback` », mêlent cette intention à des choix de schéma qui changeront. Et si demain on veut proposer la place libérée au premier de la liste d'attente, il suffit d'ajouter un consommateur de l'événement « inscription annulée ».

On retrouve cette idée dans le modèle de données *chronique* et dans les tables de faits d'un schéma en étoile (module « Analytique et stockage en colonnes »). Il existe des bases spécialisées (Event Store), mais une base classique ou un broker à base de log font aussi l'affaire.

## Dériver l'état courant

Un utilisateur ne veut pas lire un historique : il veut voir **l'état courant** (le contenu de son panier, son solde). L'application transforme donc le log en un état affichable, de façon **déterministe**, pour pouvoir recommencer et retrouver le même résultat.

Différence importante avec la CDC : la **compaction** ne marche plus. Un événement CDC de mise à jour contient toute la nouvelle version de l'enregistrement, donc le dernier par clé suffit. Un événement métier décrit une **action** : « 50 € déposés », puis « 20 € retirés ». Le second ne remplace pas le premier ; il faut **tout l'historique** pour calculer le solde. On stocke souvent des **instantanés** de l'état dérivé pour ne pas tout rejouer à chaque démarrage, mais c'est une optimisation : le système doit pouvoir garder tous les événements bruts et tout retraiter.

## Commandes et événements

Il faut distinguer **commande** et **événement**. La requête d'un utilisateur arrive comme une **commande** : elle peut encore échouer. « Réserver le siège 12C » échoue si le siège est pris ; « choisir le nom `ada` » échoue s'il est déjà utilisé. L'application **valide** la commande. Si elle est acceptée, elle devient un **événement**, durable et immuable : « siège 12C réservé par le client 42 », « nom `ada` enregistré pour l'utilisateur 9 ».

Un événement est un **fait**. Si le client annule plus tard sa réservation, le fait qu'il l'ait tenue reste vrai ; l'annulation est un **nouvel** événement. Et un consommateur du flux **ne peut pas rejeter** un événement : quand il le voit, l'événement fait déjà partie du log, et d'autres l'ont peut-être déjà lu.

Conséquence : la validation doit avoir lieu **avant** que la commande devienne un événement, de façon **synchrone**, par exemple dans une transaction sérialisable qui vérifie la commande et publie l'événement de façon atomique. Autre possibilité : découper en deux événements, une **réservation provisoire**, puis une **confirmation** séparée une fois la validation faite de façon asynchrone (on verra dans le module « Linéarisabilité et ordre » comment un ordre total le permet).

## État, flux et immuabilité

L'immuabilité fait déjà fonctionner le traitement par lots ; elle fait aussi fonctionner la CDC et l'event sourcing. Un état mutable et un log d'événements immuables ne s'opposent pas : ce sont **les deux faces** d'une même chose. Le log de tous les changements représente l'évolution de l'état dans le temps. Formellement, l'état courant est l'**intégrale** du flux d'événements dans le temps, et le flux est la **dérivée** de l'état par rapport au temps. Pat Helland le résume : la vérité, c'est le log ; la base de données est un cache d'un sous-ensemble du log. La compaction de log fait le pont entre les deux en ne gardant que la dernière version de chaque clé.

### Les avantages des événements immuables

Les comptables le savent depuis des siècles. Un livre de comptes est en **ajout seul** : une erreur ne s'efface pas, elle se corrige par une **transaction compensatoire**. Le bilan se **dérive** en additionnant les écritures. Cette **auditabilité** compte en finance, mais pas seulement : si un code bogué écrase des données en place, réparer est très difficile ; avec un log immuable, on retrouve ce qui s'est passé et l'on reconstruit.

Un log garde aussi **plus d'information** que l'état. Un client ajoute un article au panier puis le retire. L'état final est le même que s'il ne l'avait jamais ajouté, mais pour l'analytique, il a **hésité** sur ce produit et en a peut-être acheté un autre. Une base qui supprime la ligne du panier perd cette information.

### Plusieurs vues à partir du même log

Séparer l'état mutable du log immuable permet de dériver **plusieurs vues** de lecture à partir des mêmes événements, comme plusieurs consommateurs d'un même flux : Druid ingère directement depuis Kafka, Pistachio utilise Kafka comme log de commits, les connecteurs de Kafka Connect exportent vers des bases et des index variés.

Une étape de traduction explicite entre le log et la base facilite l'**évolution** : pour une nouvelle fonction qui présente les données autrement, on construit une **nouvelle vue** à partir du log, on la fait tourner à côté de l'existant, et l'on retire l'ancienne quand elle ne sert plus. C'est souvent bien plus simple qu'une migration de schéma en place.

Stocker est facile si l'on ne se soucie pas de la façon de lire ; toute la complexité des schémas et des index vient des requêtes à servir. Séparer la forme **écrite** des formes **lues** s'appelle **CQRS** (*command query responsibility segregation*). Le débat normaliser ou dénormaliser perd alors beaucoup de son sens : on dénormalise librement les vues, puisque le processus de traduction les garde cohérentes. La timeline de Twitter (module « Fiabilité, charge et percentiles ») est exactement une vue de lecture fortement dénormalisée.

## Le contrôle de concurrence

Le plus gros inconvénient de l'event sourcing et de la CDC : les consommateurs sont **asynchrones**. Un utilisateur écrit dans le log, recharge la page, et la vue ne montre pas encore son écriture : c'est le problème de « lire ses propres écritures » du module « Réplication avec leader ». Une solution : mettre à jour la vue de façon **synchrone** avec l'ajout au log, dans une même transaction, ce qui suppose de garder log et vue dans le même système de stockage, ou une transaction distribuée, ou un ordre total.

À l'inverse, dériver l'état d'un log **simplifie** la concurrence. Beaucoup de transactions multi-objets existent parce qu'une seule action utilisateur modifie plusieurs endroits. En event sourcing, on conçoit un événement qui décrit **toute** l'action : une seule écriture, l'ajout au log, facile à rendre atomique. Et si le log et l'état sont partitionnés de la même façon (le client de la partition 3 ne touche que la partition 3 de l'état), un consommateur **mono-thread** par partition suffit, sans aucun contrôle de concurrence pour les écritures : c'est l'exécution en série du module « Sérialisabilité ». Le log retire le non-déterminisme de la concurrence en fixant un ordre. Si un événement touche plusieurs partitions, il faut davantage de travail (module « Correction et éthique »).

## Les limites de l'immuabilité

Beaucoup de systèmes s'appuient sur l'immuabilité sans faire d'event sourcing : les bases à structures immuables ou multiversion (MVCC) pour les snapshots, Git, Mercurial ou Fossil pour le code. Mais peut-on tout garder pour toujours ?

Cela dépend de la **rotation** des données. Une charge qui ajoute surtout des données se prête bien à l'immuabilité. Une charge qui met à jour et supprime sans cesse un petit jeu de données fait grossir l'historique bien plus que l'état : 1 million de comptes mis à jour 50 fois par jour, c'est 18 milliards d'événements par an pour 1 million de lignes vivantes. La fragmentation, la compaction et le ramasse-miettes deviennent alors critiques.

Il y a aussi des données qu'il **faut** effacer : les données personnelles d'un utilisateur qui ferme son compte (RGPD), une information erronée que la loi oblige à retirer, une donnée sensible publiée par erreur. Ajouter un événement « donnée supprimée » ne suffit pas : on veut **réécrire l'histoire** comme si la donnée n'avait jamais existé. Datomic appelle cela l'**excision**, Fossil le **shunning**. Et vraiment supprimer est difficile : des copies traînent dans les moteurs de stockage, les systèmes de fichiers et les SSD qui écrivent ailleurs plutôt que d'écraser, et les sauvegardes, immuables exprès. Supprimer, c'est souvent **rendre plus difficile** l'accès à la donnée, pas le rendre impossible.

## Pièges fréquents

- **Publier un événement avant d'avoir validé la commande** : un consommateur ne peut pas le rejeter, et un siège se retrouve vendu deux fois.
- **Compacter un event store** : les événements métier ne s'écrasent pas, garder le dernier par clé détruit l'état.
- **Afficher la vue juste après l'écriture sans précaution** : l'utilisateur ne voit pas son action ; prévois une lecture de ses propres écritures.
- **Mettre des données personnelles en clair dans des événements immuables** sans plan d'effacement.
- **Nommer les événements comme des changements de table** (« ligne mise à jour ») au lieu de faits métier : on perd l'intention.

## À retenir

- Event sourcing : des faits métier immuables en ajout seul ; l'état en est dérivé de façon déterministe.
- Commande validée de façon synchrone, puis événement ; un événement ne se rejette plus.
- L'état est l'intégrale des événements ; la vérité est le log, la base en est un cache.
- Un log immuable s'audite, se répare et nourrit plusieurs vues (CQRS), ajoutées ou retirées sans migration.
- Vues asynchrones : attention à la lecture de ses propres écritures ; mais un événement par action et un consommateur par partition simplifient la concurrence.
- L'immuabilité coûte sous forte rotation et se heurte au besoin d'effacer vraiment.
