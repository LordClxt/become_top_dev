---
id: ddia-ch06-l05
title: "Écritures concurrentes et vecteurs de versions"
source: { chapter: 5, pages: "184-192" }
duration_min: 45
concepts:
  - id: ddia-concurrent-writes
    label: "Sans ordre imposé, les écritures arrivent dans un ordre différent sur chaque réplica : écraser à l'arrivée fait diverger"
  - id: ddia-lww-data-loss
    label: "LWW converge en jetant des écritures acquittées ; sûr seulement pour des clés écrites une seule fois"
  - id: ddia-happens-before
    label: "A arrive avant B si B connaît A ou s'appuie sur A ; sinon elles sont concurrentes, quelle que soit l'heure"
  - id: ddia-version-numbers
    label: "Numéros de version par clé : le client renvoie la version lue, le serveur écrase ce qu'elle couvre et garde le reste"
  - id: ddia-siblings-merge
    label: "Siblings : les valeurs concurrentes conservées, que l'application fusionne (union, pierres tombales pour les suppressions)"
  - id: ddia-version-vectors
    label: "Vecteur de versions : un compteur par réplica, pour distinguer écrasement et écriture concurrente sans leader"
glossary:
  - term: "concurrentes"
    definition: "Deux opérations dont aucune ne connaît l'autre ; le moment physique où elles ont lieu n'entre pas en compte."
  - term: "relation happens-before"
    definition: "A arrive avant B si B a connaissance de A, en dépend ou s'appuie dessus."
  - term: "sibling"
    definition: "Une des valeurs concurrentes qu'une base conserve pour une même clé, en attendant que l'application les fusionne (terme de Riak)."
  - term: "pierre tombale (tombstone)"
    definition: "Marqueur, muni d'un numéro de version, qui signale qu'une donnée a été supprimée, pour que la fusion ne la fasse pas réapparaître."
  - term: "vecteur de versions (version vector)"
    definition: "Ensemble des numéros de version de tous les réplicas pour une clé ; renvoyé au client à la lecture, rendu par lui à l'écriture."
  - term: "contexte causal"
    definition: "Nom donné par Riak au vecteur de versions encodé en chaîne, que le client transporte entre lecture et écriture."
visuals: []
labs: [ddia-ch06-l05-lab-version-design]
xp: 40
---

## Pourquoi c'est important

Multi-leader ou sans leader, on retombe toujours sur la même question : **deux écritures sur la même clé, laquelle garder ?** Les leçons précédentes ont montré que les quorums ne la tranchent pas. La réponse paresseuse, « la plus récente », est celle de beaucoup de bases par défaut, et elle perd des données. Cette leçon construit la bonne réponse étape par étape : définir ce que « concurrent » veut dire, détecter la concurrence avec des numéros de version, garder les valeurs concurrentes, puis généraliser à plusieurs réplicas avec les **vecteurs de versions**. C'est exactement ce que tu implémentes dans le projet Tinybase de ce module.

## Le problème : chaque réplica voit un ordre différent

Trois nœuds, une clé `X`. Deux clients écrivent en même temps : Ana écrit `X = a`, Bruno `X = b`.

- Le nœud 1 reçoit `a`, mais jamais `b` (coupure passagère).
- Le nœud 2 reçoit `a` puis `b`.
- Le nœud 3 reçoit `b` puis `a`.

Si chaque nœud **écrase** la valeur à chaque écriture reçue, le nœud 2 finit sur `b`, les nœuds 1 et 3 sur `a`, **définitivement**. La cohérence à terme exige que les réplicas convergent ; les bases le font plus ou moins bien, et c'est à toi de savoir comment la tienne s'y prend.

## Last write wins : converger en jetant

Première approche : chaque réplica ne garde que la valeur « la plus récente ». Comme les écritures sont concurrentes, leur ordre n'est pas défini ; on en **impose** un en attachant un horodatage à chaque écriture, et la plus grande gagne. C'est **LWW**, seule méthode de résolution de Cassandra et option de Riak.

LWW converge, mais au prix de la **durabilité** : si trois clients écrivent en même temps et reçoivent tous « OK » (chacun a atteint w réplicas), **une seule écriture survit**, les deux autres disparaissent sans bruit. LWW peut même jeter des écritures **non** concurrentes, à cause des horloges qui dérivent (module « Quand le réseau ment »).

Parfois c'est acceptable, pour un cache par exemple. Sinon, la seule façon sûre d'utiliser LWW est de **n'écrire chaque clé qu'une fois**, puis de la traiter comme immuable : la pratique recommandée avec Cassandra est d'utiliser un **UUID comme clé**, donc une clé neuve par écriture.

## Avant, après ou concurrent

Comparons deux situations.

- Ana insère une ligne, Bruno lit cette ligne et l'incrémente. L'opération de Bruno **s'appuie** sur celle d'Ana : elle est **causalement dépendante**.
- Ana et Bruno écrivent la même clé sans avoir vu l'écriture de l'autre : aucune ne connaît l'autre, elles sont **concurrentes**.

Définition : **A arrive avant B** (*happens-before*) si B connaît A, en dépend ou s'appuie dessus. **A et B sont concurrentes** si aucune n'arrive avant l'autre. Trois cas possibles : A avant B, B avant A, ou concurrentes. La règle qui en découle :

- si l'une arrive avant l'autre, **la plus tardive écrase** la plus ancienne ;
- si elles sont concurrentes, il y a un **conflit** à résoudre.

Attention à l'intuition : « concurrent » ne veut **pas** dire « au même instant ». Deux écritures à 3 secondes d'intervalle sont concurrentes si aucune n'a vu l'autre (le réseau était lent, ou coupé). Ce qui compte, c'est **l'information**, pas l'horloge — comme en relativité, où deux événements trop éloignés pour qu'un signal les relie n'ont pas d'ordre défini.

## Détecter la concurrence avec un seul réplica

Un serveur unique, une liste de courses partagée par des colocataires. L'algorithme :

1. Le serveur garde un **numéro de version par clé**, incrémenté à chaque écriture et stocké avec la valeur.
2. Une **lecture** renvoie **toutes les valeurs non écrasées**, plus le numéro de version le plus récent. Il faut lire avant d'écrire.
3. Une **écriture** porte le numéro de version de la lecture précédente, et la valeur écrite doit être la **fusion de toutes les valeurs** reçues à cette lecture.
4. Le serveur **écrase** toutes les valeurs de version **inférieure ou égale** au numéro reçu (elles ont été fusionnées), et **garde** celles de version plus grande (elles sont concurrentes à cette écriture).
5. Une écriture **sans** numéro de version est concurrente à tout : elle n'écrase rien.

Déroulons :

| Étape | Écriture | Version attribuée | Valeurs conservées |
|---|---|---|---|
| 1 | Léa écrit `[pâtes]`, sans version | 1 | v1 `[pâtes]` |
| 2 | Malik écrit `[café]`, sans version (il n'a pas vu Léa) | 2 | v1 `[pâtes]`, v2 `[café]` |
| 3 | Léa écrit `[pâtes, riz]` avec la version 1 | 3 | v2 `[café]`, v3 `[pâtes, riz]` |
| 4 | Malik, qui avait lu v1 et v2 (version 2), écrit la fusion `[café, pâtes, sel]` avec la version 2 | 4 | v3 `[pâtes, riz]`, v4 `[café, pâtes, sel]` |

À l'étape 3, la version 1 est écrasée (Léa l'avait vue) mais `[café]` est gardé (Léa ne l'avait pas vu). Aucune écriture n'est perdue, et le serveur sait exactement ce qui est concurrent, **sans aucune horloge**.

## Fusionner les siblings

Les valeurs concurrentes conservées s'appellent des **siblings** (vocabulaire de Riak). Le client doit les fusionner. Pour une liste de courses, l'**union** est raisonnable : `[pâtes, riz]` ∪ `[café, pâtes, sel]` = `[café, pâtes, riz, sel]`. LWW, lui, aurait gardé l'une des deux et perdu le riz ou le sel.

Le piège, ce sont les **suppressions**. Si Léa retire `pâtes` de sa version alors que celle de Malik la contient encore, l'union **fait réapparaître les pâtes** (le bogue du panier d'Amazon de la leçon 2). Remède : ne pas effacer l'article, mais laisser une **pierre tombale**, un marqueur versionné « pâtes supprimées », que la fusion respecte.

Écrire ces fusions à la main est délicat ; d'où l'intérêt des structures qui fusionnent seules, comme les types de données de Riak et les **CRDT** évoqués en leçon 2.

## Plusieurs réplicas : les vecteurs de versions

Sans leader, plusieurs réplicas acceptent les écritures : un seul numéro par clé ne suffit plus. On garde **un numéro de version par réplica et par clé**. Chaque réplica incrémente **son propre** numéro quand il traite une écriture, et retient les numéros qu'il a vus des autres réplicas. L'ensemble des numéros de tous les réplicas forme un **vecteur de versions**.

Comparer deux vecteurs, c'est comparer entrée par entrée :

- `{A: 2, B: 1}` contre `{A: 1, B: 1}` : le premier est **partout ≥** et strictement plus grand quelque part, il arrive **après** ;
- `{A: 2, B: 1}` contre `{A: 1, B: 2}` : chacun est plus grand quelque part, ils sont **concurrents** ;
- `{A: 1}` contre `{A: 1, C: 1}` : une entrée absente vaut 0, le premier arrive **avant**.

Comme pour le réplica unique, la base **renvoie le vecteur au client** à la lecture, et le client le **rend** à l'écriture suivante. Riak l'encode dans une chaîne appelée **contexte causal**. Grâce à lui, la base distingue un **écrasement** (le client avait vu la valeur précédente) d'une **écriture concurrente** (il ne l'avait pas vue). Conséquence pratique : on peut **lire sur un réplica et écrire sur un autre** sans perdre de données ; au pire, on obtient des siblings, à fusionner correctement.

### Aller plus loin : vecteurs de versions, horloges vectorielles, points

- Les **horloges vectorielles** (*vector clocks*) ressemblent aux vecteurs de versions mais servent à ordonner des événements entre processus ; pour comparer l'état de réplicas, c'est bien le vecteur de versions qu'il faut.
- Un piège subtil : si le même réplica coordonne deux écritures concurrentes, comparer seulement leurs vecteurs (`{A: 1}` puis `{A: 2}`) ferait croire que la seconde a vu la première. Riak 2.0 utilise des **dotted version vectors** : chaque version retient l'écriture qui l'a créée (le « point », ici A:2) **et** le contexte que l'écrivain avait vu (vide). C'est exactement la structure `Version{Node, Seq, Seen}` du projet Tinybase.

## Pièges fréquents

- **Confondre concurrent et simultané** : c'est la connaissance mutuelle qui compte, pas l'heure.
- **Écrire sans renvoyer la version lue** : la base ne peut rien écraser, les siblings s'accumulent.
- **Garder LWW sur des données mutables qui comptent** : chaque écriture concurrente acquittée peut disparaître.
- **Fusionner par union sans pierres tombales** : les suppressions ressuscitent.
- **Comparer des vecteurs en ignorant les entrées absentes** : une entrée manquante vaut 0.

## À retenir

- Écraser à l'arrivée fait diverger les réplicas ; **LWW** converge en jetant des écritures, sûr seulement pour des clés immuables.
- **A arrive avant B** si B connaît A ; sinon elles sont **concurrentes**, et c'est là seulement qu'il y a conflit.
- **Numéros de version** : le client renvoie la version lue, le serveur écrase ce qu'elle couvre et garde le reste comme **siblings**.
- L'application **fusionne** les siblings (union, avec **pierres tombales** pour les suppressions).
- Sans leader : un compteur par réplica, le **vecteur de versions**, transporté par le client entre lecture et écriture.
