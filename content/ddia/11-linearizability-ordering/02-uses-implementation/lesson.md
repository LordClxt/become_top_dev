---
id: ddia-ch11-l02
title: "Quand l'exiger, et comment l'obtenir"
source: { chapter: 9, pages: "330-335" }
duration_min: 40
concepts:
  - id: ddia-lin-locks-leader-election
    label: "Un verrou ou une élection de leader doit être linéarisable : tous les nœuds doivent s'accorder sur qui le détient"
  - id: ddia-lin-uniqueness-constraints
    label: "Une contrainte d'unicité (pseudo, siège, solde ≥ 0) demande une valeur unique à jour sur laquelle tous s'accordent"
  - id: ddia-lin-cross-channel-timing
    label: "Deux canaux de communication (stockage et file de messages) créent une course que seule la linéarisabilité du stockage évite"
  - id: ddia-lin-replication-methods
    label: "Leader unique : potentiellement linéarisable ; consensus : linéarisable ; multi-leader : non ; sans leader : probablement pas"
  - id: ddia-lin-quorums-not-linearizable
    label: "Même avec w + r > n, un quorum peut donner des lectures non linéarisables quand les délais réseau varient"
glossary:
  - term: "élection de leader"
    definition: "Choisir un seul nœud leader parmi plusieurs ; souvent réalisée avec un verrou que chaque candidat tente d'acquérir."
  - term: "service de coordination"
    definition: "Système comme ZooKeeper ou etcd qui offre verrous, élection et stockage linéarisables grâce à un algorithme de consensus."
  - term: "canal auxiliaire (cross-channel)"
    definition: "Un second chemin d'information (file de messages, voix, téléphone) qui permet à un client d'apprendre qu'une écriture a eu lieu avant que le stockage la montre."
  - term: "réparation à la lecture (read repair)"
    definition: "En sans-leader, le lecteur réécrit la valeur la plus récente sur les répliques en retard ; faite de façon synchrone, elle peut rendre les lectures et écritures simples linéarisables."
  - term: "quorum strict"
    definition: "Paramètres w + r > n : tout ensemble de lecture recoupe tout ensemble d'écriture d'au moins un nœud."
visuals: []
labs: [ddia-ch11-l02-lab-resizer-design]
xp: 40
---

## Pourquoi c'est important

La linéarisabilité coûte cher : on le verra dans la leçon suivante. Il faut donc savoir **où** elle est indispensable et où on peut s'en passer. Le score de football de la leçon précédente était juste agaçant. D'autres situations, elles, cassent un système : deux leaders qui écrivent en même temps, deux clients qui obtiennent le même pseudo, un traitement qui lit une image pas encore arrivée. Et une fois le besoin établi, il faut savoir quelles architectures de réplication (modules 05 et 06 du cours) peuvent le satisfaire.

## Verrous et élection de leader

Un système à leader unique (module 05, réplication avec leader) doit s'assurer qu'il n'y a **qu'un seul** leader, sinon c'est le *split brain*. Une façon courante : chaque nœud candidat tente d'acquérir un **verrou** au démarrage ; celui qui réussit devient leader. Ce verrou doit être linéarisable : tous les nœuds doivent être d'accord sur qui le tient. Un verrou « à terme cohérent » laisserait deux nœuds croire qu'ils l'ont.

C'est le rôle des **services de coordination** comme ZooKeeper ou etcd : ils implémentent un stockage linéarisable tolérant aux pannes grâce au consensus, et on s'en sert pour les verrous et l'élection. Au module 10, tu as vu qu'un verrou doit en plus être protégé par un **jeton de clôture** (*fencing token*) : la linéarisabilité garantit que le service ne donne pas le verrou à deux nœuds, le jeton empêche un ancien détenteur en pause de continuer à écrire. Des bases distribuées l'utilisent aussi à grain fin : Oracle RAC pose un verrou par page de disque, avec plusieurs nœuds qui partagent le même disque.

ZooKeeper offre en réalité des écritures linéarisables, mais des lectures qui peuvent être légèrement obsolètes, sauf si l'on demande explicitement une lecture linéarisable (avec `sync()`). etcd lit de façon linéarisable par défaut (des options plus rapides existent).

## Contraintes d'unicité

Deux personnes qui tentent de créer en même temps le compte `ada` : une seule doit réussir. C'est exactement un **verrou sur le nom** : la première à l'acquérir gagne. Ou, dit autrement, un `cas(nom, libre, moi)`. D'autres contraintes ont la même forme :

- un solde bancaire qui ne doit jamais devenir négatif ;
- ne pas vendre plus d'articles que le stock ;
- deux personnes ne réservent pas le même siège dans un avion ou une salle.

Toutes exigent une **valeur unique et à jour** (le solde, le stock, l'occupation du siège) sur laquelle tous les nœuds s'accordent. Les clés primaires et contraintes `UNIQUE` des bases relationnelles exigent la linéarisabilité. Les contraintes d'intégrité référentielle ou les clés étrangères, elles, peuvent s'en passer (le module 17 y reviendra). On peut aussi parfois relâcher la règle et compenser après coup (surréservation, excuses), mais c'est un choix métier explicite.

## Course entre deux canaux

La troisième situation est la plus sournoise, car elle naît d'un **canal auxiliaire**. Exemple du livre : un site laisse les utilisateurs envoyer une photo, et un service de redimensionnement produit des vignettes.

1. Le serveur web écrit la photo en taille réelle dans un stockage de fichiers.
2. Il envoie dans une file de messages une instruction « redimensionner la photo 42 » (la photo elle-même est trop grosse pour passer dans la file).
3. Un worker reçoit le message, **lit** la photo dans le stockage, écrit la vignette.

Si le stockage est répliqué de façon non linéarisable, la file peut être **plus rapide que la réplication** : le worker lit sur une réplique qui n'a pas encore la photo. Il ne trouve rien, ou pire, il trouve l'**ancienne** version (l'utilisateur a remplacé sa photo) et produit une vignette fausse qui ne sera jamais corrigée. Le problème vient de ce qu'il existe deux chemins entre le serveur et le worker : le stockage et la file. Alice et Bob avaient le même problème, avec la voix d'Alice comme second canal.

Remèdes : rendre le stockage linéarisable pour cette lecture, ou faire passer l'information par **un seul canal** (par exemple, mettre un numéro de version de la photo dans le message, et lire cette version précise, ou attendre qu'elle soit présente). La lecture de ses propres écritures (module 05) aide pour un utilisateur, mais ne suffit pas ici : c'est un autre processus qui lit.

## Quelle réplication peut être linéarisable ?

La façon la plus simple d'être linéarisable serait de n'avoir qu'**une** copie. Mais elle ne tolère pas les pannes. Reprenons les méthodes de réplication vues plus tôt :

- **Leader unique** : *potentiellement* linéarisable, si les lectures passent par le leader ou par des réplicas **synchrones** à jour. Mais il faut être sûr de savoir qui est le leader : un ancien leader qui se croit encore leader casse tout (module 10). Et le basculement asynchrone peut perdre des écritures validées, ce qui viole à la fois la durabilité et la linéarisabilité. Les lectures sur instantané (MVCC) ne sont pas linéarisables non plus.
- **Algorithmes de consensus** (ZooKeeper, etcd, Raft) : linéarisables. Ils ressemblent à un leader unique, mais avec des mécanismes pour empêcher le *split brain* et les réplicas obsolètes. C'est le sujet du chapitre suivant.
- **Multi-leader** : **non** linéarisable en général. Plusieurs nœuds acceptent des écritures concurrentes sur la même clé et les répliquent de façon asynchrone ; il faut ensuite résoudre des conflits, impossibles avec une copie unique.
- **Sans leader** (style Dynamo) : **probablement non**. « La dernière écriture gagne » s'appuie sur des horloges murales (module 10), qui ne garantissent pas un ordre cohérent avec l'ordre réel. Les quorums lâches (*sloppy quorums*) détruisent aussi toute chance de linéarisabilité.

## Les quorums stricts ne suffisent pas

Intuition trompeuse : avec `w + r > n`, une lecture recoupe forcément une écriture, donc on devrait toujours lire la valeur fraîche. Faux, dès que les délais réseau varient.

Exemple : `n = 3`, `w = 3`, `r = 2`. Un écrivain envoie `x = 1` aux trois répliques, mais les paquets arrivent à des moments différents. Le lecteur A lit sur deux répliques dont **une** a déjà reçu 1 : il voit 1 (la plus récente des deux). Juste après, le lecteur B lit sur les deux répliques qui **n'ont pas encore** reçu l'écriture : il voit 0. Le quorum est respecté (2 + 3 > 3), mais B lit une valeur plus vieille que A, alors qu'il a commencé après lui : non linéarisable.

On peut corriger, au prix des performances : faire une **réparation à la lecture synchrone** (le lecteur réécrit la valeur récente sur une majorité avant de répondre), et faire **lire à l'écrivain** l'état le plus récent d'un quorum avant d'écrire. Cassandra fait la réparation synchrone, mais perd la linéarisabilité avec « la dernière écriture gagne ». Et même ainsi, seules les lectures et écritures simples deviennent linéarisables : un **compare-and-set** exige un algorithme de consensus.

## Pièges fréquents

- **Élire un leader avec un simple flag dans une base à cohérence à terme** : deux nœuds liront chacun « libre ».
- **Envoyer le contenu par un chemin et la notification par un autre** sans relier les deux : la notification arrive avant les données.
- **Croire qu'un quorum strict garantit la fraîcheur** : la variation des délais suffit à la casser.
- **Croire que « dernière écriture gagne » fait une contrainte d'unicité** : elle choisit un gagnant après coup, en effaçant l'autre.

## À retenir

- Linéarisabilité indispensable pour : verrous et élection de leader, contraintes d'unicité (noms, sièges, soldes), et quand deux canaux peuvent faire la course.
- Leader unique : potentiellement ; consensus : oui ; multi-leader : non ; sans leader : probablement pas.
- `w + r > n` ne suffit pas ; réparation synchrone et lecture avant écriture rendent linéarisables les lectures/écritures simples, mais pas le compare-and-set.
- En pratique, on délègue ces besoins à un service de coordination (ZooKeeper, etcd).
