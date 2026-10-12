---
id: ddia-ch10-l01
title: Pannes partielles et réseau asynchrone
source:
  chapter: 8
  pages: 273-281
duration_min: 40
concepts:
- id: ddia-partial-failure
  label: 'Panne partielle : une partie du système casse de façon imprévisible pendant que le reste tourne ; c''est ce qui distingue le distribué
    d''une machine unique'
- id: ddia-hpc-vs-cloud
  label: 'Calcul scientifique (arrêt global + checkpoint) contre cloud (en ligne en continu, composants bon marché) : le cloud doit tolérer les
    pannes partielles'
- id: ddia-reliable-from-unreliable
  label: On bâtit un service fiable sur des composants peu fiables (ECC, TCP sur IP), avec des limites
- id: ddia-async-network
  label: 'Réseau asynchrone shared-nothing : aucune garantie de délai ni de livraison'
- id: ddia-indistinguishable
  label: 'Requête sans réponse : requête perdue, nœud mort, nœud lent ou réponse perdue sont indiscernables pour l''expéditeur'
- id: ddia-network-faults
  label: 'Les pannes réseau sont courantes (câbles, erreurs humaines, liens asymétriques) : il faut savoir comment le logiciel réagit et le tester'
glossary:
- term: panne partielle
  definition: Une partie du système est cassée de façon imprévisible alors que le reste fonctionne.
- term: shared-nothing
  definition: 'Architecture où les machines ne partagent que le réseau : ni mémoire, ni disque.'
- term: réseau asynchrone
  definition: Réseau qui livre les messages sans garantir ni délai maximal ni livraison.
- term: partition réseau
  definition: Panne qui coupe le réseau en sous-groupes de nœuds incapables de se parler.
visuals: []
labs:
- ddia-ch10-l01-lab-indistinguishable-design
extra: false
xp: 40
---

## Pourquoi c'est important

Jusqu'ici, on a surtout raisonné sur des pannes **bien élevées** : un disque qui meurt, un nœud qui s'arrête, un réplica en retard. Ce module change de ton : **tout ce qui peut mal tourner mal tournera**, et pas toujours de façon franche. Si tu écris un jour du code qui parle à un autre service, tu écris déjà un système distribué, avec ses règles.

## Une machine contre plusieurs

Sur **une seule machine**, un programme est plutôt **déterministe** : avec les mêmes entrées, il fait la même chose, ou il plante franchement. Un ordinateur qui renverrait un résultat faux de temps en temps serait considéré comme cassé, et les concepteurs matériels le savent : mieux vaut un plantage total qu'un résultat incorrect.

Dès qu'il y a plusieurs machines reliées par un réseau, ce confort disparaît. Une partie du système peut être cassée de façon **imprévisible** pendant que le reste va bien : c'est une **panne partielle**. Elle est **non déterministe** : tu envoies la même requête deux fois, une fois ça passe, une fois non, et parfois tu ne sais même pas si elle est passée. C'est ce non-déterminisme qui rend les systèmes distribués difficiles.

## Deux philosophies de la panne

- **Calcul scientifique (HPC)** : un superordinateur lance des calculs de plusieurs jours. Quand un nœud tombe, la réponse classique est de **tout arrêter**, de reprendre au dernier **point de reprise** (*checkpoint*) et de repartir. On traite la panne partielle comme une panne **totale**, ce qui ramène au cas simple de la machine unique.
- **Services en ligne** (le cas de ce cours) : on ne peut pas arrêter un site pendant la réparation. Les utilisateurs veulent une **faible latence en continu**. En plus, le matériel est du matériel standard, moins cher mais plus fragile, avec des **mises à jour en continu** (*rolling upgrade*). Avec assez de machines, **quelque chose est toujours en panne**. Le système doit donc **continuer à servir** malgré les pannes partielles.

## Fiable à partir de non fiable

On sait déjà bâtir de la fiabilité sur du non fiable : un code correcteur d'erreurs rend une mémoire presque parfaite, TCP bâtit un flux ordonné et sans perte au-dessus d'IP, qui perd, duplique et réordonne les paquets. Mais ces constructions ont des **limites** : TCP ne peut pas supprimer le délai du réseau ni garantir que l'autre côté est vivant. Savoir **exactement** ce que l'abstraction garantit et ce qu'elle ne garantit pas, c'est la compétence de ce module.

## Le réseau asynchrone

Les systèmes de ce cours sont **shared-nothing** : des machines qui ne partagent que le réseau. C'est devenu la norme parce que c'est bon marché, que ça permet d'utiliser des services cloud, et que la redondance sur plusieurs centres de données donne de la haute disponibilité.

Mais ce réseau est **asynchrone** : si un nœud envoie un paquet, aucune promesse sur **quand** il arrive, ni **s'il** arrive. Quand tu envoies une requête et que tu attends une réponse, plusieurs choses peuvent mal tourner :

1. la requête est **perdue** (câble débranché) ;
2. la requête est **en attente** dans une file (réseau saturé, destinataire occupé) ;
3. le destinataire est **tombé** ;
4. le destinataire est **temporairement arrêté** (pause longue) et répondra plus tard ;
5. le destinataire a **traité** la requête, mais la **réponse est perdue** ;
6. la réponse est **retardée** (file, congestion).

Pour l'expéditeur, **ces six cas sont indiscernables** : il ne voit qu'une chose, l'absence de réponse. Le seul outil, c'est le **délai d'attente** (*timeout*) : au bout d'un moment on abandonne. Mais abandonner ne dit pas si la requête a été **exécutée** ou non. C'est la racine des opérations **idempotentes** et des clés de déduplication.

## Les pannes réseau existent vraiment

On aime croire que les pannes réseau sont rares dans un centre de données bien géré. Les études disent le contraire : dans un centre de taille moyenne, il y a de l'ordre d'une dizaine de pannes réseau par mois, dont la moitié coupe une seule machine et l'autre moitié tout un rack. Les causes sont banales : câble mal enfiché, **erreur humaine de configuration**, mise à jour d'un commutateur, câble coupé par un engin de chantier ou même un animal. Un lien peut aussi fonctionner dans **un seul sens**.

Ce n'est pas une raison pour que chaque système les **tolère** à tout prix, mais il faut **savoir comment ton logiciel réagit** : se bloque-t-il à jamais ? perd-il des données ? se rétablit-il quand le réseau revient ? Provoquer volontairement ces pannes pour le voir, c'est le principe de l'**ingénierie du chaos**.

## Pièges fréquents

- **Supposer qu'un appel réseau se comporte comme un appel de fonction** : il peut ne jamais revenir, ou revenir après avoir réussi.
- **Réessayer sans idempotence** : si la réponse s'est perdue, la requête sera exécutée deux fois.
- **Tester seulement le chemin heureux** : les pannes partielles ne se voient qu'en les provoquant.

## À retenir

- Le distribué ajoute les **pannes partielles non déterministes** ; le cloud doit les tolérer plutôt que tout arrêter.
- Le réseau est asynchrone : pas de borne de délai, pas de garantie de livraison.
- Une requête sans réponse a **au moins six causes indiscernables** ; le délai d'attente ne dit pas si l'opération a eu lieu.
- Les pannes réseau sont banales : il faut décider et tester le comportement du logiciel.
