---
id: ddia-ch09-l01
title: "Exécuter vraiment en série"
source: { chapter: 7, pages: "251-254" }
duration_min: 35
concepts:
  - id: ddia-serializable-one-at-a-time
    label: "Sérialisable : le résultat est celui d'une exécution des transactions une par une, dans un certain ordre"
  - id: ddia-serial-exec-single-thread
    label: "Exécution réellement en série : une seule transaction à la fois, sur un seul thread, sans aucun verrou"
  - id: ddia-serial-exec-why-now
    label: "Pourquoi c'est devenu viable vers 2007 : données actives en mémoire et transactions OLTP courtes"
  - id: ddia-interactive-tx-roundtrips
    label: "Une transaction interactive passe l'essentiel de son temps à attendre le réseau et l'application"
  - id: ddia-stored-procedure-tx
    label: "La transaction entière est envoyée d'avance sous forme de procédure stockée"
  - id: ddia-stored-procedure-tradeoffs
    label: "Procédures stockées : langages vieillots, code difficile à tester et versionner, risque pour une base partagée ; langages modernes aujourd'hui"
  - id: ddia-deterministic-procedure-replication
    label: "Répliquer en ré-exécutant la même procédure sur chaque réplica, à condition qu'elle soit déterministe"
glossary:
  - term: "sérialisabilité (serializable isolation)"
    definition: "Niveau d'isolation le plus fort : même si les transactions s'exécutent en parallèle, le résultat est le même que si elles s'étaient exécutées l'une après l'autre, sans concurrence."
  - term: "exécution en série (actual serial execution)"
    definition: "Supprimer la concurrence : un seul thread exécute les transactions une à une, dans l'ordre."
  - term: "transaction interactive"
    definition: "Transaction dont l'application envoie les requêtes une par une, en attendant chaque réponse avant de décider de la suivante."
  - term: "procédure stockée (stored procedure)"
    definition: "Code applicatif enregistré dans la base et exécuté par elle ; l'application ne fait qu'appeler la procédure avec des paramètres."
  - term: "OLTP"
    definition: "Traitement transactionnel en ligne : beaucoup de petites transactions qui lisent et écrivent peu de lignes chacune (voir le chapitre sur l'analytique)."
visuals: []
labs: [ddia-ch09-l01-lab-serial-budget]
xp: 40
---

## Pourquoi c'est important

Le chapitre précédent a montré que les niveaux d'isolation faibles (read committed, snapshot isolation) laissent passer des anomalies sournoises : mises à jour perdues, *write skew*, fantômes. Deux médecins de garde qui se retirent en même temps, deux réservations de la même salle : chaque transaction est correcte seule, mais leur combinaison viole une règle métier. La seule garantie qui écarte **toutes** ces anomalies, c'est la **sérialisabilité** : le résultat doit être celui d'une exécution des transactions **une par une**, dans un certain ordre, même si en réalité elles ont tourné en parallèle.

Ce chapitre présente les trois techniques par lesquelles les bases implémentent cette garantie : l'exécution réellement en série, le verrouillage à deux phases, et la sérialisabilité par snapshot. Chacune a un coût différent ; savoir lequel, c'est savoir quelle base choisir pour une charge donnée.

## L'idée la plus simple : supprimer la concurrence

Si les anomalies viennent de la concurrence, pourquoi ne pas la retirer ? Une base à **exécution en série** n'a qu'**un seul thread** qui prend les transactions une à une, chacune allant jusqu'au bout avant que la suivante commence. Aucun conflit à détecter, aucun verrou à prendre : la sérialisabilité est obtenue **par construction**.

L'idée paraît évidente, mais pendant 30 ans on l'a jugée irréaliste : la concurrence semblait indispensable aux performances. Elle n'est réellement entrée dans les bases vers **2007**, avec VoltDB/H-Store, Redis et Datomic. Deux évolutions l'ont rendue viable :

1. **La RAM est devenue assez bon marché** pour qu'on garde tout le jeu de données **actif** en mémoire. Une transaction qui ne touche jamais le disque s'exécute en microsecondes au lieu de millisecondes.
2. **Les transactions OLTP sont courtes** et ne lisent ou n'écrivent qu'une poignée de lignes. Les longues requêtes analytiques, elles, sont en lecture seule : on peut les faire tourner **à part**, sur un snapshot cohérent (le MVCC du chapitre précédent), hors de la boucle en série.

Un ordre de grandeur pour fixer les idées : si une transaction en mémoire prend **20 µs**, un thread en exécute **50 000 par seconde**. C'est beaucoup, mais c'est un **plafond** : le débit est limité à **un cœur de CPU**. Paradoxalement, un tel système peut même battre une base concurrente, parce qu'il économise tout le coût de la coordination (prendre, relâcher et vérifier des verrous).

## Le problème des transactions interactives

Voici le piège. Dans une application web classique, une transaction ressemble à ceci : l'application lit une ligne, réfléchit, envoie une mise à jour, en lit une autre, puis valide. C'est une **transaction interactive** : chaque requête fait un aller-retour réseau entre l'application et la base, et l'application peut même attendre une entrée de l'utilisateur.

Avec un seul thread, c'est catastrophique. Prenons un virement qui fait **4 requêtes**, avec **0,5 ms** d'aller-retour réseau chacune et 20 µs de travail réel dans la base. La transaction occupe le thread environ **2,02 ms**, dont **99 %** à attendre. Le débit tombe à environ **495 transactions par seconde**, au lieu de 50 000. Une base concurrente peut faire travailler une autre transaction pendant l'attente ; une base mono-thread, non.

C'est pourquoi les systèmes à exécution en série **interdisent les transactions interactives** multi-requêtes.

## La solution : la procédure stockée

L'application envoie **toute la transaction d'avance** sous forme de **procédure stockée** : un morceau de code que la base exécute en entier, sans attendre aucune entrée réseau ni disque. L'application ne fait plus qu'**un** appel avec des paramètres.

```lua
-- Redis : réserver une place seulement s'il en reste (script Lua exécuté d'un bloc)
local left = tonumber(redis.call('GET', KEYS[1]) or '0')
if left <= 0 then
  return 0
end
redis.call('DECR', KEYS[1])
redis.call('SADD', KEYS[2], ARGV[1])
return 1
```

Lire, décider, écrire : tout se passe à l'intérieur de la base, d'une traite. Aucun autre script ne peut s'intercaler entre le `GET` et le `DECR`, donc le contrôle « s'il en reste » ne peut pas devenir faux en cours de route.

## Les procédures stockées, mal aimées

Les procédures stockées existent depuis 1999 dans le standard SQL, et elles ont mauvaise réputation, pour des raisons sérieuses :

- **Un langage par éditeur** : PL/SQL chez Oracle, T-SQL chez SQL Server, PL/pgSQL chez PostgreSQL. Ces langages ont peu évolué, semblent laids et archaïques, et n'ont pas l'écosystème de bibliothèques d'un langage généraliste.
- **Le code dans la base est pénible à gérer** : plus difficile à déboguer, à mettre sous contrôle de version, à déployer, à tester et à superviser que le code d'un serveur d'application.
- **La base est une ressource partagée et sensible** : une procédure mal écrite (une boucle trop longue, beaucoup de mémoire) pénalise **tout le monde**, alors qu'un serveur d'application lent n'affecte que lui-même et se remplace facilement.

Les systèmes modernes ont levé une partie de ces objections en adoptant des **langages généralistes** : Java ou Groovy pour VoltDB, Java ou Clojure pour Datomic, **Lua** pour Redis. Mais la discipline reste : une procédure doit être **courte**, car pendant qu'elle tourne, rien d'autre ne tourne.

## Répliquer en rejouant la procédure

Les procédures stockées offrent un bonus pour la réplication (chapitre sur la réplication) : au lieu d'envoyer aux réplicas les lignes modifiées, VoltDB **ré-exécute la même procédure** sur chaque réplica. Si toutes reçoivent les mêmes appels dans le même ordre, elles aboutissent au même état.

La condition est stricte : la procédure doit être **déterministe**. Elle doit produire le même résultat sur chaque nœud. Lire l'heure système, tirer un nombre aléatoire ou dépendre de l'ordre d'itération d'une table de hachage donnerait des états différents. D'où des API dédiées, par exemple pour obtenir la date et l'heure de la transaction, fixées une fois et transmises à tous les réplicas.

C'est la même idée que la réplication par instructions vue plus tôt, mais rendue sûre : la base **impose** le déterminisme au lieu d'espérer que chaque requête le soit.

## Pièges fréquents

- **Garder des transactions interactives sur une base mono-thread** : le thread passe son temps à attendre le réseau ; le débit s'effondre de plusieurs ordres de grandeur.
- **Écrire une procédure longue** (parcours de millions de lignes, appel à un service externe) : elle bloque toutes les autres transactions pendant toute sa durée.
- **Utiliser `now()` ou `random()` dans une procédure répliquée par ré-exécution** : les réplicas divergent silencieusement.
- **Croire que mono-thread veut dire lent** : sans verrous ni coordination, un thread en mémoire peut dépasser une base concurrente, tant qu'un cœur suffit.

## À retenir

- Sérialisable = même résultat qu'une exécution une par une ; c'est la seule isolation qui exclut toutes les anomalies du chapitre précédent.
- L'exécution en série supprime la concurrence : un thread, aucune coordination, sérialisabilité par construction.
- Elle est viable depuis ~2007 grâce aux données actives en mémoire et aux transactions OLTP courtes ; l'analytique lit un snapshot à part.
- Elle exige des **procédures stockées** : toute la transaction part d'un coup, sans aller-retour.
- Rejouer une procédure sur les réplicas fonctionne si elle est **déterministe**.
