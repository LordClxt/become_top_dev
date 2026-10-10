## Contexte

Tu écris le moteur de calcul d'un jeu rétro dont les scores et les stocks tiennent sur 8 bits. Un débordement silencieux y transforme 200 points + 100 points en 44 points. Il faut le **détecter**, ou l'empêcher.

## Ta mission

Dans `checked.go`, implémente quatre fonctions.

### `AddInt8(a, b int8) (sum int8, overflow bool)`
Additionne deux `int8`. `sum` est la valeur que calcule le processeur (celle qui « fait le tour »). `overflow` vaut `true` si le **vrai** résultat sort de −128…127.

```
AddInt8(100, 27)  → (127, false)
AddInt8(100, 28)  → (-128, true)
AddInt8(-128, -1) → (127, true)
```

### `MulUint8(a, b uint8) (product uint8, overflow bool)`
Même idée pour un produit non signé : `overflow` vaut `true` si le vrai produit dépasse 255. Attention : `16 * 16 = 256` donne `0` à l'écran, ce qui ne prouve pas qu'il n'y a pas eu de débordement.

### `SaturatingSubUint8(a, b uint8) uint8`
Renvoie `a - b`, mais s'arrête à `0` au lieu de faire le tour vers 255.

### `Divide(a, b int) (quotient, remainder int, err error)`
Renvoie le quotient et le reste avec la division de Go (tronquée vers zéro). Si `b` vaut `0`, renvoie `ErrDivisionByZero` **sans paniquer**.

## Contraintes

- Reste dans les types demandés : pas de conversion vers un type plus large pour « tricher ». Le but est de raisonner sur les bits et les signes.
- Ne réinvente pas `Divide` : les opérateurs `/` et `%` de Go font déjà le bon travail, ton rôle est de protéger le cas `b == 0`.
