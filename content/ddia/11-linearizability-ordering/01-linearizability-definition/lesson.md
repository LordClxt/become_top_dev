---
id: ddia-ch11-l01
title: "Ce que promet la linéarisabilité"
source: { chapter: 9, pages: "321-330" }
duration_min: 40
concepts:
  - id: ddia-eventual-consistency-weakness
    label: "La cohérence à terme ne promet que la convergence, sans dire quand : une garantie faible et difficile à tester"
  - id: ddia-linearizability-definition
    label: "Linéarisabilité : le système se comporte comme s'il n'existait qu'une copie des données, et chaque opération prend effet atomiquement entre sa requête et sa réponse"
  - id: ddia-linearizable-read-visibility
    label: "Garantie de fraîcheur : dès qu'une lecture a vu une nouvelle valeur, toutes les lectures qui commencent ensuite la voient aussi"
  - id: ddia-linearizability-cas-register
    label: "Registre et compare-and-set : une opération atomique conditionnelle qui n'a de sens que sur un système linéarisable"
  - id: ddia-linearizability-vs-serializability
    label: "Sérialisabilité (transactions, ordre quelconque) et linéarisabilité (un objet, fraîcheur en temps réel) sont deux garanties différentes"
glossary:
  - term: "cohérence à terme (eventual consistency)"
    definition: "Si l'on cesse d'écrire, toutes les répliques finiront par renvoyer la même valeur. Rien n'est dit sur le délai ni sur ce qu'on lit en attendant."
  - term: "linéarisabilité (linearizability)"
    definition: "Aussi appelée cohérence atomique, forte ou immédiate : le système donne l'illusion d'une seule copie, mise à jour par des opérations atomiques."
  - term: "registre (register)"
    definition: "Dans la théorie, un objet élémentaire qu'on lit et qu'on écrit : une clé d'une base clé-valeur, une ligne, un document."
  - term: "compare-and-set (cas)"
    definition: "Opération atomique cas(x, ancien, nouveau) : x devient « nouveau » seulement s'il vaut encore « ancien », sinon l'opération échoue sans rien changer."
  - term: "sérialisabilité stricte (strict serializability)"
    definition: "Sérialisabilité plus linéarisabilité : les transactions se comportent comme exécutées une par une, dans un ordre qui respecte le temps réel."
visuals: []
labs: [ddia-ch11-l01-lab-histories-design]
xp: 40
---

## Pourquoi c'est important

Au chapitre sur la réplication, tu as vu qu'un réplica asynchrone peut renvoyer une valeur obsolète. Les bases répliquées promettent souvent seulement la **cohérence à terme**. C'est une promesse très faible, et c'est l'application qui en paie le prix : elle doit gérer des lectures qui « remontent le temps ». La linéarisabilité est la garantie inverse, la plus forte d'usage courant : le système se comporte comme s'il n'y avait **qu'une seule copie**. Savoir exactement ce qu'elle promet, et la reconnaître sur un historique d'opérations, est le préalable à tout le reste du chapitre (son coût, ses usages, et le consensus au chapitre suivant).

## Le spectre des garanties

La plupart des bases répliquées offrent au minimum la **cohérence à terme** : si tu arrêtes d'écrire et que tu attends un temps *non précisé*, toutes les répliques finiront par converger. Le livre suggère de dire plutôt **convergence** : la promesse porte sur la fin, pas sur le chemin. Tant que la convergence n'est pas faite, une lecture peut renvoyer n'importe quelle version, et deux lectures successives peuvent même se contredire.

Deux raisons rendent cette garantie traîtresse :

- elle est **différente** de ce qu'un développeur attend d'une variable dans un programme mono-thread : là, une lecture suit toujours l'écriture précédente ;
- ses bogues sont **subtils** : ils n'apparaissent que lors d'une panne ou d'une forte concurrence, donc rarement en test.

Ce chapitre et le suivant explorent des modèles plus forts. Ils coûtent plus cher (performance, tolérance aux pannes), mais ils sont plus faciles à utiliser correctement. Remarque : ces modèles de cohérence ressemblent aux niveaux d'isolation des transactions (modules 08 et 09), mais ils répondent à une autre question. L'isolation parle des **courses entre transactions concurrentes** ; la cohérence des répliques parle de **l'état des répliques face aux délais et aux pannes**.

## L'idée : une seule copie, des opérations atomiques

La linéarisabilité (aussi appelée cohérence atomique, forte, immédiate, ou externe) promet que même s'il existe plusieurs répliques, le client ne peut pas s'en rendre compte. Elle s'accompagne d'une **garantie de fraîcheur** (*recency guarantee*) : dès qu'une écriture est terminée, tous les clients qui lisent doivent voir la valeur écrite.

L'exemple du livre est parlant. Alice et Bob suivent la finale d'une Coupe du monde, chacun sur son téléphone. Alice rafraîchit, voit le score final et l'annonce à Bob. Bob rafraîchit **après** avoir entendu Alice, mais sa requête tombe sur un réplica en retard : sa page dit que le match continue. Si Bob avait rafraîchi avant qu'Alice parle, voir l'ancien score aurait été normal. Mais il sait, par un autre canal (la voix d'Alice), qu'un résultat plus récent existe déjà. Sa lecture est donc **non linéarisable**.

## Lire un historique d'opérations

Pour raisonner précisément, on dessine chaque opération d'un client comme un **intervalle** : elle commence quand la requête part, se termine quand la réponse arrive. Entre les deux, on ne sait pas quand la base l'a traitée. Prenons un registre `x` qui vaut 0, et un client A qui écrit `x = 1` entre les instants 0 et 10.

- Une lecture qui **chevauche** l'écriture peut renvoyer 0 **ou** 1 : on ne sait pas encore si l'écriture a pris effet.
- Une lecture qui **commence après la fin** de l'écriture doit renvoyer 1.

Mais cette règle ne suffit pas. Supposons que C lise entre 2 et 4 et voie **1**, puis que D lise entre 5 et 6 et voie **0**. Les deux lectures chevauchent l'écriture de A, chacune semble « permise ». Pourtant l'ensemble est impossible avec une seule copie : la valeur aurait basculé de 1 vers 0. D'où la règle clé :

> Dès qu'une lecture a renvoyé la nouvelle valeur, **toutes les lectures qui commencent ensuite** (chez n'importe quel client) doivent la renvoyer aussi, même si l'écriture n'est pas encore confirmée à son auteur.

Formellement, un historique est linéarisable s'il existe un **point** dans chaque intervalle, l'instant où l'opération « prend effet » atomiquement, tel que les points rangés dans l'ordre forment une exécution valide d'un registre unique. Visuellement : on doit pouvoir relier les points par une ligne qui avance toujours dans le temps, sans jamais revenir en arrière.

Deux conséquences pratiques :

- l'ordre réel compte : si l'opération P **se termine avant** que Q commence, P doit prendre effet avant Q ;
- deux opérations concurrentes (intervalles qui se chevauchent) peuvent être ordonnées dans n'importe quel sens, mais **un seul** ordre doit expliquer tout l'historique.

Vérifier la linéarisabilité d'un historique est possible (en essayant les ordres compatibles) mais coûteux : le projet de ce chapitre te fait écrire ce vérificateur, en petit.

## Compare-and-set

Un registre peut offrir plus que lire et écrire. L'opération **compare-and-set** `cas(x, v_ancien, v_nouveau)` remplace la valeur seulement si elle vaut encore `v_ancien` ; sinon elle échoue et renvoie une erreur sans rien modifier. Tu l'as croisée au module 08 contre les mises à jour perdues.

Sur un système linéarisable, `cas` a un sens fort : si deux clients font `cas(x, 0, "A")` et `cas(x, 0, "B")` en même temps, **un seul** réussit. Sur un système non linéarisable, deux répliques peuvent chacune voir 0 et accepter chacune leur `cas`, et les deux clients croient avoir gagné. Le chapitre suivant montrera que ce `cas` linéarisable est équivalent au **consensus**.

Exemple chiffré : un historique où A écrit 1 entre 0 et 2, puis B fait `cas(x, 1, 2)` entre 3 et 5 et échoue. Il n'est pas linéarisable : au début de B, la valeur ne pouvait plus être que 1 (aucune autre écriture), donc `cas` aurait dû réussir.

## Linéarisabilité ou sérialisabilité ?

Les deux mots se ressemblent et sont souvent confondus. Ils ne promettent pas la même chose :

| | Sérialisabilité | Linéarisabilité |
|---|---|---|
| Porte sur | des **transactions** qui touchent plusieurs objets | des opérations sur **un** objet (registre) |
| Promet | un résultat identique à une exécution **une par une, dans un ordre quelconque** | une **seule copie**, et un ordre qui respecte le **temps réel** |
| Fraîcheur | aucune : l'ordre sériel peut différer de l'ordre réel | oui, une lecture suit toute écriture terminée |

Une base peut offrir les deux : on parle de **sérialisabilité stricte** (ou forte). Le verrouillage à deux phases (2PL) et l'exécution réellement en série sont généralement linéarisables. L'**isolation par instantané sérialisable** (SSI) **ne l'est pas** par conception : une lecture se fait sur un instantané cohérent qui ne contient pas les écritures plus récentes que lui, même déjà validées. C'est justement ce qui lui évite de bloquer.

## Pièges fréquents

- **Croire qu'une lecture qui chevauche une écriture est toujours libre** : elle l'est seule, mais pas une fois qu'une autre lecture a vu la nouvelle valeur.
- **Confondre sérialisable et linéarisable** : une base « SERIALIZABLE » fondée sur des instantanés peut renvoyer une valeur obsolète.
- **Vérifier la linéarisabilité avec un seul client** : les anomalies naissent entre clients, souvent reliés par un canal extérieur (Alice qui parle à Bob).
- **Prendre la cohérence à terme pour « presque linéarisable »** : elle ne borne ni le délai, ni ce qu'on lit en attendant.

## À retenir

- Cohérence à terme = convergence, sans délai garanti. Linéarisabilité = illusion d'une copie unique avec garantie de fraîcheur.
- Une opération prend effet en un point de son intervalle ; l'historique est linéarisable si ces points forment une exécution valide d'un registre unique.
- Après qu'une lecture a vu une nouvelle valeur, aucune lecture postérieure ne peut revenir à l'ancienne.
- Sur un système linéarisable, un `cas` concurrent n'a qu'un gagnant.
- Sérialisabilité (transactions, ordre quelconque) ≠ linéarisabilité (objet, temps réel). Les deux ensemble : sérialisabilité stricte. SSI n'est pas linéarisable.
