---
id: ddia-ch05-l05
title: Lectures monotones, préfixe cohérent et au-delà
source:
  chapter: 5
  pages: 164-167
duration_min: 35
concepts:
- id: ddia-monotonic-reads
  label: 'Lectures monotones : on ne voit jamais le temps reculer entre deux lectures successives'
- id: ddia-consistent-prefix
  label: 'Lectures de préfixe cohérent : des écritures causalement liées apparaissent dans l''ordre'
- id: ddia-lag-solutions
  label: 'Ne pas faire semblant que l''asynchrone est synchrone : choisir une garantie, ou utiliser des transactions'
- id: ddia-causality-partitions
  label: L'anomalie du préfixe touche surtout les bases partitionnées où il n'y a pas d'ordre global
glossary:
- term: lectures monotones (monotonic reads)
  definition: 'Garantie : après avoir lu une donnée récente, un utilisateur ne lit jamais une donnée plus ancienne.'
- term: préfixe cohérent (consistent prefix reads)
  definition: 'Garantie : si des écritures sont survenues dans un certain ordre, un lecteur les voit apparaître dans cet ordre.'
- term: dépendance causale
  definition: Une écriture B dépend de A si B a été produite en connaissance de A (une réponse à une question).
visuals: []
labs:
- ddia-ch05-l05-lab-anomalies-design
extra: false
xp: 35
---

## Pourquoi c'est important

Après « je ne vois pas ce que je viens d'écrire », il reste deux anomalies plus sournoises du retard de réplication : voir **le temps reculer**, et voir **une réponse avant sa question**. Les connaître te donne le vocabulaire pour demander la bonne garantie à ta base, au lieu de dire vaguement « il faudrait que ce soit cohérent ».

## Lectures monotones

Un utilisateur actualise une page, et chaque requête est routée vers un serveur au hasard. La première tombe sur un follower peu en retard : elle renvoie un commentaire récent d'un autre utilisateur. La seconde tombe sur un follower très en retard : le commentaire a **disparu**. Pour le second observateur, c'est comme s'il regardait le système à un instant plus ancien que la première lecture. Si la première ne montrait rien, ça ne le gênerait pas ; mais voir apparaître puis disparaître un commentaire est très déroutant.

Les **lectures monotones** sont la garantie qui interdit ça. Elle est plus faible que la cohérence forte, mais plus forte que la cohérence à terme : tu peux lire une valeur ancienne, mais **jamais une valeur plus ancienne que celle déjà vue**.

Une façon simple : **chaque utilisateur lit toujours sur le même réplica** (différents utilisateurs peuvent utiliser des réplicas différents). On choisit le réplica avec un **hachage de l'identifiant de l'utilisateur** plutôt qu'au hasard. Si ce réplica tombe, il faut re-router l'utilisateur vers un autre, et la garantie peut s'affaiblir un instant. Dans le projet, tu feras mieux : la session retient la position la plus récente vue, et on n'accepte qu'un réplica au moins aussi avancé.

## Lectures de préfixe cohérent

Troisième anomalie : la violation de la **causalité**. Une courte conversation entre M. Poons et Mme Cake :

- M. Poons : « Jusqu'où dans le futur voyez-vous, Mme Cake ? »
- Mme Cake : « Environ dix secondes, d'habitude, M. Poons. »

La réponse **dépend** de la question : Mme Cake l'a entendue. Un troisième observateur lit à travers des followers. Les paroles de Mme Cake passent par un follower peu en retard, celles de M. Poons par un follower plus en retard. L'observateur voit la réponse **avant** la question : Mme Cake semble prédire l'avenir. C'est impressionnant, mais très confus.

Pour l'éviter, il faut la garantie de **préfixe cohérent** : si une suite d'écritures arrive dans un certain ordre, quiconque les lit les voit apparaître dans cet ordre.

C'est un problème surtout dans les bases **partitionnées** (module 07). Si la base applique toujours les écritures dans le même ordre, un lecteur voit un préfixe cohérent et l'anomalie ne peut pas se produire. Mais dans beaucoup de bases distribuées, **les partitions fonctionnent indépendamment** : il n'y a pas d'ordre global des écritures, donc certaines parties de la base peuvent être plus anciennes que d'autres. Solutions :

- s'assurer que les écritures liées causalement vont **dans la même partition** (pas toujours possible efficacement) ;
- utiliser des algorithmes qui **suivent explicitement les dépendances causales**, qu'on reverra avec la relation *happens-before* (module 06).

## Que faire du retard de réplication

Quand on travaille avec un système éventuellement cohérent, il faut se demander : **que se passe-t-il si le retard monte à plusieurs minutes, voire heures ?** Si la réponse est « aucun problème », parfait. Sinon, il faut concevoir le système pour fournir une garantie plus forte, comme lire ses écritures. **Faire comme si la réplication était synchrone alors qu'elle est asynchrone est une recette pour des ennuis.**

Une application peut offrir une garantie plus forte que la base, par exemple en lisant certaines données sur le leader. Mais le faire dans le code applicatif est complexe et facile à rater. Il vaudrait mieux que les développeurs n'aient pas à penser à ces subtilités et puissent faire confiance à leur base. C'est la raison d'être des **transactions** : un moyen pour la base de fournir des garanties plus fortes. Sur un seul nœud, elles existent depuis longtemps. Mais avec les bases distribuées (répliquées et partitionnées), beaucoup de systèmes les ont abandonnées, en disant qu'elles coûtent trop en performances et disponibilité et que la cohérence à terme est inévitable. Il y a du vrai, mais c'est trop simpliste : les modules 08, 09 et 11 donnent une vue plus nuancée.


## Pièges fréquents

- **Confondre lire ses écritures et lectures monotones.** La première concerne ce que tu as écrit, la seconde ce que tu as déjà lu.
- **Répartir au hasard les lectures d'un utilisateur** entre les followers.
- **Supposer qu'un seul réplica garantit le préfixe cohérent** quand les partitions sont indépendantes.
- **Corriger chaque anomalie par un cas particulier** dans le code applicatif plutôt que par une garantie de la base.

## À retenir

- Lectures monotones : pas de retour dans le passé ; réplica fixe par utilisateur, ou position minimale par session.
- Préfixe cohérent : la causalité est respectée ; problème typique des bases partitionnées sans ordre global.
- Trois garanties à connaître : lire ses écritures, lectures monotones, préfixe cohérent.
- Quand elles deviennent trop dures à maintenir à la main, on remonte à des transactions.
