## Hint 1
Chaque trait de la chaîne (`Timestamped`, `Audited`, `Validated`) redéfinit `String save()` et appelle `super.save()` pour continuer. `Persistent` termine la chaîne. Rappelle-toi : le trait **le plus à droite** dans `implements` s'exécute en premier.

## Hint 2
`Validated` doit s'exécuter avant tous les autres : place-le le plus à droite. Dans `Audited`, appelle d'abord `def r = super.save()`, puis journalise si `r.startsWith('saved')`. Attention : `saveCount++` ne compile pas sur une propriété de trait.

## Hint 3
`trait Audited { abstract String getAuditName(); List<String> auditLog = []; int saveCount = 0; … saveCount += 1 … }`. Ordre possible : `class Ticket implements Persistent, Timestamped, Audited, SoftDeletable, Validated`.
