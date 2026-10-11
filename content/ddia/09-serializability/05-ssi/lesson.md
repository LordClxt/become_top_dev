---
id: ddia-ch09-l05
title: "La sérialisabilité par snapshot (SSI)"
source: { chapter: 7, pages: "261-266" }
duration_min: 40
concepts:
  - id: ddia-optimistic-vs-pessimistic
    label: "Pessimiste (2PL, exécution en série) : attendre dès qu'un conflit est possible. Optimiste (SSI) : avancer, puis vérifier au commit"
  - id: ddia-ssi-outdated-premise
    label: "Une transaction agit sur une prémisse (le résultat d'une lecture) ; la base doit détecter quand cette prémisse est devenue fausse"
  - id: ddia-ssi-stale-mvcc-read
    label: "Lecture MVCC périmée : la transaction a ignoré une écriture non validée qui est validée avant son propre commit"
  - id: ddia-ssi-write-after-read
    label: "Écriture après lecture : un fil-piège dans l'index prévient les lecteurs récents qu'une donnée lue a changé, sans bloquer"
  - id: ddia-ssi-abort-at-commit
    label: "SSI n'abandonne qu'au commit, et seulement si la transaction a écrit et que l'écriture conflictuelle a été validée"
  - id: ddia-ssi-performance
    label: "SSI : pas de blocage, lectures seules sans verrou, distribuable ; mais un taux d'abandon qui exige des transactions d'écriture courtes"
glossary:
  - term: "sérialisabilité par snapshot (serializable snapshot isolation, SSI)"
    definition: "Algorithme optimiste de sérialisabilité, publié en 2008 : la snapshot isolation, plus une détection des conflits de sérialisation qui abandonne les transactions fautives au commit."
  - term: "contrôle de concurrence optimiste"
    definition: "Laisser les transactions avancer sans bloquer, et vérifier au moment du commit si l'isolation a été violée ; si oui, abandonner."
  - term: "contrôle de concurrence pessimiste"
    definition: "Empêcher a priori tout conflit possible, en attendant (verrous) ou en supprimant la concurrence."
  - term: "prémisse"
    definition: "Le fait, lu au début d'une transaction, sur lequel elle fonde sa décision (« il reste deux médecins de garde »)."
  - term: "opération commutative"
    definition: "Opération dont le résultat ne dépend pas de l'ordre d'application (incrémenter un compteur) ; elle ne crée pas de vrai conflit."
visuals: []
labs: [ddia-ch09-l05-lab-ssi-design]
xp: 40
---

## Pourquoi c'est important

Le tableau jusqu'ici est sombre : l'exécution en série ne passe pas à l'échelle, le 2PL bloque et ses latences s'effondrent, et les isolations faibles laissent passer le *write skew*. Faut-il choisir entre la correction et la performance ? Un algorithme plus récent dit que non : la **sérialisabilité par snapshot** (*serializable snapshot isolation*, **SSI**), décrite en **2008** par Michael Cahill. Elle offre la sérialisabilité complète pour un coût proche de la snapshot isolation. On la trouve dans **PostgreSQL** (depuis la 9.1, quand tu demandes `SERIALIZABLE`) et dans des bases distribuées comme **FoundationDB**. C'est probablement l'algorithme que tu rencontreras le plus souvent.

## Pessimiste ou optimiste

Le 2PL est un contrôle de concurrence **pessimiste** : dès que quelque chose **pourrait** mal tourner (un autre détient un verrou), on attend que ce soit sans danger. C'est l'équivalent de l'exclusion mutuelle des programmes multi-threads. L'exécution en série est pessimiste à l'extrême : chaque transaction a un verrou exclusif sur toute la base (ou sa partition).

SSI est **optimiste** : au lieu de bloquer, les transactions avancent en espérant que tout se passera bien. Au moment du **commit**, la base vérifie si quelque chose de mal s'est produit, c'est-à-dire si l'isolation a été violée. Si oui, la transaction est **abandonnée** et doit être relancée. Seules les transactions qui ont réellement agi de façon sérialisable sont autorisées à valider.

Le compromis est classique :

- avec une **forte contention** (beaucoup de transactions sur les mêmes objets), l'optimiste fonctionne **mal** : une grande part des transactions est abandonnée, et si le système tourne déjà près de son débit maximal, les relances ajoutent de la charge et aggravent tout ;
- avec de la **marge** de capacité et une contention modérée, l'optimiste fait **mieux** que le pessimiste, puisque personne n'attend.

La contention se réduit avec des **opérations commutatives** : si plusieurs transactions incrémentent le même compteur, l'ordre n'importe pas, et la base peut appliquer les incréments sans conflit, tant que la transaction ne lit pas la valeur dans la même transaction.

SSI s'appuie sur la **snapshot isolation** du chapitre précédent : toutes les lectures d'une transaction viennent d'un **snapshot cohérent**. Elle y ajoute un algorithme qui détecte les conflits de sérialisation entre écritures et décide quelles transactions abandonner.

## Des décisions fondées sur une prémisse périmée

Rappelle-toi la forme du *write skew* : la transaction **lit** des données, **examine** le résultat, et **décide** d'une action selon ce qu'elle a vu. Les deux médecins Alice et Bob lisent « deux médecins de garde », et chacun se retire.

Sous snapshot isolation, le résultat de la lecture peut ne plus être vrai au moment du commit : quelqu'un l'a modifié entre-temps. La lecture était une **prémisse** (« il y a au moins deux médecins de garde »), et l'écriture n'est correcte que si la prémisse l'est encore. La base ne sait pas comment l'application utilise ce qu'elle a lu ; par prudence, elle suppose que **toute modification d'une donnée lue** peut invalider l'écriture.

Elle doit donc détecter les situations où une transaction a pu agir sur une prémisse périmée, et l'abandonner. Il y a deux cas, selon que l'écriture conflictuelle a lieu **avant** ou **après** la lecture.

## Cas 1 : la lecture d'une version MVCC périmée

Avec le MVCC, une transaction ignore les écritures des transactions **non encore validées** au moment de son snapshot. Supposons que T42 met `alice.on_call = false` sans avoir encore validé. T43 prend son snapshot, lit Alice, et la voit **toujours de garde** : elle a ignoré l'écriture de T42, conformément aux règles de visibilité. Puis T42 valide. Quand T43 veut valider à son tour, la prémisse « Alice est de garde » est **fausse**.

La base **retient** donc chaque fois qu'une transaction ignore l'écriture d'une autre à cause des règles de visibilité MVCC. Au commit, elle vérifie si l'une de ces écritures ignorées **a été validée** entre-temps. Si oui, la transaction est abandonnée.

Pourquoi attendre le commit au lieu d'abandonner T43 dès la lecture périmée ?

- Si T43 est une transaction **en lecture seule**, elle n'a rien écrit sur la base de sa prémisse : aucun risque de *write skew*, pas besoin de l'abandonner.
- Au moment de la lecture, la base ne sait pas encore si T43 **écrira** quelque chose.
- T42 peut encore **abandonner**, ou ne pas avoir validé quand T43 valide : la lecture n'était alors pas périmée du tout.

Attendre évite les abandons inutiles, et préserve la force de la snapshot isolation : les longues lectures sur un snapshot cohérent.

## Cas 2 : une écriture qui affecte des lectures antérieures

Le second cas : l'autre transaction modifie les données **après** qu'elles ont été lues. La technique ressemble aux verrous de plage d'index de la leçon précédente, **sauf qu'elle ne bloque pas**.

T42 et T43 cherchent toutes deux les médecins de garde pour la garde `1234`. S'il existe un index sur `shift_id`, la base peut **noter dans l'entrée `1234` de l'index** que T42 et T43 ont lu ces données. (Sans index, elle peut noter la lecture au niveau de la table.) Cette information ne sert que tant que la transaction est en cours : une fois que T42 et T43 sont terminées **et** que toutes les transactions concurrentes le sont aussi, la base peut l'oublier.

Quand une transaction **écrit**, elle regarde dans les index quelles autres transactions ont **récemment lu** les données touchées. C'est comme prendre un verrou d'écriture, mais au lieu d'**attendre** que les lecteurs aient validé, le verrou agit comme un **fil-piège** : il **prévient** simplement ces transactions que ce qu'elles ont lu n'est peut-être plus à jour.

Dans l'exemple, T43 prévient T42 que sa lecture est dépassée, et T42 prévient T43 de même. T42 valide **la première** : elle réussit. L'écriture de T43 la concernait, mais T43 n'avait pas encore validé, donc cette écriture n'avait pas encore pris effet. Quand T43 veut valider, en revanche, l'écriture conflictuelle de T42 est **déjà validée** : T43 doit abandonner. Bob reste de garde ; l'application de T43 relance, relit, et voit qu'il ne reste qu'un médecin.

## Les performances de SSI

Comme toujours, les détails pratiques comptent :

- **La granularité du suivi** : suivre lectures et écritures très finement permet de savoir précisément quelles transactions abandonner, mais la comptabilité coûte cher. Un suivi plus grossier va plus vite, mais abandonne plus de transactions que nécessaire. Dans certains cas, lire une donnée écrasée ensuite est sans danger : selon ce qui s'est passé par ailleurs, on peut prouver que le résultat reste sérialisable. PostgreSQL s'appuie sur cette théorie pour réduire les abandons inutiles.
- **Face au 2PL**, le gros avantage : une transaction n'a **jamais besoin d'attendre** les verrous d'une autre. Comme en snapshot isolation, les écrivains ne bloquent pas les lecteurs et inversement. La latence est bien **plus prévisible**, et les **requêtes en lecture seule** tournent sur un snapshot sans **aucun verrou**, ce qui est très attrayant pour les charges très lues.
- **Face à l'exécution en série**, SSI n'est pas limitée au débit **d'un cœur** : FoundationDB répartit la détection des conflits sur plusieurs machines, ce qui permet un très grand débit, et des données partitionnées sur plusieurs machines restent sérialisables d'une partition à l'autre.
- **Le taux d'abandon** détermine la performance globale. Une transaction qui lit et écrit pendant longtemps a de bonnes chances de rencontrer un conflit et d'être abandonnée. SSI exige donc des transactions **d'écriture courtes** ; les longues transactions en **lecture seule** restent sans problème. SSI est malgré tout moins sensible aux transactions lentes que le 2PL ou l'exécution en série.

Un ordre de grandeur pour sentir le dernier point : si chaque seconde passée dans une transaction d'écriture donne 2 % de risque qu'une autre transaction invalide une prémisse, une transaction de 1 seconde est abandonnée environ 2 fois sur 100, une transaction de 30 secondes environ 45 fois sur 100 (1 − 0,98³⁰). Les longues transactions d'écriture paient très cher.

## Aller plus loin : SSI dans PostgreSQL

*(Au-delà du livre.)* PostgreSQL implémente SSI avec des verrous « SIRead » qui ne bloquent jamais ; ils ne servent qu'à repérer les dépendances lecture-écriture entre transactions concurrentes. Il abandonne une transaction quand il voit une « structure dangereuse » : deux dépendances consécutives entre transactions concurrentes, ce qui couvre tous les cycles possibles, au prix de quelques faux positifs. L'erreur renvoyée a le code SQLSTATE `40001` (*serialization_failure*) : ton code doit l'attraper et **relancer toute la transaction**, lectures comprises, comme pour un interblocage. Subtilité : dans de rares cas, PostgreSQL peut aussi abandonner une transaction en lecture seule (« anomalie de lecture seule ») ; `SERIALIZABLE READ ONLY DEFERRABLE` l'évite en attendant un snapshot dont il sait qu'il est sûr.

```go
for attempt := 0; attempt < 5; attempt++ {
	err := runTx(ctx, db) // BEGIN ISOLATION LEVEL SERIALIZABLE … COMMIT
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "40001" {
		continue // prémisse périmée : on relit tout et on recommence
	}
	return err
}
```

## Pièges fréquents

- **Ne pas relancer sur erreur de sérialisation** : sous SSI, l'abandon au commit est normal ; sans relance, l'utilisateur voit une erreur.
- **Relancer seulement l'écriture** : il faut tout recommencer, lecture de la prémisse comprise.
- **Garder ouverte une longue transaction d'écriture** sous SSI : son risque d'abandon grimpe avec sa durée.
- **Croire que SSI ne coûte rien sous forte contention** : sur un compteur très disputé lu puis écrit, les abandons et relances peuvent saturer la base.
- **Penser qu'une lecture périmée suffit à abandonner** : seules comptent les transactions qui écrivent, et seulement si l'écriture conflictuelle a été validée.

## À retenir

- SSI = snapshot isolation + détection des conflits de sérialisation ; optimiste : on avance, on vérifie au commit.
- Une écriture repose sur une **prémisse** lue ; la base abandonne la transaction quand cette prémisse a pu devenir fausse.
- Deux détections : la lecture d'une version MVCC qui ignorait une écriture validée depuis, et l'écriture d'une autre transaction après la lecture (fil-piège dans l'index, sans blocage).
- Abandon seulement au commit, et seulement pour une transaction qui a écrit sur une prémisse devenue fausse : les lectures seules sur snapshot ne sont, en principe, pas pénalisées.
- Pas d'attente, latences prévisibles, distribuable ; mais les transactions d'écriture doivent rester courtes et la contention modérée.
