---
id: ddia-ch09-l02
title: Exécution en série et procédures stockées
source:
  chapter: 7
  pages: 252-256
duration_min: 40
concepts:
- id: ddia-serial-execution
  label: 'Exécuter une seule transaction à la fois, sur un seul thread : plus de conflits à détecter, isolation sérialisable par construction'
- id: ddia-why-serial-feasible
  label: 'Possible depuis ~2007 : RAM bon marché (données actives en mémoire) et transactions OLTP courtes ; les analyses vont sur un instantané'
- id: ddia-stored-procedures
  label: 'Procédures stockées : l''application soumet la transaction entière à l''avance, au lieu d''allers-retours interactifs'
- id: ddia-stored-proc-tradeoffs
  label: 'Procédures stockées : langages archaïques, code difficile à gérer, base sensible aux performances ; atténué par Java, Lua, Clojure'
- id: ddia-serial-partitioning
  label: 'Partitionner pour passer à l''échelle : un thread par partition ; les transactions inter-partitions sont bien plus lentes'
- id: ddia-serial-limits
  label: 'Limites : transactions courtes, données en mémoire, écriture limitée à un cœur ou transactions mono-partition'
glossary:
- term: procédure stockée
  definition: Le code d'une transaction soumis à la base à l'avance et exécuté sans aller-retour avec l'application.
- term: transaction interactive
  definition: Style où l'application envoie une instruction à la fois et attend la réponse.
- term: anti-caching
  definition: Annuler une transaction qui a besoin de données hors mémoire, les charger en tâche de fond, puis la relancer.
visuals: []
labs:
- ddia-ch09-l02-lab-serial-execution-design
- ddia-ch09-l02-lab-serial-architecture-design
extra: false
xp: 40
---

## Pourquoi c'est important

La façon la plus simple d'éviter les problèmes de concurrence est de **supprimer la concurrence** : ne traiter qu'une seule transaction à la fois, dans l'ordre, sur un seul thread. On contourne totalement la détection et la prévention des conflits : l'isolation obtenue est sérialisable **par définition**. Cela peut paraître évident, mais les concepteurs de bases n'ont décidé que vers 2007 qu'une boucle monothread d'exécution de transactions était viable. Si pendant trente ans la concurrence multi-thread a été jugée essentielle pour de bonnes performances, qu'est-ce qui a changé ?

## Deux évolutions

- la **RAM est devenue assez bon marché** pour garder tout le jeu de données actif en mémoire dans beaucoup de cas. Quand toutes les données dont a besoin une transaction sont en mémoire, elle s'exécute bien plus vite qu'en attendant des chargements depuis le disque ;
- les concepteurs ont compris que les **transactions OLTP sont généralement courtes** et ne font que peu de lectures et d'écritures. À l'inverse, les longues requêtes analytiques sont en lecture seule et peuvent s'exécuter sur un instantané cohérent, **hors de la boucle d'exécution en série**.

Cette approche est utilisée dans VoltDB/H-Store, Redis et Datomic. Un système conçu pour un seul thread peut parfois être **plus performant** qu'un système qui supporte la concurrence, car il évite le surcoût de coordination des verrous. En contrepartie, son débit est limité à celui d'**un seul cœur**. Pour en tirer le meilleur, les transactions doivent être structurées autrement que sous la forme traditionnelle.

## Transactions encapsulées dans des procédures stockées

Au début des bases de données, on voulait qu'une transaction englobe tout un parcours utilisateur : réserver un billet d'avion (recherche de trajets, tarifs, sièges, choix d'itinéraire, réservation, passagers, paiement) en une seule transaction validée atomiquement. Hélas, **les humains sont très lents** à se décider. Si une transaction doit attendre une saisie utilisateur, la base doit supporter un nombre potentiellement énorme de transactions concurrentes, dont la plupart sont inactives. Presque toutes les applications OLTP gardent donc leurs transactions courtes en **évitant d'attendre l'utilisateur** : sur le web, une transaction est validée dans la même requête HTTP.

Même ainsi, les transactions restent souvent exécutées de façon **interactive**, une instruction à la fois : l'application fait une requête, lit le résultat, en fait peut-être une autre selon le résultat, etc. Les requêtes et résultats font l'aller-retour entre le code applicatif et le serveur de base. Dans ce style, beaucoup de temps est perdu en communications réseau. Si on interdisait la concurrence et ne traitait qu'une transaction à la fois, le débit serait désastreux, la base passant son temps à attendre l'instruction suivante.

Les systèmes à exécution série monothread **n'autorisent donc pas les transactions interactives multi-instructions**. L'application doit soumettre **toute la transaction à l'avance, sous forme de procédure stockée**. Si toutes les données nécessaires sont en mémoire, la procédure s'exécute très vite, sans attendre ni réseau ni disque.


### Les procédures stockées, avantages et inconvénients

Elles existent depuis longtemps dans les bases relationnelles (norme SQL/PSM depuis 1999) mais ont mauvaise réputation :

- chaque éditeur a son langage (PL/SQL, T-SQL, PL/pgSQL…), qui n'a pas suivi les langages généralistes : archaïques et sans écosystème de bibliothèques ;
- du code dans la base est **difficile à gérer** : plus dur à déboguer, versionner, déployer, tester, superviser ;
- une base est souvent bien plus **sensible aux performances** qu'un serveur d'application, car elle est partagée par beaucoup de serveurs : une procédure mal écrite fait plus de dégâts.

Ces problèmes se dépassent. Les implémentations modernes abandonnent PL/SQL pour des langages généralistes : VoltDB utilise Java ou Groovy, Datomic Java ou Clojure, Redis Lua. VoltDB utilise aussi les procédures stockées pour la **réplication** : au lieu de copier les écritures d'un nœud à l'autre, il exécute la même procédure sur chaque réplica. Les procédures doivent donc être **déterministes** : si une transaction a besoin de la date et de l'heure, elle passe par une API déterministe spéciale.

## Partitionnement

Tout exécuter en série simplifie le contrôle de concurrence mais **limite le débit d'écriture à la vitesse d'un cœur** sur une machine. Les transactions en lecture seule peuvent s'exécuter ailleurs, sur un instantané, mais pour un fort débit d'écriture, le processeur monothread peut devenir un goulot sérieux.

Pour passer à l'échelle sur plusieurs cœurs et plusieurs nœuds, on **partitionne** (module 07), ce que supporte VoltDB. Si chaque transaction n'a besoin de lire et écrire que dans **une seule partition**, chaque partition a son propre thread de traitement indépendant. On peut donner à chaque cœur sa partition, et le débit croît linéairement avec le nombre de cœurs.

Mais une transaction qui touche **plusieurs partitions** doit être coordonnée entre toutes ces partitions, exécutée **en parallèle strict** pour garantir la sérialisabilité globale. Ce surcoût rend les transactions inter-partitions **beaucoup plus lentes** : VoltDB annonce environ **1 000 écritures inter-partitions par seconde**, plusieurs ordres de grandeur sous son débit mono-partition, et qu'ajouter des machines n'augmente pas. Le caractère mono-partition dépend beaucoup de la structure des données : un modèle clé-valeur simple se partitionne facilement, mais des données avec beaucoup d'index secondaires demanderont beaucoup de coordination inter-partitions.

## Les limites de l'exécution en série

- chaque transaction doit être **petite et rapide** : une seule lente bloque tout ;
- limité aux cas où le jeu de données actif **tient en mémoire**. Les données rarement lues peuvent aller sur disque, mais s'il faut les lire dans une transaction monothread, tout devient très lent. La parade est l'*anti-caching* : annuler la transaction, charger les données en tâche de fond pendant que d'autres transactions avancent, puis relancer ;
- le débit d'**écriture** doit être assez faible pour un seul cœur, ou il faut partitionner sans coordination inter-partitions ;
- les transactions inter-partitions sont possibles, mais **limitées strictement** dans leur usage.

## Pièges fréquents

- **Une transaction qui attend une saisie utilisateur** : elle bloquerait toute l'exécution série.
- **Une procédure non déterministe** (date, aléa) dans un système répliqué par procédures.
- **Croire que le partitionnement résout tout** : les transactions inter-partitions s'effondrent à ~1 000/s.
- **Un jeu de données qui dépasse la mémoire.**

## À retenir

- Exécution en série : un thread, pas de conflit, sérialisable par construction ; exige données en mémoire et transactions courtes.
- Transactions soumises en bloc, comme procédures stockées (Lua, Java…) ; pas d'aller-retour interactif.
- Partitionner donne un thread par partition ; les transactions inter-partitions coûtent très cher.
