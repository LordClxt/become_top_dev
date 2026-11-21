## Hint 1
Relis la règle dedans/dehors de la leçon : dans une méthode de `Ticket`, que fait `status = 'CLOSED'` ? Et par où GORM apprend-il qu'une propriété a changé ?

## Hint 2
GORM marque une propriété comme modifiée dans son **setter** (`markDirty`). Une écriture directe du champ ne passe pas par là. Il faut donc que chaque modification passe par l'accesseur, y compris l'incrément de `reopenCount` et la remise à `null` de `closedAt`.

## Hint 3
`setStatus('CLOSED')`, `setClosedAt(new Date())`, `setReopenCount(reopenCount + 1)`… Pour `summary` : un getter `String getSummary()` **sans setter** (un getter + un setter feraient une propriété persistante, donc une colonne).
