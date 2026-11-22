## Contexte

La bibliothèque de validation d'Ordo fournit `OrderRule` (une interface) et `StandardRule` (un enum qui l'implémente). La salle des marchés veut ajouter ses propres règles dans `RiskRule`, sans toucher à la bibliothèque :
- `MAX_NOTIONAL` : pas plus de 100 000 € par ordre (quantité × prix ≤ 10 000 000 centimes) ; message `montant <montant> > 10000000` ;
- `BANNED_SYMBOL` : le titre `XYZ` est sous embargo ; message `symbole sous embargo XYZ`.

`RuleEngine.checkAll(order, RiskRule.class)` lève aujourd'hui une `ClassCastException`, et accepte même `TimeUnit.class` à la compilation.

## Ta mission

1. `RiskRule` implémente les deux règles, et `checkAll` l'accepte comme `StandardRule` (résultat : `NOM: message` pour chaque règle violée, dans l'ordre des constantes).
2. `checkAll` refuse **à la compilation** un enum qui n'est pas une `OrderRule`.
3. `check` accepte une collection de règles prises dans **plusieurs** enums.
4. Ajoute `failing(order, RiskRule.class)`, qui renvoie un `Set<RiskRule>` des règles violées, sans cast chez l'appelant.

Fichiers modifiables : `RiskRule.java` et `RuleEngine.java`.
