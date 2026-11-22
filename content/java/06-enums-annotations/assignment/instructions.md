## Contexte

Les rôles d'Ordo donnent des permissions, rangées en **masques de bits** (bit n = n-ième permission de `Permission`). Puis la permission `APPROVE` a été **insérée** au milieu de l'enum (fourni, à ne pas modifier) : tous les masques ont glissé. Le support peut désormais approuver des ordres, le risque ne peut plus annuler, et les jetons de session, encodés avec les positions (`ordinal()`), désignent d'autres droits qu'à leur création.

Les droits voulus : `TRADER` : voir, négocier. `RISK` : voir, approuver, annuler. `SUPPORT` : voir. `ADMIN` : **toutes** les permissions, y compris les futures.

## Ta mission

- Chaque rôle porte ses permissions, **nommées**, non modifiables de l'extérieur.
- `Access.effective(roles)` : l'union des permissions, dans l'ordre de déclaration.
- `Access.whoCan()` : pour **chaque** permission, l'ensemble des rôles qui la donnent, dans l'ordre de déclaration des deux côtés.
- `Access.encode` et `decode` utilisent les **codes** d'une lettre des permissions (`VAC` pour `RISK`), dans l'ordre de déclaration ; un code inconnu est refusé (`IllegalArgumentException`).

Fichiers modifiables : `Role.java` et `Access.java`. Le correcteur regarde aussi si quelque chose dépend encore des positions (voir le barème).
