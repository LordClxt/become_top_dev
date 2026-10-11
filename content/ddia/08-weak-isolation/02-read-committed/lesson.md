---
id: ddia-ch08-l02
title: "Read committed : ni lecture sale, ni écriture sale"
source: { chapter: 7, pages: "233-237" }
duration_min: 30
concepts:
  - id: ddia-weak-isolation-levels
    label: "La sérialisabilité coûte cher : les bases proposent des niveaux plus faibles, dont les anomalies causent de vrais bogues"
  - id: ddia-dirty-read
    label: "Pas de lecture sale : une transaction ne voit que des données validées"
  - id: ddia-dirty-write
    label: "Pas d'écriture sale : on n'écrase pas une valeur qu'une autre transaction n'a pas encore validée"
  - id: ddia-read-committed-impl
    label: "Implémentation : verrou de ligne pour écrire, ancienne valeur validée servie aux lecteurs (pas de verrou de lecture)"
  - id: ddia-read-committed-limits
    label: "Read committed laisse passer les mises à jour perdues et les lectures incohérentes dans le temps"
glossary:
  - term: "niveau d'isolation faible"
    definition: "Niveau qui protège contre certaines anomalies de concurrence, mais pas toutes : read committed, snapshot isolation…"
  - term: "lecture sale (dirty read)"
    definition: "Lire une écriture qu'une autre transaction n'a pas encore validée, et qui sera peut-être annulée."
  - term: "écriture sale (dirty write)"
    definition: "Écraser une valeur écrite par une transaction qui n'a pas encore validé."
  - term: "read uncommitted"
    definition: "Niveau qui empêche les écritures sales mais autorise les lectures sales."
  - term: "verrou de ligne (row-level lock)"
    definition: "Verrou pris sur un objet par la transaction qui veut l'écrire, et gardé jusqu'à son commit ou son abort."
visuals: []
labs: [ddia-ch08-l02-lab-read-committed-timeline]
xp: 40
---

## Pourquoi c'est important

Si deux transactions ne touchent pas les mêmes données, elles peuvent tourner en parallèle sans risque. Les problèmes de concurrence (*race conditions*) n'apparaissent que lorsque l'une lit une donnée que l'autre modifie, ou que les deux modifient la même. Ces bogues sont **durs à tester** : ils ne se produisent que si le timing est malchanceux, parfois une fois par mois en production, et sont presque impossibles à reproduire. Les bases ont donc toujours voulu cacher la concurrence derrière l'**isolation**. Cette leçon présente le premier niveau réellement utilisé, **read committed**, et ce qu'il laisse passer.

## Les niveaux d'isolation faibles

L'idéal est la **sérialisabilité** : la base garantit que tout se passe comme si les transactions s'exécutaient une par une. Mais elle a un coût de performance, et beaucoup de bases ne veulent pas le payer par défaut. Elles proposent des niveaux **plus faibles**, qui protègent contre **certaines** anomalies seulement.

Ces anomalies ne sont pas théoriques. Elles ont causé des pertes d'argent, déclenché des enquêtes d'auditeurs financiers et corrompu des données clients. Le conseil « pour des données financières, utilise une base ACID » ne suffit pas : beaucoup de bases relationnelles réputées ACID tournent par défaut à un niveau faible. Il faut connaître les anomalies une par une, savoir lesquelles ton niveau empêche, et coder en conséquence. C'est le programme des leçons qui suivent.

## Read committed : deux garanties

Read committed est le niveau le plus simple qui mérite le nom. Il garantit deux choses :

1. en **lisant**, tu ne vois que des données **validées** (pas de lecture sale) ;
2. en **écrivant**, tu n'écrases que des données **validées** (pas d'écriture sale).

Il est par défaut dans Oracle 11g, PostgreSQL, SQL Server 2012, MemSQL et bien d'autres. (Le niveau en dessous, **read uncommitted**, empêche les écritures sales mais pas les lectures sales.)

### Pas de lecture sale

Une **lecture sale**, c'est voir une écriture qu'une autre transaction n'a pas encore validée. Deux raisons de l'interdire :

- **voir un état à moitié fait.** Reprenons la messagerie : la transaction de livraison insère le message, *puis* incrémente `unread_count`. Un lecteur sale peut voir le nouveau message avec l'ancien compteur, alors que l'utilisateur croit avoir « 0 message non lu ». Une transaction qui met à jour plusieurs objets doit être vue **en entier ou pas du tout** ;
- **voir une écriture qui va être annulée.** Si la transaction abandonne, tout ce que le lecteur sale a lu n'a jamais existé. Il a peut-être déjà pris une décision (envoyé une notification, calculé un total) sur des données fantômes.

Un exemple chiffré : x vaut 500. T1 écrit x = 300 sans valider. En read committed, T2 lit **500**. Une fois T1 validée, T2 lit **300**.

### Pas d'écriture sale

Une **écriture sale**, c'est écraser une valeur qu'une autre transaction a écrite mais pas encore validée. Read committed fait **attendre** le second écrivain jusqu'au commit ou à l'abort du premier.

Pourquoi c'est vital : sur un site de voitures d'occasion, acheter une voiture fait deux écritures, l'annonce (`listings.buyer`) et la facture (`invoices.recipient`). Alice et Bob achètent la même voiture au même moment. Avec des écritures sales, les deux transactions s'entrelacent : l'annonce peut finir au nom de Bob et la facture au nom d'Alice. Interdire l'écriture sale suffit à garder les deux tables d'accord.

## Comment l'implémenter

### Les écritures : un verrou de ligne

Presque toutes les bases empêchent l'écriture sale avec des **verrous de ligne** : une transaction qui veut modifier un objet (une ligne, un document) prend son verrou, et le garde **jusqu'à la fin** de la transaction. Un seul écrivain à la fois par objet ; un second écrivain attend. C'est fait automatiquement par la base en read committed (et aux niveaux plus forts).

### Les lectures : surtout pas de verrou

On pourrait empêcher la lecture sale avec le même verrou : un lecteur le prend brièvement et le relâche aussitôt. Mais c'est une mauvaise idée en pratique : **une seule transaction d'écriture longue** (une migration qui met à jour un million de lignes pendant deux minutes) bloquerait **toutes** les lectures de ces lignes pendant deux minutes. Une petite partie lente de l'application en ralentirait tout le reste.

À la place, la plupart des bases retiennent pour chaque objet écrit **deux valeurs** : l'**ancienne valeur validée**, et la **nouvelle valeur** de la transaction qui tient le verrou. Tant que cette transaction n'a pas validé, les autres lisent l'ancienne valeur ; au commit, tout le monde passe à la nouvelle. Les lecteurs ne bloquent jamais les écrivains, et inversement. Coût : de la mémoire pour les anciennes valeurs, proportionnelle à ce qui est écrit sans être encore validé. (Quelques bases, comme IBM DB2 ou SQL Server avec `read_committed_snapshot=off`, utilisent bien des verrous de lecture.)

> Rappel du chapitre sur le stockage : un B-tree garde un seul exemplaire de chaque clé et le modifie en place ; c'est pourquoi la base doit garder **ailleurs** l'ancienne valeur à servir aux lecteurs. La leçon suivante généralise cette idée à plusieurs versions.

## Ce que read committed ne fait pas

Read committed empêche deux anomalies, pas toutes :

- **le compteur concurrent** du début du chapitre : deux transactions lisent 42, ajoutent 1, écrivent 43. Ce n'est pas une écriture sale : la seconde écrit **après** le commit de la première. L'incrément est quand même perdu (leçon 4) ;
- **les lectures incohérentes dans le temps** : une transaction qui lit deux comptes à deux instants peut voir un virement « à moitié », chaque lecture portant sur des données validées. C'est le *read skew* de la leçon suivante.

## Pièges fréquents

- **Croire que read committed rend une transaction sûre** : il empêche les lectures et écritures sales, pas les mises à jour perdues.
- **Confondre écriture sale et mise à jour perdue** : la première écrase une valeur non validée ; la seconde écrase une valeur validée qu'on a lue trop tôt.
- **Prendre des verrous de lecture « par prudence »** : une transaction longue bloque alors tous les lecteurs.
- **Oublier que read uncommitted autorise les lectures sales** : il ne protège que des écritures sales.

## À retenir

- Les niveaux faibles existent parce que la sérialisabilité coûte ; leurs anomalies font de vrais dégâts.
- Read committed : on ne lit et n'écrase que du validé.
- Écritures : verrou de ligne gardé jusqu'au commit. Lectures : l'ancienne valeur validée, sans verrou.
- Read committed laisse passer le compteur perdu et les lectures incohérentes dans le temps.
