---
id: go-ch10-l01
title: 'Concurrence et parallélisme : quand s''en servir'
source:
  chapter: 12
  pages: 311-316
duration_min: 30
concepts:
- id: go-concurrency-vs-parallelism
  label: Concurrence (structurer des tâches indépendantes) contre parallélisme (les exécuter au même instant sur plusieurs cœurs)
- id: go-when-concurrency
  label: La concurrence aide quand des tâches indépendantes attendent (réseau, disque) ; elle ne sert à rien si chaque étape dépend de la précédente
- id: go-amdahl
  label: 'Loi d''Amdahl : la part séquentielle borne le gain, quel que soit le nombre de cœurs'
- id: go-measure-first
  label: Écrire d'abord du code séquentiel correct, mesurer, puis introduire la concurrence là où elle rapporte
glossary:
- term: concurrence
  definition: Façon de structurer un programme en tâches indépendantes qui peuvent progresser sans s'attendre.
- term: parallélisme
  definition: Exécution de plusieurs tâches au même instant, sur plusieurs cœurs.
- term: loi d'Amdahl
  definition: Le gain de vitesse maximal est 1 / ((1 − p) + p / n) pour une fraction parallélisable p sur n cœurs.
- term: tâche liée aux E/S
  definition: Tâche qui passe l'essentiel de son temps à attendre le réseau ou le disque.
visuals:
- go-ch10-concurrency-vs-parallelism
- go-ch10-amdahl
labs:
- go-ch10-l01-lab-speedup-math
xp: 30
---

## Pourquoi c'est important

La concurrence est la fonctionnalité dont Go est le plus fier : les goroutines et les channels font partie du langage. Mais la promesse « mon programme ira plus vite » est souvent fausse. Avant d'écrire `go`, il faut savoir **ce que la concurrence apporte**, **quand elle ne sert à rien** et **comment l'estimer**.

## Concurrence et parallélisme : deux idées distinctes

La **concurrence** décrit la **structure** d'un programme : on le découpe en tâches **indépendantes**, qui peuvent progresser sans s'attendre. Le **parallélisme** décrit son **exécution** : plusieurs tâches avancent **au même instant**, sur plusieurs cœurs.

Un programme concurrent peut tourner sur un seul cœur : le planificateur alterne entre les tâches, qui progressent toutes mais jamais au même moment. Le même programme, sur deux cœurs, devient parallèle **sans que son code change**.

::visual{id="go-ch10-concurrency-vs-parallelism"}

C'est le message à retenir : tu écris du code **concurrent**, et c'est le runtime et le matériel qui décident s'il est **parallèle**. Plus ton code est découpé en morceaux indépendants, plus il peut en profiter.

## Quand la concurrence aide

Elle rapporte surtout quand des tâches **indépendantes** passent leur temps à **attendre** : appeler plusieurs services, lire plusieurs fichiers, interroger plusieurs bases. Pendant qu'une tâche attend la réponse du réseau, une autre peut travailler. On parle de tâches **liées aux E/S**. Un serveur web est l'exemple type : chaque requête est indépendante, et beaucoup attendent une base de données.

Elle rapporte aussi pour du calcul pur, à condition que le travail soit **divisible** en morceaux qui ne dépendent pas les uns des autres (traiter 1 000 images, chacune seule).

## Quand elle n'aide pas

- **Chaque étape dépend du résultat de la précédente** : il n'y a rien à faire en même temps. Découper en goroutines ajoute du coût sans gain.
- **Le travail est minuscule** : créer une goroutine, synchroniser et regrouper les résultats coûte plus cher que le travail lui-même.
- **Une ressource partagée devient le goulot** : tout le monde attend le même verrou ou la même connexion.

## La loi d'Amdahl

Même un travail bien parallélisable garde une part **séquentielle** : lire la configuration, regrouper les résultats, écrire le fichier final. Si une fraction *p* du travail est parallélisable, le gain avec *n* cœurs est au plus :

`gain = 1 / ((1 − p) + p / n)`

Avec *p* = 0,75, deux cœurs donnent ×1,6 (pas ×2), huit cœurs ×2,9, et **même une infinité de cœurs ne dépasse jamais ×4**, parce que les 25 % séquentiels restent.

::visual{id="go-ch10-amdahl"}

Conséquence pratique : **mesure la part vraiment parallélisable** avant de te lancer. Si elle est de 20 %, le plafond est ×1,25 ; le jeu n'en vaut pas la chandelle.

## La démarche d'un développeur Go expérimenté

1. Écris d'abord une version **séquentielle, claire et correcte**.
2. **Mesure** (un benchmark, un profil) pour trouver où le temps passe réellement.
3. Introduis la concurrence **là où les tâches sont indépendantes et lentes**, pas partout.
4. Vérifie avec `go test -race` et mesure de nouveau : le gain est-il réel ?

Les débutants font souvent l'inverse : tout en goroutines d'emblée, puis des tampons et des verrous ajoutés au hasard pour calmer les bugs. Les leçons suivantes te donnent les outils pour éviter cela.

> Au-delà du livre : Go ajuste `GOMAXPROCS` au nombre de cœurs. Tu peux le consulter avec `runtime.GOMAXPROCS(0)`. Concurrence ne veut pas dire « plus de cœurs utilisés » : un programme concurrent sur `GOMAXPROCS=1` reste correct, il est simplement séquentiel dans le temps.

## Pièges fréquents

- **Confondre concurrence et parallélisme** : un code concurrent n'est pas forcément plus rapide.
- **Lancer une goroutine par micro-tâche** : le coût de coordination dépasse le gain.
- **Paralléliser sans mesurer** : on optimise une partie qui ne pèse pas dans le temps total.
- **Oublier la part séquentielle** : elle fixe le plafond du gain.

## À retenir

- Concurrence = structure (tâches indépendantes) ; parallélisme = exécution simultanée.
- Elle aide pour les tâches indépendantes qui attendent ou pour le calcul divisible ; elle ne sert à rien si tout est enchaîné.
- Amdahl : gain ≤ 1 / (1 − p), quel que soit le nombre de cœurs.
- Séquentiel d'abord, mesure ensuite, concurrence là où ça rapporte.
