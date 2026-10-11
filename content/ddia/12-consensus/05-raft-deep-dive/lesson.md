---
id: ddia-ch12-l05
title: "Aller plus loin : Raft de l'intérieur"
source: { chapter: 9, pages: "366-368" }
duration_min: 40
concepts:
  - id: ddia-raft-terms-roles
    label: "Rôles (follower, candidat, leader) et termes : le terme le plus récent gagne, un nœud qui voit un terme plus grand redevient follower"
  - id: ddia-raft-election
    label: "Élection : timeout aléatoire, le candidat incrémente son terme, vote pour lui et demande une majorité de voix"
  - id: ddia-raft-vote-restriction
    label: "Règle de vote : une voix par terme, et seulement pour un candidat dont le log est au moins aussi à jour"
  - id: ddia-raft-log-matching
    label: "AppendEntries et vérification de cohérence (prevLogIndex, prevLogTerm) ; le leader recule nextIndex jusqu'au point d'accord"
  - id: ddia-raft-commit-index
    label: "commitIndex : une entrée du terme courant est validée dès qu'une majorité la détient ; les anciennes le sont par ricochet"
glossary:
  - term: "terme (term)"
    definition: "Numéro d'époque de Raft : chaque élection ouvre un nouveau terme ; au plus un leader par terme."
  - term: "RequestVote"
    definition: "Message par lequel un candidat demande une voix, en annonçant son terme et l'index et le terme de sa dernière entrée de log."
  - term: "AppendEntries"
    definition: "Message du leader qui ajoute des entrées au log d'un follower (vide, il sert de battement de cœur)."
  - term: "nextIndex / matchIndex"
    definition: "Pour chaque follower, le leader retient le prochain index à lui envoyer et le plus grand index qu'il sait répliqué chez lui."
  - term: "commitIndex"
    definition: "Plus grand index de log connu comme validé : les entrées jusqu'à lui peuvent être appliquées à la machine à états."
visuals: []
labs: [ddia-ch12-l05-lab-raft-trace]
extra: true
xp: 40
---

## Pourquoi c'est important

> **Aller plus loin.** Le livre cite Raft parmi les algorithmes de consensus sans le détailler. Cette leçon le décrit d'après l'article d'Ongaro et Ousterhout (2014), qui a été conçu pour être compréhensible. Elle prépare directement le projet Tinybase du chapitre.

Raft fait tourner etcd (donc Kubernetes), Consul, CockroachDB, TiKV, et Kafka en mode KRaft. Comprendre ses deux règles centrales, celle du vote et celle de la cohérence du log, c'est comprendre concrètement comment les époques et les quorums de la leçon 3 empêchent deux leaders de diverger.

## Rôles et termes

Chaque nœud est dans l'un de trois rôles :

- **follower** : passif, il répond aux messages du leader et des candidats ;
- **candidat** : il tente de devenir leader ;
- **leader** : il reçoit les commandes des clients et les réplique.

Le temps est découpé en **termes** numérotés 1, 2, 3… : c'est le numéro d'époque de Raft. Chaque terme commence par une élection ; il y a **au plus un leader par terme** (parfois aucun, si le vote est partagé). Chaque nœud retient son `currentTerm` sur disque, et chaque message porte le terme de son émetteur. Deux règles simples :

- un nœud qui reçoit un message d'un terme **plus grand** que le sien adopte ce terme et redevient **follower** (un leader qui sort d'une pause apprend ainsi qu'il a été remplacé) ;
- un message d'un terme **plus petit** est refusé.

## L'élection

Le leader envoie régulièrement des `AppendEntries` vides, ses **battements de cœur**. Un follower qui n'en reçoit plus pendant son **timeout d'élection** suppose le leader mort. Ce timeout est **aléatoire**, par exemple tiré entre 150 et 300 ms : ainsi, en général, un seul follower se réveille en premier et gagne avant que les autres ne se présentent.

Le follower qui se réveille :

1. incrémente son terme (de 4 à 5, par exemple) et devient candidat ;
2. **vote pour lui-même** ;
3. envoie `RequestVote(terme 5, son id, index et terme de sa dernière entrée)` à tous les autres.

Il devient leader s'il obtient une **majorité** de voix (3 sur 5). S'il reçoit un `AppendEntries` d'un leader de terme au moins égal, il redevient follower. Si personne ne gagne (vote partagé), un nouveau timeout aléatoire relance une élection au terme suivant.

## La règle de vote

Un nœud accorde sa voix selon deux conditions :

1. **une voix par terme** : il retient `votedFor` sur disque ; s'il a déjà voté pour un autre candidat dans ce terme, il refuse ;
2. **le log du candidat est au moins aussi à jour que le sien** : on compare d'abord le **terme de la dernière entrée**, le plus grand gagne ; à terme égal, le log le plus **long** gagne.

```go
// upToDate dit si le log du candidat est au moins aussi à jour que le mien.
func upToDate(candLastTerm, candLastIndex, myLastTerm, myLastIndex int) bool {
	if candLastTerm != myLastTerm {
		return candLastTerm > myLastTerm
	}
	return candLastIndex >= myLastIndex
}
```

Pourquoi cette seconde règle ? Une entrée validée est présente sur une majorité. Un candidat a besoin d'une majorité de voix. Les deux majorités se **chevauchent** : au moins un votant détient l'entrée validée, et il refusera un candidat qui ne l'a pas. Résultat : **tout leader élu possède toutes les entrées validées** (propriété de complétude du leader). C'est le chevauchement de quorums de la leçon 3, appliqué au contenu du log.

Exemple : A a pour dernière entrée (index 7, terme 3), B a (index 9, terme 2). A est plus à jour, malgré un log plus court : son dernier terme est plus récent. B ne recevra pas la voix de A.

## Répliquer le log : AppendEntries

Le leader ajoute chaque commande client à son log, avec le terme courant, puis l'envoie aux followers. Chaque `AppendEntries` porte :

- `prevLogIndex` et `prevLogTerm` : l'index et le terme de l'entrée **juste avant** les nouvelles ;
- les nouvelles entrées ;
- `leaderCommit`, le `commitIndex` du leader.

Le follower fait la **vérification de cohérence** : s'il n'a pas d'entrée à `prevLogIndex` portant le terme `prevLogTerm`, il **refuse**. S'il accepte, il supprime toute entrée en **conflit** (même index, terme différent) et tout ce qui suit, puis ajoute les entrées manquantes.

Par récurrence, cette vérification garantit la **propriété de correspondance des logs** : si deux logs ont une entrée de même index et de même terme, ils sont **identiques jusqu'à cet index**.

Quand un follower refuse, le leader **décrémente** `nextIndex` pour ce follower et réessaie, jusqu'à trouver le point où les deux logs concordent. Il écrase alors tout ce qui diverge chez le follower. Le leader, lui, n'efface jamais rien de son propre log.

Exemple : le leader (terme 6) a 10 entrées ; un follower revenu d'une panne n'en a que 6, dont la 6ᵉ, de terme 3, n'existe pas chez le leader (qui a un terme 4 à l'index 6). Le leader essaie d'abord `prevLogIndex = 10` : refus (le follower n'a pas d'entrée 10). Puis 9, 8, 7 : refus pour la même raison. Puis 6 : refus (terme 3 contre 4). Puis 5 : accepté. Le follower supprime son entrée 6 et reçoit les entrées 6 à 10 du leader.

## Valider : commitIndex

Le leader suit, pour chaque follower, `matchIndex` : le plus grand index qu'il sait répliqué chez lui. Une entrée d'index N est **validée** quand une **majorité** de nœuds (leader compris) la détiennent. Le leader avance alors `commitIndex` à N, applique les entrées à sa machine à états, répond au client, et transmet `leaderCommit` aux followers, qui avancent leur propre `commitIndex` à `min(leaderCommit, index de leur dernière nouvelle entrée)`.

Calcul pratique sur 5 nœuds : le leader a 12 entrées, les `matchIndex` des quatre followers valent 12, 9, 7 et 4. Combien de nœuds ont l'index 9 ? Le leader, le follower à 12 et celui à 9 : 3 sur 5, majorité. L'index 10 n'est détenu que par 2 nœuds. Donc `commitIndex = 9`.

**La subtilité** : le leader ne valide **par comptage** que des entrées **de son propre terme**. Une entrée d'un terme précédent peut être présente sur une majorité et pourtant être écrasée plus tard, si un candidat dont le dernier terme est plus récent est élu. En revanche, dès qu'une entrée du terme courant est validée, toutes celles qui la précèdent le sont aussi, par la propriété de correspondance. En pratique, un nouveau leader ajoute souvent une entrée vide au début de son terme pour débloquer la validation.

## Pièges fréquents

- **Comparer les logs par leur longueur seule** : c'est le terme de la dernière entrée qui prime.
- **Oublier de persister `currentTerm` et `votedFor`** : après un redémarrage, un nœud pourrait voter deux fois dans le même terme, et deux leaders seraient élus.
- **Écraser des entrées qui concordent** : on ne tronque qu'en cas de conflit (même index, terme différent), sinon un vieux message retardé effacerait des entrées valides.
- **Valider une entrée d'un ancien terme parce qu'elle est sur une majorité** : seul le terme courant se valide par comptage.
- **Des timeouts d'élection identiques** : tous les followers se présentent en même temps, et les votes se partagent sans fin.

## À retenir

- Termes = époques ; un message de terme plus grand fait redevenir follower, un message de terme plus petit est refusé.
- Élection : timeout aléatoire, terme + 1, vote pour soi, majorité requise.
- Vote : une voix par terme, pour un log au moins aussi à jour (dernier terme, puis longueur) ; d'où la complétude du leader.
- AppendEntries : vérification `prevLogIndex`/`prevLogTerm`, suppression des conflits, recul de `nextIndex`.
- `commitIndex` avance quand une majorité détient une entrée **du terme courant**.
