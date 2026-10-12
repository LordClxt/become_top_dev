---
id: ddia-ch06-l06
title: 'Écritures concurrentes : LWW et happens-before'
source:
  chapter: 5
  pages: 184-187
duration_min: 35
concepts:
- id: ddia-concurrent-writes
  label: Des écritures arrivant dans des ordres différents sur des nœuds différents font diverger durablement les réplicas si on écrase simplement
- id: ddia-lww-leaderless
  label: 'LWW force un ordre arbitraire par horodatage : converge, mais jette des écritures confirmées (même non concurrentes)'
- id: ddia-happens-before
  label: A se produit avant B si B connaît A, dépend de A ou s'appuie dessus ; sinon A et B sont concurrents
- id: ddia-concurrency-relativity
  label: 'Concurrent ne veut pas dire « en même temps » : c''est l''ignorance mutuelle, quel que soit le temps physique'
glossary:
- term: happens-before
  definition: 'Relation de dépendance causale : l''opération B sait que A a eu lieu ou s''appuie sur elle.'
- term: opérations concurrentes
  definition: Deux opérations dont aucune ne connaît l'autre, quelle que soit l'heure à laquelle elles ont eu lieu.
- term: dépendance causale
  definition: B dépend de A si B n'aurait pas pu exister sans connaître A.
visuals: []
labs:
- ddia-ch06-l06-lab-concurrency-design
extra: false
xp: 35
---

## Pourquoi c'est important

Les bases Dynamo-style laissent plusieurs clients écrire **en même temps** la même clé : des conflits surviennent même avec des quorums stricts. Comme en multi-leader, ils peuvent aussi apparaître pendant la réparation à la lecture ou le hinted handoff. Le problème : à cause de délais réseau variables et de pannes partielles, les événements **arrivent dans un ordre différent** sur des nœuds différents.

Exemple : deux clients A et B écrivent simultanément la clé X dans un cluster de trois nœuds.

- le nœud 1 reçoit l'écriture de A, mais jamais celle de B (panne passagère) ;
- le nœud 2 reçoit A puis B ;
- le nœud 3 reçoit B puis A.

Si chaque nœud **écrase** simplement la valeur à chaque écriture reçue, ils deviennent **définitivement incohérents** : le nœud 2 pense que X vaut B, les autres pensent A. Pour être cohérents à terme, les réplicas doivent **converger** vers la même valeur. Beaucoup d'implémentations s'en tirent mal : si tu ne veux pas perdre de données, c'est à toi, développeur, de connaître le détail de la gestion des conflits de ta base.

## Dernier écrivain gagne

Une approche : chaque réplica ne garde que la valeur **la plus « récente »**, et les anciennes peuvent être écrasées. Si on peut déterminer sans ambiguïté laquelle est plus récente, et que chaque écriture finit par atteindre chaque réplica, ils convergent.

Les guillemets sont voulus : dans l'exemple, **aucun client ne connaissait l'autre** quand il a envoyé son écriture. Il n'a pas de sens de dire que l'une a eu lieu « en premier » : elles sont **concurrentes**, et leur ordre est indéfini. On peut toutefois **imposer** un ordre arbitraire : attacher un horodatage à chaque écriture, garder le plus grand, jeter les autres. C'est le **dernier écrivain gagne** (LWW), seule méthode de résolution de conflits de Cassandra, optionnelle dans Riak.

LWW assure la convergence, **au prix de la durabilité** : si plusieurs écritures concurrentes visent la même clé, même si toutes ont été annoncées réussies (écrites sur w réplicas), **une seule survit** et les autres sont silencieusement jetées. Pire, LWW peut même jeter des écritures **non concurrentes** (décalage d'horloges, module 10). Il y a des cas où perdre des écritures est acceptable (un cache). Si perdre des données est inacceptable, c'est un mauvais choix. La seule façon sûre de l'utiliser est de **n'écrire une clé qu'une fois** puis de la traiter comme immuable : c'est pourquoi on recommande, avec Cassandra, d'utiliser un **UUID comme clé**, ce qui donne à chaque opération d'écriture une clé unique.

## « Happens-before » et concurrence

Comment décider si deux opérations sont concurrentes ? Quelques exemples pour l'intuition :

- dans la figure du multi-leader (insertion d'une ligne par A, puis incrément de la ligne par B), les deux écritures **ne sont pas concurrentes** : l'insertion de A s'est produite avant l'incrément de B, car la valeur incrémentée par B est celle insérée par A. B s'appuie sur A, donc B est **causalement dépendante** de A ;
- à l'inverse, les deux écritures de A et B sur la clé X sont concurrentes : quand chaque client commence son opération, **il ne sait pas** que l'autre fait quelque chose sur la même clé. Il n'y a pas de dépendance causale.

Une opération A **se produit avant** B si B **connaît** A, **dépend** de A ou **s'appuie** sur A d'une manière ou d'une autre. On peut alors dire simplement que deux opérations sont **concurrentes** si **aucune ne se produit avant l'autre**, c'est-à-dire si aucune ne connaît l'autre.

Pour deux opérations A et B, trois cas : A avant B, B avant A, ou A et B concurrentes. Il faut un algorithme qui le détermine. Si une opération s'est produite avant l'autre, la plus récente **doit écraser** l'ancienne ; si elles sont concurrentes, on a un conflit à résoudre.

### Concurrence, temps et relativité

On pourrait croire que deux opérations sont concurrentes si elles ont lieu « en même temps ». En fait **le temps exact n'a pas d'importance** : à cause des problèmes d'horloges dans les systèmes distribués, il est difficile de savoir si deux événements ont eu lieu exactement au même moment. Pour définir la concurrence, on dit que deux opérations sont concurrentes si elles **s'ignorent mutuellement**, quel que soit l'instant physique où elles ont eu lieu. On fait parfois le lien avec la relativité restreinte : l'information ne voyage pas plus vite que la lumière, donc deux événements assez éloignés ne peuvent pas s'influencer si le temps qui les sépare est plus court que celui que mettrait la lumière. En informatique, deux opérations peuvent être concurrentes même si la vitesse de la lumière aurait permis à l'une d'influencer l'autre : si le réseau est lent ou coupé, deux opérations espacées dans le temps peuvent rester concurrentes.


## Pièges fréquents

- **Dire « la dernière écriture » sans définir « dernière »** : sans connaissance mutuelle, il n'y en a pas.
- **Utiliser LWW pour des données qui comptent** (panier, solde) : des écritures confirmées disparaissent.
- **Confondre concurrent et simultané** : l'ignorance mutuelle suffit.
- **Réutiliser une clé** dans un système LWW au lieu d'un UUID par écriture.

## À retenir

- Sans précaution, des écritures arrivées dans des ordres différents font diverger les réplicas.
- LWW converge mais jette des écritures confirmées ; sûr seulement si les clés sont écrites une fois.
- A se produit avant B si B connaît ou dépend de A ; sinon, A et B sont concurrentes, indépendamment de l'horloge.
