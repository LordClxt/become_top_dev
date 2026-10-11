## Contexte

Tinybase sert maintenant de grand livre à un service de virements. Les comptes sont répartis sur plusieurs partitions, l'application mobile réessaie dès qu'une réponse tarde, et des processeurs peuvent planter puis relire leur log. Ton but : qu'un clic ne produise **qu'un seul effet**, sans aucun commit atomique distribué, et pouvoir **prouver** après coup que les soldes sont justes. Les types, `Partition` (FNV-1a modulo n) et les erreurs sont fournis.

## Jalon 1 — Une requête, un effet
- `Submit(r)` refuse une requête invalide (`ErrInvalid` : identifiant ou compte vide, virement vers soi-même, montant ≤ 0). Une requête déjà vue renvoie **sa position d'origine** avec `dup = true` sans rien ajouter ; le même identifiant avec un **autre contenu** donne `ErrIDReuse`. `Log()` renvoie une copie.
- `Split(r)` renvoie `[débit du payeur, crédit du bénéficiaire]`, tous deux porteurs de `r.ID`.
- `Shard.Apply(in)` applique une instruction **une seule fois** (clé : requête, compte, opération) et renvoie `false` pour un doublon.
- `Deliver(shards, log)` envoie chaque instruction à `shards[Partition(compte, len(shards))]`. Relivrer tout ou partie du log ne change rien.

## Jalon 2 — Premier arrivé dans le log
- `Normalize` : minuscules, sans espaces autour. `Append` place la demande dans la partition du pseudo **normalisé**.
- `Process(p)` traite **dans l'ordre** les demandes nouvelles de la partition `p` : pseudo libre → attribué, `OK` ; pris par un autre → refus ; pris par le même utilisateur → `OK`. Une demande déjà décidée (même `RequestID`) reçoit **la même décision**. Un second appel sans nouveauté n'émet rien.
- `Owner(nom)` retrouve le propriétaire, quelle que soit la casse.

## Jalon 3 — Faire confiance, mais vérifier
- `Expected(log)` recalcule les soldes (départ à 0) en ne comptant **qu'une fois** chaque identifiant.
- `Collect(shards)` rassemble les soldes de toutes les partitions.
- `Audit(log, observed)` renvoie chaque compte dont le solde observé diffère du recalcul, **trié par compte** ; un compte absent d'un côté vaut 0 de ce côté.

## Exemple
`t1 : alice → bob, 11` est soumis trois fois (réponses perdues). Le log n'a qu'une entrée, alice est à −11 et bob à +11, même si le répartiteur plante et relivre. Si un bug crédite bob deux fois, l'auditeur renvoie `{bob, attendu 11, observé 22}`.
