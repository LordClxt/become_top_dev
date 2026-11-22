## Hint 1
Pourquoi le support peut-il approuver ? Son masque `0b0001` désignait VIEW, et le bit 2 désignait CANCEL… avant l'insertion d'APPROVE. Tout ce qui repose sur une position (bits, `ordinal()`, `values()[i]`) glisse quand on insère une constante.

## Hint 2
Chaque rôle reçoit un `EnumSet` nommé à la construction : `TRADER(EnumSet.of(Permission.VIEW, Permission.TRADE))`, `ADMIN(EnumSet.allOf(Permission.class))`. Un `EnumSet` est modifiable : enveloppe-le avec `Collections.unmodifiableSet`.

## Hint 3
`effective` : un `EnumSet.noneOf(Permission.class)` rempli par `addAll`. `whoCan` : une `EnumMap<Permission, Set<Role>>` pré-remplie avec un `EnumSet.noneOf(Role.class)` par permission. `encode` : parcourir un `EnumSet` (ordre de déclaration) et ajouter `p.code()`. `decode` : chercher la permission de chaque code.
