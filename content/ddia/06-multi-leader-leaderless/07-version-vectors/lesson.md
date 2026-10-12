---
id: ddia-ch06-l07
title: Versions, siblings, tombstones et vecteurs de version
source:
  chapter: 5
  pages: 187-192
duration_min: 45
concepts:
- id: ddia-version-algorithm
  label: 'Algorithme à numéros de version par clé : le serveur écrase les valeurs de version ≤ celle reçue et garde les autres'
- id: ddia-siblings
  label: 'Siblings : valeurs concurrentes conservées, que le client doit fusionner'
- id: ddia-tombstone
  label: 'Tombstone : marqueur de suppression avec version, sinon un élément retiré réapparaît à la fusion'
- id: ddia-version-vector
  label: 'Vecteur de version : un compteur par réplica ; permet de distinguer écrasement et concurrence en leaderless'
- id: ddia-crdt-merge
  label: Des structures (CRDT) peuvent fusionner automatiquement les siblings, y compris les suppressions
glossary:
- term: sibling
  definition: Une valeur concurrente conservée à côté d'une autre pour une même clé (terme de Riak).
- term: tombstone
  definition: Marqueur de suppression qui garde la trace d'un retrait pour la fusion.
- term: vecteur de version
  definition: Collection des numéros de version de tous les réplicas pour une clé.
- term: contexte causal
  definition: Nom du vecteur de version encodé par Riak, que le client renvoie lors de l'écriture.
visuals: []
labs:
- ddia-ch06-l07-lab-versions-design
extra: false
xp: 45
---

## Pourquoi c'est important

Comment un serveur décide-t-il qu'une écriture en écrase une autre (elle la connaît) ou la côtoie (elle est concurrente) **sans jamais regarder la valeur** ni l'horloge ? Réponse : avec des **numéros de version**. Cette leçon décrit l'algorithme du livre, d'abord avec un seul réplica, puis généralisé à plusieurs réplicas avec les **vecteurs de version**. Tu l'implémentes au projet.

## Un exemple : le panier

Deux clients ajoutent des articles au même panier en même temps. Au départ, le panier est vide. Entre eux, ils font cinq écritures.

1. Le client 1 ajoute du **lait**. Première écriture de la clé : le serveur la stocke et lui donne la **version 1**. Il renvoie la valeur et la version.
2. Le client 2 ajoute des **œufs**, sans savoir que le client 1 a ajouté du lait (il croit que ses œufs sont l'unique contenu). Le serveur attribue la **version 2** et stocke **œufs et lait comme deux valeurs séparées**. Il renvoie les deux valeurs avec la version 2.
3. Le client 1, qui ignore l'écriture du client 2, veut ajouter de la **farine** ; il pense que le panier est [lait, farine]. Il envoie cette valeur avec la **version 1** reçue avant. Le serveur voit grâce à la version que [lait, farine] **remplace** [lait], mais est **concurrent** avec [œufs]. Il attribue la version 3 à [lait, farine], écrase [lait] (version 1), garde [œufs] (version 2) et renvoie les deux valeurs.
4. Le client 2 veut ajouter du **jambon**. Il a reçu [lait] et [œufs] : il les **fusionne**, ajoute du jambon, obtient [œufs, lait, jambon] et l'envoie avec la version 2. Le serveur voit que la version 2 écrase [œufs] mais est concurrente avec [lait, farine] : il garde [lait, farine] (v3) et [œufs, lait, jambon] (v4).
5. Enfin le client 1 veut ajouter du **bacon**. Il avait reçu [lait, farine] et [œufs] à la version 3 : il les fusionne, ajoute du bacon et envoie [lait, farine, œufs, bacon] avec la version 3. Cela écrase [lait, farine] mais est concurrent avec [œufs, lait, jambon] : le serveur garde ces deux valeurs.


Les clients ne sont jamais complètement à jour (il y a toujours une autre opération en cours), mais les anciennes valeurs finissent par être écrasées, et **aucune écriture n'est perdue**.

### L'algorithme

Le serveur peut savoir si deux opérations sont concurrentes en regardant les numéros de version, **sans interpréter la valeur** (qui peut être n'importe quelle structure) :

- le serveur garde un numéro de version **par clé**, l'incrémente à chaque écriture et le stocke avec la valeur ;
- quand un client **lit** une clé, le serveur renvoie **toutes les valeurs non écrasées**, plus le dernier numéro de version. Un client doit **lire avant d'écrire** ;
- quand un client **écrit**, il doit inclure le numéro de version de sa lecture précédente et **fusionner** toutes les valeurs reçues (la réponse d'une écriture peut ressembler à une lecture, ce qui permet d'enchaîner les écritures) ;
- quand le serveur reçoit une écriture avec une version donnée, il peut **écraser toutes les valeurs de cette version ou d'une version inférieure** (elles ont été fusionnées dans la nouvelle valeur), mais doit **garder toutes les valeurs de version supérieure** (elles sont concurrentes de l'écriture entrante).

Une écriture **sans numéro de version** est concurrente avec toutes les autres : elle n'écrase rien, elle sera simplement renvoyée parmi les valeurs lors des lectures suivantes.

## Fusionner les siblings

Cet algorithme n'abandonne aucune donnée en silence, mais exige un travail du client : nettoyer en **fusionnant les valeurs écrites concurrentement**. Riak appelle ces valeurs concurrentes des **siblings**. C'est exactement le problème de résolution de conflits du multi-leader. Choisir une valeur par version ou horodatage (LWW) perd des données ; il faut faire plus intelligent. Pour un panier, une approche raisonnable est de **prendre l'union** des siblings : [lait, farine, œufs, bacon] et [œufs, lait, jambon] donnent [lait, farine, œufs, bacon, jambon], sans doublons.

Mais si l'on veut aussi **retirer** des articles, l'union ne donne pas le bon résultat : si un article a été retiré dans un seul des siblings, il **réapparaît** dans l'union. Pour l'éviter, un article ne peut pas simplement être supprimé de la base : le système doit laisser un **marqueur de suppression**, avec un numéro de version, pour indiquer le retrait au moment de fusionner. Ce marqueur est un **tombstone** (on en a vu en compaction de log, module 02).

Fusionner les siblings dans le code applicatif est complexe et sujet aux erreurs : des **CRDT** (types de données de Riak) fusionnent automatiquement de façon sensée, y compris en préservant les suppressions.

## Plusieurs réplicas : les vecteurs de version

L'exemple utilisait un seul réplica. Avec plusieurs réplicas sans leader, **un seul numéro de version ne suffit plus**. Il faut un numéro de version **par réplica** et par clé. Chaque réplica incrémente son propre numéro quand il traite une écriture, et retient les numéros qu'il a vus des autres. L'ensemble des numéros de version de tous les réplicas s'appelle un **vecteur de version**. Une variante intéressante, le **dotted version vector**, est utilisée dans Riak 2.0. Comme les numéros de la figure, les vecteurs sont envoyés par les réplicas aux clients à la lecture et doivent être renvoyés à la base à l'écriture suivante (Riak l'encode en chaîne, le **contexte causal**). Le vecteur permet à la base de distinguer **écrasement** et **écriture concurrente**. Et il est sûr de lire un réplica puis d'écrire sur un autre : cela peut créer des siblings, mais aucune donnée n'est perdue si les siblings sont correctement fusionnés.

Comparer deux vecteurs A et B compteur par compteur :

- si tous les compteurs de A sont ≤ à ceux de B (et au moins un <), **A s'est produit avant B** : B écrase A ;
- l'inverse : A écrase B ;
- si A est supérieur sur un compteur et B sur un autre, ils sont **concurrents** ;
- s'ils sont égaux, c'est la même version.

> **À noter.** Un vecteur de version est parfois appelé *vector clock*, mais ce n'est pas exactement la même chose : pour comparer l'état de réplicas, c'est bien le vecteur de version qu'il faut.

## Pièges fréquents

- **Écrire sans avoir lu** : l'écriture est concurrente de toutes les autres et crée un sibling.
- **Fusionner par union sans tombstones** : les suppressions disparaissent.
- **Oublier de renvoyer le contexte causal** à l'écriture : le serveur ne sait plus ce que le client a fusionné.
- **Utiliser un seul compteur global avec plusieurs réplicas.**

## À retenir

- Numéro de version par clé + valeurs non écrasées renvoyées à la lecture : aucune écriture n'est perdue.
- Les siblings concurrents sont fusionnés par le client (union + tombstones, ou CRDT).
- Plusieurs réplicas : un compteur par réplica, donc un vecteur de version, comparé compteur par compteur : avant, après, ou concurrent.
