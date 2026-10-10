## Hint 1
Pour `AddInt8`, laisse le processeur faire l'addition et regarde ensuite si le résultat est cohérent avec les opérandes. Le signe est ton indice.

## Hint 2
Un débordement d'addition signée n'arrive que lorsque les deux opérandes ont le **même signe** et que le résultat a le **signe opposé**. Pour `MulUint8`, si `a` n'est pas nul, tu peux annuler la multiplication par une division : `product / a` doit redonner `b`.

## Hint 3
`SaturatingSubUint8` : compare `a` et `b` **avant** de soustraire, tu ne peux pas détecter le tour après coup. Pour `MulUint8`, protège la division par `a` (cas `a == 0`). Pour `Divide`, un simple `if b == 0` en tête de fonction suffit.
