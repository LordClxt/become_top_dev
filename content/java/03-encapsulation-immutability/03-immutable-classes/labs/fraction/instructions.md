## Contexte

Le module de répartition des frais partage une facture entre plusieurs payeurs avec des fractions exactes. `Fraction` a été écrite « à la `BigInteger` » : `plus` modifie `this` puis le renvoie, rien n'est réduit, et une même instance passe d'un payeur à l'autre. Résultat : la part de l'un change quand on calcule celle de l'autre.

## Ta mission

Rends `Fraction` immuable, avec l'API existante :

- **pas de constructeur public** : on crée une fraction avec `Fraction.valueOf(numerator, denominator)` ou `Fraction.valueOf(n)` ;
- **forme canonique** : toujours réduite, dénominateur strictement positif (`valueOf(2, -4)` donne `-1/2`) ; dénominateur nul : `ArithmeticException` ;
- **constantes partagées** : `ZERO` et `ONE` existent, et `valueOf` renvoie **ces instances-là** pour 0 et 1 (`valueOf(0, 7) == Fraction.ZERO`) ;
- `plus`, `minus`, `times`, `dividedBy` renvoient une **nouvelle** fraction et ne modifient jamais leurs opérandes ; diviser par zéro lève `ArithmeticException` ;
- `equals` et `hashCode` sur la forme canonique ; `toString` donne `3/4`, ou `2` si le dénominateur vaut 1 ;
- la classe ne doit pas pouvoir être étendue, et tous ses champs d'instance sont `private final`.

Tu peux supposer que les calculs ne débordent pas d'un `long`.
