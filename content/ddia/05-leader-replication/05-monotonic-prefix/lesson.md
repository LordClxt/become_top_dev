---
id: ddia-ch05-l05
title: "Lectures monotones, préfixe cohérent et conception face au retard"
source: { chapter: 5, pages: "164-167" }
duration_min: 35
concepts:
  - id: ddia-lag-monotonic-reads
    label: "Lectures monotones : un utilisateur ne voit jamais le temps reculer d'une lecture à la suivante"
  - id: ddia-lag-consistent-prefix
    label: "Préfixe cohérent : des écritures produites dans un ordre sont lues dans ce même ordre"
  - id: ddia-lag-prefix-partitions
    label: "Le préfixe cohérent casse surtout entre partitions indépendantes ; écrire les données liées dans la même partition"
  - id: ddia-lag-design-mindset
    label: "Concevoir en supposant des minutes de retard, plutôt que faire comme si la réplication était synchrone"
glossary:
  - term: "lectures monotones (monotonic reads)"
    definition: "Garantie qu'après avoir vu une donnée à un certain état, un utilisateur ne verra jamais un état plus ancien lors de lectures suivantes."
  - term: "préfixe cohérent (consistent prefix reads)"
    definition: "Garantie que si des écritures se produisent dans un certain ordre, quiconque les lit les voit apparaître dans cet ordre."
  - term: "dépendance causale"
    definition: "Relation où une écriture n'a de sens qu'après une autre (une réponse après sa question)."
  - term: "affinité de réplica"
    definition: "Router toujours un même utilisateur vers le même réplica, par exemple par hachage de son identifiant."
visuals: []
labs: [ddia-ch05-l05-lab-read-routing]
xp: 40
---

## Pourquoi c'est important

Read-your-writes protège l'utilisateur de **ses** écritures. Mais le retard de réplication produit deux autres anomalies, plus sournoises, qui touchent les écritures **des autres** : voir le temps reculer, et voir une réponse avant sa question. Elles ne se règlent pas en « lisant au leader », mais par la manière dont on **route** les lectures et dont on **place** les données. La fin de la leçon tire la leçon de tout le chapitre : une application qui suppose que la réplication est instantanée finira par se tromper.

## Lectures monotones

Scénario. Bob lit les commentaires d'un article. Sa première requête tombe sur le follower 1, qui a peu de retard : il voit le commentaire de Chloé, posté il y a 3 s. Il rafraîchit. Cette fois, la requête tombe sur le follower 2, qui a 10 s de retard : **le commentaire de Chloé a disparu**. Bob a vu le temps **reculer**. Pour lui, c'est pire que de ne jamais avoir vu le commentaire.

La garantie des **lectures monotones** empêche cela : si un utilisateur fait plusieurs lectures successives, il ne voit jamais un état plus ancien qu'un état déjà vu. C'est **plus faible** que la cohérence forte (il peut voir des données périmées) mais **plus fort** que la cohérence à terme (elles ne reculent jamais).

### La technique : l'affinité de réplica

Chaque utilisateur lit **toujours sur le même réplica**. Différents utilisateurs peuvent lire sur différents réplicas. Le choix du réplica se fait par exemple par un **hachage de l'identifiant de l'utilisateur**, et non au hasard. Avec 4 followers, `hash("bob") mod 4 = 2` : toutes les lectures de Bob vont au follower 2. Le follower 2 peut avoir du retard, mais il ne recule jamais : Bob voit un état qui ne fait qu'avancer.

Limite : si ce réplica tombe, il faut rediriger l'utilisateur vers un autre, qui peut être **plus en retard**. Pour garder la garantie, on peut combiner avec la technique de position de la leçon précédente : l'utilisateur retient la position la plus haute qu'il a **lue**, et n'accepte qu'un réplica qui l'a atteinte. C'est ce que fait le routeur du projet Tinybase.

## Préfixe cohérent

Troisième anomalie, celle qui viole la **causalité**. Exemple du livre, une conversation :

1. M. Poons : « Jusqu'où dans le futur voyez-vous, Mme Cake ? »
2. Mme Cake : « Une dizaine de secondes en général, M. Poons. »

Il y a une dépendance **causale** : la réponse n'existe qu'à cause de la question. Imagine maintenant un observateur qui lit la conversation via des followers. La question de M. Poons est passée par un follower **lent**, la réponse de Mme Cake par un follower **rapide**. L'observateur lit d'abord la réponse, puis la question : de son point de vue, Mme Cake répond avant qu'on lui ait posé la question. Elle voit vraiment dans le futur.

La garantie du **préfixe cohérent** l'empêche : si une suite d'écritures se produit dans un certain ordre, quiconque les lit les voit apparaître **dans le même ordre**. Le lecteur voit toujours un **préfixe** de l'histoire, jamais un mélange.

### Pourquoi c'est surtout un problème de partitions

Avec un seul leader et un seul log, l'ordre est déjà unique : tous les followers appliquent les mêmes changements dans le même ordre. Le problème apparaît dans les bases **partitionnées** (module 07) : chaque partition a son propre leader et son propre log, et les partitions fonctionnent **indépendamment**. Il n'y a pas d'ordre global des écritures. Une lecture qui traverse deux partitions peut voir la partition 1 « plus tard » que la partition 2.

Solutions :

- écrire les données **liées causalement** dans la **même partition** : par exemple, partitionner les messages par identifiant de conversation, pas par auteur. La question et la réponse partagent alors le même log ;
- dans certains cas c'est impossible, et il faut des algorithmes qui **suivent explicitement les dépendances causales**. Le livre y revient avec la relation *happens-before* (module 06) et l'ordre causal (module 11).

## Concevoir avec le retard

Les trois garanties de ce module se résument en un tableau :

| Garantie | Anomalie évitée | Technique typique |
|---|---|---|
| Read-your-writes | Mon écriture disparaît | Lire au leader ce que j'ai modifié, ou un réplica à ma position |
| Lectures monotones | Le temps recule | Toujours le même réplica pour un utilisateur |
| Préfixe cohérent | La réponse avant la question | Données liées dans la même partition, suivi causal |

La question à se poser pour chaque fonctionnalité : **que se passe-t-il si le retard monte à plusieurs minutes, voire heures ?** Si la réponse est « rien de grave », tant mieux. Si c'est « mauvaise expérience utilisateur », il faut une garantie plus forte, comme read-your-writes. **Faire comme si la réplication était synchrone alors qu'elle est asynchrone** est la recette des problèmes en production.

L'application peut fournir elle-même ces garanties, par exemple en lisant certaines données au leader. Mais c'est complexe, facile à oublier, et chaque développeur doit y penser à chaque requête. Il serait plus confortable que la base **fasse ce qu'il faut**. C'est la raison d'être des **transactions** : une manière pour la base de donner des garanties fortes, pour que l'application soit plus simple. Les transactions sur un seul nœud existent depuis longtemps ; beaucoup de systèmes distribués les ont abandonnées en les jugeant trop coûteuses en performance et en disponibilité, et en affirmant que la cohérence à terme était inévitable. Le livre nuance fortement cette affirmation dans les chapitres sur les transactions (modules 08 et 09) et sur le consensus (module 12).

## Pièges fréquents

- **Répartir les lectures d'un utilisateur au hasard** (round-robin) entre followers : c'est exactement ce qui fait reculer le temps.
- **Choisir le réplica par adresse IP** : l'IP d'un téléphone change en passant du Wi-Fi au réseau mobile ; l'identifiant de l'utilisateur, non.
- **Oublier le cas de la panne** : rediriger vers un autre réplica sans vérifier sa position peut casser la monotonie.
- **Partitionner les messages par auteur** : une question et sa réponse tombent dans deux partitions qui avancent à des rythmes différents.
- **Se dire « le retard est toujours faible »** : le module 00 l'a montré, ce sont les queues de distribution qui font les incidents.

## À retenir

- Lectures monotones : l'utilisateur ne voit jamais un état plus ancien qu'un état déjà vu ; on route chaque utilisateur vers un réplica fixe (hachage de son identifiant).
- Préfixe cohérent : les écritures se lisent dans leur ordre causal ; problème surtout entre partitions, réglé en plaçant les données liées dans la même partition.
- Pour chaque fonctionnalité, demande ce qui se passe avec des minutes de retard ; ne fais jamais comme si l'asynchrone était synchrone.
- Les transactions existent pour que la base porte ces garanties à la place de l'application.
